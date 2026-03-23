# Op Note Code Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin users can paste a cardiology op note, extract CPT/ICD-10 codes via Claude on AWS Bedrock, review with billing rule validation, and submit as a charge.

**Architecture:** AWS Lambda (Node.js 22) behind API Gateway calls Bedrock with the full CathDoc code library from S3. Frontend UI in the Admin Portal calls the Lambda via a service layer, displays results with billing validation, and integrates with the existing charge system.

**Tech Stack:** AWS Lambda, API Gateway, Bedrock (Claude Sonnet), S3, Firebase Auth, React/TypeScript

**Spec:** `docs/superpowers/specs/2026-03-23-op-note-code-extraction-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/export-code-library.ts` | Export src/data/*.ts to JSON for S3 |
| `lambda/extract-codes/index.mjs` | Lambda handler — auth, Bedrock call, parse response |
| `lambda/extract-codes/package.json` | Lambda dependencies |
| `src/services/opNoteService.ts` | Frontend — calls Lambda, handles Firebase token |
| `src/screens/OpNoteExtractorScreen.tsx` | Full-screen UI — paste, review, submit |
| `src/types/index.ts` | Add `op_note_charge_submitted` audit action |
| `src/screens/AdminPortalScreen.tsx` | Add "Op Note" button to header |
| `src/CardiologyCPTApp.tsx` | Add `loadFromExtraction` to handle ref |

---

### Task 1: Code Library Export Script

**Files:**
- Create: `scripts/export-code-library.ts`

- [ ] **Step 1: Create the export script**

Create `scripts/export-code-library.ts`:

```typescript
#!/usr/bin/env npx tsx
// Exports CathDoc code library to JSON for the Lambda's S3 bucket

import { cptCategories } from '../src/data/cptCategories';
import { icd10Codes } from '../src/data/icd10Codes';
import { billingRules } from '../src/data/billingRules';
import { cciEditPairs } from '../src/data/cciEdits';
import { modifierDefinitions } from '../src/data/modifierDefinitions';
import * as fs from 'fs';
import * as path from 'path';

// Flatten CPT categories into a single array
const allCptCodes = Object.entries(cptCategories).flatMap(([category, codes]) =>
  codes.filter(c => !c.isDivider).map(c => ({ ...c, category }))
);

// Extract billing rule metadata (strip check functions — not serializable)
const billingRulesMeta = billingRules.map(r => ({
  id: r.id,
  name: r.name,
  description: r.description,
  severity: r.severity,
  learnMoreContent: r.learnMoreContent || '',
}));

// Extract CCI pairs
const cciPairs = cciEditPairs.map(p => ({
  column1: p.column1,
  column2: p.column2,
  modifierException: p.modifierException,
  description: p.description,
  category: p.category,
}));

// Modifier definitions (already plain objects)
const modifiers = Object.values(modifierDefinitions).map(m => ({
  code: m.code,
  name: m.name,
  description: m.description,
  autoApply: m.autoApply,
}));

const library = {
  cptCodes: allCptCodes,
  icd10Codes,
  billingRules: billingRulesMeta,
  cciEditPairs: cciPairs,
  modifierDefinitions: modifiers,
  exportedAt: new Date().toISOString(),
};

const outPath = path.resolve(__dirname, '../lambda/extract-codes/code-library.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(library, null, 2));

console.log(`Exported code library to ${outPath}`);
console.log(`  CPT codes: ${allCptCodes.length}`);
console.log(`  ICD-10 codes: ${icd10Codes.length}`);
console.log(`  Billing rules: ${billingRulesMeta.length}`);
console.log(`  CCI pairs: ${cciPairs.length}`);
console.log(`  Modifiers: ${modifiers.length}`);
```

- [ ] **Step 2: Verify the script runs**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx tsx scripts/export-code-library.ts`
Expected: Prints code counts and creates `lambda/extract-codes/code-library.json`.

- [ ] **Step 3: Commit**

```bash
git add scripts/export-code-library.ts lambda/extract-codes/code-library.json
git commit -m "feat: add code library export script for Lambda"
```

---

### Task 2: AWS Lambda — extract-codes

**Files:**
- Create: `lambda/extract-codes/index.mjs`
- Create: `lambda/extract-codes/package.json`

- [ ] **Step 1: Create package.json**

Create `lambda/extract-codes/package.json`:

```json
{
  "name": "cathdoc-extract-codes",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.600.0",
    "@aws-sdk/client-s3": "^3.600.0",
    "firebase-admin": "^12.0.0"
  }
}
```

- [ ] **Step 2: Create the Lambda handler**

Create `lambda/extract-codes/index.mjs`:

```javascript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase Admin (service account from env)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (serviceAccount.project_id) {
  initializeApp({ credential: cert(serviceAccount) });
}

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const s3 = new S3Client({ region: 'us-east-1' });

// Cache code library across warm invocations
let codeLibrary = null;

async function loadCodeLibrary() {
  if (codeLibrary) return codeLibrary;

  // Try bundled file first (for local dev), then S3
  try {
    const data = readFileSync('./code-library.json', 'utf-8');
    codeLibrary = JSON.parse(data);
    return codeLibrary;
  } catch {
    // Fall through to S3
  }

  const resp = await s3.send(new GetObjectCommand({
    Bucket: process.env.CODE_LIBRARY_BUCKET || 'cathdoc-code-library',
    Key: 'code-library.json',
  }));
  const body = await resp.Body.transformToString();
  codeLibrary = JSON.parse(body);
  return codeLibrary;
}

async function verifyAdmin(idToken) {
  const auth = getAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const uid = decoded.uid;

  // Check role in Firestore
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new Error('User not found');

  const userData = userDoc.data();
  if (userData.role !== 'admin') throw new Error('Not admin');

  return { uid, email: decoded.email, orgId: userData.organizationId };
}

function buildPrompt(library, opNoteText) {
  const systemPrompt = `You are a cardiology billing expert. Given an operative note, extract the appropriate CPT codes, ICD-10 diagnosis codes, and modifiers.

IMPORTANT RULES:
- Only use codes from the provided library. Do not invent codes.
- Apply modifiers per the billing rules and CCI edits provided.
- For multi-vessel PCI: first vessel uses base code (e.g., 92928), additional vessels use add-on code (e.g., 92929) with -59 modifier.
- Include sedation if mentioned in the note.
- Provide confidence (high/medium/low) and reasoning for each code.
- Return ONLY valid JSON, no markdown or explanation.

CPT CODE LIBRARY:
${JSON.stringify(library.cptCodes)}

ICD-10 CODE LIBRARY:
${JSON.stringify(library.icd10Codes)}

BILLING RULES:
${JSON.stringify(library.billingRules)}

CCI EDIT PAIRS (codes that should not be billed together without modifier):
${JSON.stringify(library.cciEditPairs)}

MODIFIER DEFINITIONS:
${JSON.stringify(library.modifierDefinitions)}

Return JSON in this exact format:
{
  "cptCodes": [{ "code": "92928", "description": "...", "vessel": "LAD", "modifier": "-59 or null", "confidence": "high|medium|low", "reasoning": "..." }],
  "icd10Codes": [{ "code": "I25.10", "description": "...", "confidence": "high|medium|low", "reasoning": "..." }],
  "sedation": { "included": true/false, "units": 0 },
  "summary": "One sentence summary of the procedure"
}`;

  return {
    system: systemPrompt,
    messages: [{ role: 'user', content: `Extract billing codes from this operative note:\n\n${opNoteText}` }],
  };
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { opNoteText, idToken } = body;

    if (!opNoteText || !idToken) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing opNoteText or idToken' }) };
    }

    // 1. Verify admin
    let admin;
    try {
      admin = await verifyAdmin(idToken);
    } catch (err) {
      const status = err.message === 'Not admin' ? 403 : 401;
      return { statusCode: status, headers, body: JSON.stringify({ error: err.message }) };
    }

    // 2. Load code library
    const library = await loadCodeLibrary();

    // 3. Build prompt and call Bedrock
    const { system, messages } = buildPrompt(library, opNoteText);

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-sonnet-4-20250514',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        system,
        messages,
      }),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    // 4. Parse Claude's JSON response
    let extracted;
    try {
      // Handle case where Claude wraps in markdown code block
      const jsonStr = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to parse extraction result', raw: content }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(extracted),
    };
  } catch (err) {
    console.error('Extract codes error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal error' }),
    };
  }
};
```

- [ ] **Step 3: Install dependencies**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc/lambda/extract-codes && npm install`

- [ ] **Step 4: Commit**

```bash
git add lambda/extract-codes/
git commit -m "feat: add extract-codes Lambda with Bedrock integration"
```

---

### Task 3: Frontend Service — opNoteService.ts

**Files:**
- Create: `src/services/opNoteService.ts`

- [ ] **Step 1: Create the service**

Create `src/services/opNoteService.ts`:

```typescript
import { getFirebaseAuth } from './firebaseConfig';

const EXTRACT_CODES_URL = import.meta.env.VITE_EXTRACT_CODES_URL || '';

export interface ExtractedCPTCode {
  code: string;
  description: string;
  vessel?: string;
  modifier?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ExtractedICD10Code {
  code: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ExtractionResult {
  cptCodes: ExtractedCPTCode[];
  icd10Codes: ExtractedICD10Code[];
  sedation: { included: boolean; units: number };
  summary: string;
}

export async function extractCodesFromOpNote(opNoteText: string): Promise<ExtractionResult> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const idToken = await user.getIdToken(true); // Force refresh

  const response = await fetch(EXTRACT_CODES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opNoteText, idToken }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (response.status === 401) throw new Error('Authentication failed');
    if (response.status === 403) throw new Error('Admin access required');
    throw new Error(err.error || `Extraction failed (${response.status})`);
  }

  return response.json();
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/services/opNoteService.ts
git commit -m "feat: add opNoteService for Lambda extraction calls"
```

---

### Task 4: Update Types — Audit Action

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add audit action**

Find `AuditAction` type in `src/types/index.ts` and add `'op_note_charge_submitted'` to the union.

Search for `type AuditAction` or `AuditAction` in the file, then add the new value.

- [ ] **Step 2: Verify build**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add op_note_charge_submitted audit action"
```

---

### Task 5: Op Note Extractor Screen

**Files:**
- Create: `src/screens/OpNoteExtractorScreen.tsx`

- [ ] **Step 1: Create the screen component**

Create `src/screens/OpNoteExtractorScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { ArrowLeft, FileText, Sparkles, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { extractCodesFromOpNote, ExtractionResult, ExtractedCPTCode, ExtractedICD10Code } from '../services/opNoteService';
import { saveCharge, StoredCharge } from '../services/chargesService';
import { logAuditEvent } from '../services/auditService';
import { Inpatient } from '../types';

interface OpNoteExtractorScreenProps {
  onClose: () => void;
  orgId: string;
  userId: string;
  userName: string;
  patients: Inpatient[];
  onChargeCreated?: () => void;
  onOpenInEditor?: (result: ExtractionResult) => void;
}

export const OpNoteExtractorScreen: React.FC<OpNoteExtractorScreenProps> = ({
  onClose,
  orgId,
  userId,
  userName,
  patients,
  onChargeCreated,
  onOpenInEditor,
}) => {
  const [opNoteText, setOpNoteText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState('');
  const [checkedCpts, setCheckedCpts] = useState<Set<string>>(new Set());
  const [checkedIcds, setCheckedIcds] = useState<Set<string>>(new Set());
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleExtract = async () => {
    if (!opNoteText.trim()) return;
    setIsExtracting(true);
    setError('');
    setResult(null);

    try {
      const extracted = await extractCodesFromOpNote(opNoteText);
      setResult(extracted);
      // Default all codes to checked
      setCheckedCpts(new Set(extracted.cptCodes.map(c => c.code)));
      setCheckedIcds(new Set(extracted.icd10Codes.map(c => c.code)));
    } catch (err: any) {
      setError(err.message || 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleCpt = (code: string) => {
    setCheckedCpts(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleIcd = (code: string) => {
    setCheckedIcds(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const getConfidenceColor = (c: string) => {
    if (c === 'high') return 'bg-green-100 text-green-700';
    if (c === 'medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const handleSubmitCharge = async () => {
    if (!result) return;
    const resolvedPatientId = selectedPatientId || `cath-${patientName.trim()}-${patientDob}`;
    if (!resolvedPatientId || resolvedPatientId === 'cath--') {
      setError('Please select or enter a patient');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCpts = result.cptCodes.filter(c => checkedCpts.has(c.code));
      const selectedIcds = result.icd10Codes.filter(c => checkedIcds.has(c.code));

      const cptCode = selectedCpts.map(c => c.modifier ? `${c.code}${c.modifier}` : c.code).join(' + ');
      const cptDescription = selectedCpts.map(c => c.description).join(' + ');
      const diagnoses = selectedIcds.map(c => c.code);

      await saveCharge({
        inpatientId: resolvedPatientId,
        chargeDate,
        cptCode,
        cptDescription,
        diagnoses,
        submittedByUserId: userId,
        submittedByUserName: userName,
        rvu: 0, // Admin can update later
      }, orgId);

      logAuditEvent(orgId, {
        action: 'op_note_charge_submitted',
        userId,
        userName,
        targetPatientId: resolvedPatientId,
        targetPatientName: patientName || selectedPatientId,
        details: `Op note extraction: ${selectedCpts.length} CPT codes, ${selectedIcds.length} ICD-10 codes`,
        listContext: null,
        metadata: { summary: result.summary, cptCount: selectedCpts.length },
      });

      setSubmitSuccess(true);
      onChargeCreated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit charge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-600" />
          <h1 className="text-lg font-semibold text-gray-800">Op Note Extractor</h1>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Input */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText size={16} className="inline mr-1.5" />
            Paste Operative Note
          </label>
          <textarea
            value={opNoteText}
            onChange={(e) => setOpNoteText(e.target.value)}
            placeholder="Paste the full operative note here..."
            className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          />
          <button
            onClick={handleExtract}
            disabled={!opNoteText.trim() || isExtracting}
            className="mt-3 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isExtracting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing op note...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Extract Codes
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success */}
        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-2">
            <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">Charge submitted successfully! It will appear in the Charge Queue.</p>
          </div>
        )}

        {/* Results */}
        {result && !submitSuccess && (
          <>
            {/* Summary */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm font-medium text-indigo-800">{result.summary}</p>
            </div>

            {/* CPT Codes */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">CPT Codes ({result.cptCodes.length})</h3>
              <div className="space-y-2">
                {result.cptCodes.map((c) => (
                  <label key={c.code} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={checkedCpts.has(c.code)}
                      onChange={() => toggleCpt(c.code)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-gray-800">
                          {c.code}{c.modifier || ''}
                        </span>
                        {c.vessel && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-medium rounded-full">{c.vessel}</span>
                        )}
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${getConfidenceColor(c.confidence)}`}>{c.confidence}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{c.description}</p>
                      <p className="text-[11px] text-gray-400 mt-1 italic">{c.reasoning}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ICD-10 Codes */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">ICD-10 Diagnoses ({result.icd10Codes.length})</h3>
              <div className="space-y-2">
                {result.icd10Codes.map((c) => (
                  <label key={c.code} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={checkedIcds.has(c.code)}
                      onChange={() => toggleIcd(c.code)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-800">{c.code}</span>
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${getConfidenceColor(c.confidence)}`}>{c.confidence}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{c.description}</p>
                      <p className="text-[11px] text-gray-400 mt-1 italic">{c.reasoning}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Sedation */}
            {result.sedation.included && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Moderate Sedation:</span> {result.sedation.units} unit(s) ({result.sedation.units * 15} min)
                </p>
              </div>
            )}

            {/* Patient & Date */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Charge Details</h3>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">— Select from roster or enter below —</option>
                  {patients.filter(p => p.isActive).map(p => (
                    <option key={p.id} value={p.id}>{p.patientName} (DOB: {p.dob || 'N/A'})</option>
                  ))}
                </select>
              </div>

              {!selectedPatientId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Patient Name</label>
                    <input
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Last, First"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">DOB (optional)</label>
                    <input
                      value={patientDob}
                      onChange={(e) => setPatientDob(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Procedure Date</label>
                <input
                  type="date"
                  value={chargeDate}
                  onChange={(e) => setChargeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmitCharge}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Submit as Charge
              </button>
              {onOpenInEditor && (
                <button
                  onClick={() => onOpenInEditor(result)}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Open in Code Editor
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/screens/OpNoteExtractorScreen.tsx
git commit -m "feat: add Op Note Extractor screen with code review UI"
```

---

### Task 6: Wire Up Admin Portal

**Files:**
- Modify: `src/screens/AdminPortalScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Op Note button to Admin Portal header**

In `src/screens/AdminPortalScreen.tsx`, add `Sparkles` to the lucide import, add state for showing the extractor, and add a button in the header next to Refresh.

Add import:
```typescript
import { OpNoteExtractorScreen } from './OpNoteExtractorScreen';
```

Add `Sparkles` to the lucide import line.

Add state:
```typescript
const [showOpNoteExtractor, setShowOpNoteExtractor] = useState(false);
```

Add button next to the Refresh button in the header:
```tsx
<button
  onClick={() => setShowOpNoteExtractor(true)}
  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-200 bg-blue-800/50 rounded-lg hover:bg-blue-700 transition-colors"
>
  <Sparkles className="w-3.5 h-3.5" />
  Op Note
</button>
```

Add the full-screen overlay at the top of the return, before the main div:
```tsx
{showOpNoteExtractor && (
  <div className="fixed inset-0 z-50 bg-white">
    <OpNoteExtractorScreen
      onClose={() => setShowOpNoteExtractor(false)}
      orgId={orgId}
      userId={currentUserId}
      userName={currentUserName}
      patients={patients}
      onChargeCreated={() => {
        handleChargesUpdated();
        setShowOpNoteExtractor(false);
      }}
    />
  </div>
)}
```

- [ ] **Step 2: Add VITE_EXTRACT_CODES_URL to .env**

Create or update `.env` at project root:
```
VITE_EXTRACT_CODES_URL=https://YOUR_API_GATEWAY_URL/extract-codes
```

(Placeholder URL — will be filled after Lambda deployment.)

- [ ] **Step 3: Verify build**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -3`

- [ ] **Step 4: Commit**

```bash
git add src/screens/AdminPortalScreen.tsx .env
git commit -m "feat: wire Op Note Extractor into Admin Portal header"
```

---

### Task 7: Deploy Lambda to AWS

- [ ] **Step 1: Create S3 bucket**

Run: `aws s3 mb s3://cathdoc-code-library --region us-east-1`

- [ ] **Step 2: Upload code library to S3**

Run: `aws s3 cp lambda/extract-codes/code-library.json s3://cathdoc-code-library/code-library.json`

- [ ] **Step 3: Create Lambda function**

Package and deploy:
```bash
cd lambda/extract-codes
zip -r function.zip . -x "node_modules/.cache/*"
aws lambda create-function \
  --function-name cathdoc-extract-codes \
  --runtime nodejs22.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/cathdoc-lambda-role \
  --timeout 25 \
  --memory-size 512 \
  --region us-east-1 \
  --environment "Variables={CODE_LIBRARY_BUCKET=cathdoc-code-library,FIREBASE_SERVICE_ACCOUNT=...}"
```

Note: The IAM role needs permissions for:
- `bedrock:InvokeModel` on Claude Sonnet
- `s3:GetObject` on `cathdoc-code-library` bucket
- CloudWatch Logs (basic execution role)

- [ ] **Step 4: Create API Gateway**

```bash
aws apigatewayv2 create-api \
  --name cathdoc-extract-codes \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*",AllowMethods="POST,OPTIONS",AllowHeaders="Content-Type"
```

Create integration and route pointing to the Lambda, then deploy.

- [ ] **Step 5: Update .env with real URL**

Update `VITE_EXTRACT_CODES_URL` in `.env` with the API Gateway invoke URL.

- [ ] **Step 6: Rebuild and test**

```bash
cd /Users/gyounis/Desktop/LumenInnovations/CathDoc
npx vite build && npx cap sync ios
```

- [ ] **Step 7: Commit and push**

```bash
git add .env
git commit -m "feat: configure Lambda endpoint URL"
git push origin main
```
