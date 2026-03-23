# Op Note Code Extraction — Design Spec (Sub-project 1)

**Date:** 2026-03-23
**Scope:** AI-powered CPT/ICD-10 code extraction from pasted cardiology op notes, with admin review and charge creation.
**Sub-project 2 (deferred):** Image/OCR pipeline for handwritten op notes.

---

## Overview

Admin users paste a cardiology op note into a full-screen extractor UI. An AWS Lambda calls Claude (via Bedrock) with the full CathDoc code library as context and returns proposed CPT codes, ICD-10 diagnoses, and modifiers. The admin reviews (with billing rule validation), adjusts, and either submits directly as a charge or opens in the existing code editor.

---

## 1. AWS Lambda — `extract-codes`

**Runtime:** Node.js 22, us-east-1
**Endpoint:** `POST /extract-codes` via API Gateway (HTTPS, no caching, no request logging)
**Timeout:** 25 seconds (within API Gateway's 29s limit; Bedrock calls typically 5-15s)

### Request
```json
{
  "opNoteText": "...full op note...",
  "orgId": "YOCA",
  "userId": "uid123",
  "idToken": "firebase-id-token"
}
```

### Auth
1. Verify Firebase ID token via Firebase Admin SDK (bundled service account credential).
2. After token verification, read `users/{uid}` from Firestore to check `role === 'admin'`. The role is a Firestore application field, not a Firebase Auth custom claim, so a Firestore read is required.
3. Reject with 403 if not admin.

### Logic
1. Authenticate (see above).
2. Read `code-library.json` from S3 (cached in Lambda memory across warm invocations).
3. Build Claude prompt:
   - **System:** Full CPT code library (~420 codes), ICD-10 codes (~630 codes), billing rules, CCI edits, modifier definitions. Instructions to return structured JSON only, pick codes from the provided library only, include confidence and reasoning per code, apply modifiers per billing rules.
   - **User:** The op note text.
4. Call Bedrock `invoke_model` with Claude Sonnet.
5. Parse Claude's JSON response.
6. Return structured result.

**Estimated prompt size:** ~120KB code library ≈ ~30K tokens system context + op note. Well within Claude Sonnet's context window.

### Response
```json
{
  "cptCodes": [
    {
      "code": "92928",
      "description": "Percutaneous transcatheter placement of intracoronary stent(s)...",
      "vessel": "LAD",
      "confidence": "high",
      "reasoning": "Note describes drug-eluting stent placement in LAD"
    },
    {
      "code": "92929",
      "description": "Each additional vessel...",
      "vessel": "LCx",
      "modifier": "-59",
      "confidence": "high",
      "reasoning": "Second vessel intervention in LCx"
    }
  ],
  "icd10Codes": [
    {
      "code": "I25.10",
      "description": "Atherosclerotic heart disease of native coronary artery...",
      "confidence": "high",
      "reasoning": "Documented coronary artery disease"
    }
  ],
  "sedation": { "included": true, "units": 1 },
  "summary": "2-vessel PCI with DES to LAD and LCx for CAD"
}
```

**Note:** Modifiers are returned as a `modifier` field on each CPT code object (e.g., `"-59"`), not as a separate map. This makes it straightforward to build the joined `cptCode` string: codes are joined as `"92928 + 92929-59"` — modifier appended directly to the code string, matching how `CardiologyCPTApp` builds `codeStrings`.

### Error Handling
- Invalid/expired token → 401
- Non-admin user → 403
- Bedrock timeout or failure → 500 with message
- Malformed Claude response → 500, return raw response for debugging

### Rate Limiting
API Gateway usage plan: 10 requests per minute per API key. Prevents cost overrun from misconfigured clients.

---

## 2. Code Library Sync (S3)

The Lambda reads the CathDoc code library from S3 to stay in sync with code changes.

**File:** `s3://cathdoc-code-library/code-library.json`

**Contents:**
- All ~420 CPT codes (code, summary, description, isAddOn, requiresVessel)
- All ~630 ICD-10 codes (code, description, shortLabel, category, subcategory)
- All billing rules (name, severity, description)
- All CCI edit pairs
- All modifier definitions

**Estimated size:** ~120KB JSON

**Export script:** `scripts/export-code-library.ts` — TypeScript script run with `tsx`. Imports from `src/data/*.ts` directly, serializes to JSON.

**Auto-sync:** GitHub Actions deploy pipeline runs `tsx scripts/export-code-library.ts` after `vite build` and uploads to S3 via `aws s3 cp`. Any code change in `src/data/` → next deploy → S3 updated → Lambda reads updated library on next cold start.

**Lambda caching:** Code library loaded from S3 on cold start, cached in module-level variable. Warm invocations reuse cached data.

---

## 3. Admin UI — Op Note Extractor

**Access:** Button in Admin Portal header → opens full-screen overlay.
**Visibility:** Admin users only (`userMode.role === 'admin'`).

### Input Panel
- Large text area for pasting op note text
- "Extract Codes" button
- Loading spinner with status text ("Analyzing op note..." — may take 10-20 seconds)
- Timeout message if response exceeds 25 seconds

### Results Panel
- **Summary line** — one-sentence description of extracted procedure
- **CPT Codes** — card per code:
  - Code number + modifier (if any), description, vessel (if applicable)
  - Confidence badge (high/medium/low)
  - Reasoning text (why this code was extracted)
  - Checkbox to include/exclude (default: checked)
- **ICD-10 Diagnoses** — same card format
- **Sedation** — toggle with unit count if detected
- **Billing Rule Validation** — after extraction, run `runBillingRules()` and `validateCCIEdits()` against the checked codes. Display any violations (errors/warnings) inline, same as the normal code editor. This ensures NCCI compliance before submission.

### Charge Details (shown before submit)
- **Patient selection** — dropdown from org roster or name + DOB entry. If unmatched patient, uses synthetic ID (`cath-{name}-{dob}`) matching existing pattern.
- **Procedure date** — date picker, defaults to today

### Actions
- **"Submit as Charge"** — creates a `StoredCharge`:
  - `cptCode`: joined string with modifiers (e.g., `"92928 + 92929-59"`)
  - `cptDescription`: joined descriptions
  - `diagnoses`: array of checked ICD-10 codes
  - `caseSnapshot`: populated with vessel mapping (see Section 4)
  - `submittedByUserId` / `submittedByUserName`: the admin
  - `status`: `"pending"`
  - Syncs to Firestore, logs audit event with action `op_note_charge_submitted`
- **"Open in Code Editor"** — resets CardiologyCPTApp state and pre-fills with extracted data (see Section 4). Admin reviews in the familiar interface and submits from there.
- **"Cancel"** — close without saving.

### Layout
- Mobile (phone): input and results stack vertically
- Tablet/desktop: side-by-side panels

---

## 4. Integration with Existing Charge System

### CaseSnapshot Vessel Mapping

The Lambda response groups codes by vessel label (e.g., "LAD", "LCx", "RCA"). These map to `CaseSnapshot` slots:

1. **First unique vessel** → `codes.primary` + `vessels.v1` (e.g., LAD codes)
2. **Second unique vessel** → `codes.vessel2` + `vessels.v2` (e.g., LCx codes)
3. **Third unique vessel** → `codes.vessel3` + `vessels.v3` (e.g., RCA codes)
4. **Codes without vessel** (e.g., sedation, diagnostic) → `codes.primary`

The `vessels.v1/v2/v3` maps are keyed by CPT code string, valued by vessel label: `{ "92928": "LAD", "92978": "LAD" }`. This matches how `CardiologyCPTApp` builds the snapshot.

### Direct Submit ("Submit as Charge")
Calls `saveCharge()` with the mapped `StoredCharge`. The charge appears in the Charge Queue and follows the normal `pending → entered → billed` workflow.

### Open in Code Editor
Resets `CardiologyCPTApp` to a clean state via a ref method (e.g., `cathCPTRef.current.loadFromExtraction(snapshot)`), similar to the existing `loadFromHistory()` pattern. Populates:
- Selected codes per vessel slot
- Vessel labels per code
- Indications matched to cardiac/peripheral/structural categories
- Sedation toggle + units
- Patient pre-selected if specified

### Audit Logging
Add new audit action `op_note_charge_submitted` to the `AuditAction` type in `types/index.ts`. Used when admin submits a charge via the extractor. Includes the summary and code count in metadata.

### Token Acquisition
`opNoteService.ts` gets the Firebase ID token via `auth.currentUser.getIdToken(true)` (force refresh to handle expired tokens) before calling the Lambda endpoint.

---

## 5. Security & HIPAA

- **HIPAA compliance:** Op note text sent only to AWS Bedrock (HIPAA-eligible under existing AWS BAA). Lambda runs in the same AWS account.
- **Auth:** Firebase ID token verified by Lambda via Admin SDK. Role checked via Firestore read of `users/{uid}`. Only admin role can call the endpoint.
- **No PHI storage:** Lambda does not persist op note text. CloudWatch request/response logging disabled. Bedrock does not retain inference data under BAA.
- **API Gateway:** HTTPS only, no caching, rate-limited.
- **S3 code library:** Contains no PHI — only CPT/ICD-10 definitions and billing rules.
- **Firebase service account:** Bundled with Lambda for token verification and Firestore reads. Stored as environment variable or Secrets Manager, not in code.

---

## 6. New Files

| File | Purpose |
|------|---------|
| `lambda/extract-codes/index.js` | Lambda handler — auth, Bedrock call, response parsing |
| `lambda/extract-codes/package.json` | Lambda dependencies (@aws-sdk/client-bedrock-runtime, firebase-admin) |
| `scripts/export-code-library.ts` | TypeScript script (run with tsx) — imports src/data/*.ts, exports JSON for S3 |
| `src/screens/OpNoteExtractorScreen.tsx` | Full-screen extractor UI |
| `src/services/opNoteService.ts` | Frontend service — calls Lambda endpoint, handles Firebase token |

**Modified files:**
| File | Change |
|------|--------|
| `src/screens/AdminPortalScreen.tsx` | Add "Op Note" button to header |
| `src/types/index.ts` | Add `op_note_charge_submitted` audit action |
| `.github/workflows/deploy.yml` | Add S3 upload step for code-library.json |

---

## Out of Scope (Sub-project 1)

- Image upload / OCR for handwritten notes (Sub-project 2)
- Automatic patient matching from op note text
- Op note history / saved extractions
- Non-admin access to the extractor
- Custom prompt tuning UI
