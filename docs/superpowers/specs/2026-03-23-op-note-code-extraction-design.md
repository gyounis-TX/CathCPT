# Op Note Code Extraction — Design Spec (Sub-project 1)

**Date:** 2026-03-23
**Scope:** AI-powered CPT/ICD-10 code extraction from pasted cardiology op notes, with admin review and charge creation.
**Sub-project 2 (deferred):** Image/OCR pipeline for handwritten op notes.

---

## Overview

Admin users paste a cardiology op note into a full-screen extractor UI. An AWS Lambda calls Claude (via Bedrock) with the full CathDoc code library as context and returns proposed CPT codes, ICD-10 diagnoses, and modifiers. The admin reviews, adjusts, and either submits directly as a charge or opens in the existing code editor.

---

## 1. AWS Lambda — `extract-codes`

**Runtime:** Node.js 22, us-east-1
**Endpoint:** `POST /extract-codes` via API Gateway (HTTPS, no caching, no request logging)

### Request
```json
{
  "opNoteText": "...full op note...",
  "orgId": "YOCA",
  "userId": "uid123",
  "idToken": "firebase-id-token"
}
```

### Logic
1. Verify Firebase ID token via Firebase Admin SDK. Reject if invalid or user role is not `admin`.
2. Read `code-library.json` from S3 (cached in Lambda memory across warm invocations).
3. Build Claude prompt:
   - **System:** Full CPT code library (420 codes), ICD-10 codes (372), billing rules, CCI edits, modifier definitions. Instructions to return structured JSON only, pick codes from the provided library only, include confidence and reasoning per code.
   - **User:** The op note text.
4. Call Bedrock `invoke_model` with Claude Sonnet.
5. Parse Claude's JSON response.
6. Return structured result.

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
  "modifiers": {
    "92929": "-59"
  },
  "sedation": { "included": true, "units": 1 },
  "summary": "2-vessel PCI with DES to LAD and LCx for CAD"
}
```

### Error Handling
- Invalid/expired token → 401
- Non-admin user → 403
- Bedrock timeout or failure → 500 with message
- Malformed Claude response → 500, return raw response for debugging

---

## 2. Code Library Sync (S3)

The Lambda reads the CathDoc code library from S3 to stay in sync with code changes.

**File:** `s3://cathdoc-code-library/code-library.json`

**Contents:**
- All 420 CPT codes (code, summary, description, isAddOn, requiresVessel)
- All 372 ICD-10 codes (code, description, shortLabel, category, subcategory)
- All billing rules (name, severity, description)
- All CCI edit pairs
- All modifier definitions

**Estimated size:** ~80KB JSON

**Export script:** `scripts/export-code-library.js` — reads `src/data/*.ts` files, extracts the code arrays, writes JSON.

**Auto-sync:** GitHub Actions deploy pipeline runs the export script after `vite build` and uploads to S3. Any code change in `src/data/` → next deploy → S3 updated → Lambda reads updated library on next cold start.

**Lambda caching:** Code library loaded from S3 on cold start, cached in module-level variable. Warm invocations reuse cached data (Lambda recycles every few hours, picking up updates).

---

## 3. Admin UI — Op Note Extractor

**Access:** Button in Admin Portal header → opens full-screen overlay.
**Visibility:** Admin users only (`userMode.role === 'admin'`).

### Input Panel
- Large text area for pasting op note text
- "Extract Codes" button
- Loading spinner with status text during extraction

### Results Panel
- **Summary line** — one-sentence description of extracted procedure
- **CPT Codes** — card per code:
  - Code number, description, vessel (if applicable)
  - Confidence badge (high/medium/low)
  - Reasoning text (why this code was extracted)
  - Checkbox to include/exclude (default: checked)
- **ICD-10 Diagnoses** — same card format
- **Modifiers** — shown attached to their CPT codes
- **Sedation** — toggle with unit count if detected

### Actions
- **"Submit as Charge"** — requires patient selection (dropdown from org roster or name entry). Creates a `StoredCharge` with status `pending`, syncs to Firestore, logs audit event. Includes all checked CPT codes, ICD-10 diagnoses, modifiers, and sedation.
- **"Open in Code Editor"** — pre-fills CardiologyCPTApp with extracted codes (mapped to vessel slots), indications, and sedation. Admin reviews in the familiar interface and submits from there.
- **"Cancel"** — close without saving.

### Layout
- Mobile (phone): input and results stack vertically
- Tablet/desktop: side-by-side panels

---

## 4. Integration with Existing Charge System

### Direct Submit ("Submit as Charge")
Calls `saveCharge()` with the same `StoredCharge` structure as physician-submitted charges:
- `cptCode`: joined string of all selected codes (e.g., `"92928 + 92929-59"`)
- `diagnoses`: array of selected ICD-10 codes
- `caseSnapshot`: populated with extracted codes mapped to vessel slots
- `submittedByUserId` / `submittedByUserName`: the admin who approved
- `status`: `"pending"`

The charge appears in the Charge Queue like any other charge and follows the same `pending → entered → billed` workflow.

### Open in Code Editor
Passes extracted data to CardiologyCPTApp via a callback/state:
- Primary codes → vessel 1 selected codes
- Additional vessel codes → vessel 2/3 based on vessel labels from extraction
- ICD-10 codes → selected indications (matched to cardiac/peripheral/structural categories)
- Sedation → toggle + units
- Patient → pre-selected if specified

Admin uses the full existing UI to review, modify, and submit.

---

## 5. Security & HIPAA

- **HIPAA compliance:** Op note text sent only to AWS Bedrock (HIPAA-eligible under existing AWS BAA). Lambda runs in the same AWS account.
- **Auth:** Firebase ID token verified by Lambda. Only admin role can call the endpoint.
- **No PHI storage:** Lambda does not persist op note text. No CloudWatch request/response logging. Bedrock does not retain inference data under BAA.
- **API Gateway:** HTTPS only, no caching.
- **S3 code library:** Contains no PHI — only CPT/ICD-10 definitions and billing rules.

---

## 6. New Files

| File | Purpose |
|------|---------|
| `lambda/extract-codes/index.js` | Lambda handler — auth, Bedrock call, response parsing |
| `lambda/extract-codes/package.json` | Lambda dependencies (aws-sdk, firebase-admin) |
| `scripts/export-code-library.js` | Exports src/data/*.ts to code-library.json for S3 |
| `src/screens/OpNoteExtractorScreen.tsx` | Full-screen extractor UI |
| `src/services/opNoteService.ts` | Frontend service — calls Lambda endpoint, handles auth |

---

## Out of Scope (Sub-project 1)

- Image upload / OCR for handwritten notes (Sub-project 2)
- Automatic patient matching from op note text
- Op note history / saved extractions
- Non-admin access to the extractor
- Custom prompt tuning UI
