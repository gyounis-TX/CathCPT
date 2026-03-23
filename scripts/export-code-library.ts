/**
 * export-code-library.ts
 * Exports all CPT, ICD-10, billing rule, CCI edit, and modifier data to
 * lambda/extract-codes/code-library.json for use in the Lambda function.
 *
 * Run: npx tsx scripts/export-code-library.ts
 */

import fs from 'fs';
import path from 'path';
import { cptCategories } from '../src/data/cptCategories';
import { icd10Codes } from '../src/data/icd10Codes';
import { billingRules } from '../src/data/billingRules';
import { cciPairs } from '../src/data/cciEdits';
import { modifierDefinitions } from '../src/data/modifierDefinitions';

// ---------------------------------------------------------------------------
// 1. Flatten CPT categories into a single array, stripping isDivider entries
// ---------------------------------------------------------------------------
const cptCodes = Object.entries(cptCategories).flatMap(([category, codes]) =>
  codes
    .filter((c: any) => !c.isDivider)
    .map((c: any) => ({ ...c, category }))
);

// ---------------------------------------------------------------------------
// 2. Extract billing rule metadata — strip the check() function
// ---------------------------------------------------------------------------
const billingRuleMeta = billingRules.map(({ check: _check, ...rest }) => rest);

// ---------------------------------------------------------------------------
// 3. ICD-10 codes (already a flat array)
// ---------------------------------------------------------------------------
const icd10 = icd10Codes;

// ---------------------------------------------------------------------------
// 4. CCI edit pairs (already serializable)
// ---------------------------------------------------------------------------
const cciEdits = cciPairs;

// ---------------------------------------------------------------------------
// 5. Modifier definitions (Record → array for easier consumption)
// ---------------------------------------------------------------------------
const modifiers = Object.values(modifierDefinitions);

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const outputDir = path.resolve(__dirname, '../lambda/extract-codes');
const outputFile = path.join(outputDir, 'code-library.json');

fs.mkdirSync(outputDir, { recursive: true });

const library = {
  generatedAt: new Date().toISOString(),
  counts: {
    cptCodes: cptCodes.length,
    icd10Codes: icd10.length,
    billingRules: billingRuleMeta.length,
    cciEdits: cciEdits.length,
    modifiers: modifiers.length,
  },
  cptCodes,
  icd10Codes: icd10,
  billingRules: billingRuleMeta,
  cciEdits,
  modifiers,
};

fs.writeFileSync(outputFile, JSON.stringify(library, null, 2), 'utf-8');

console.log('Code library written to:', outputFile);
console.log('Counts:');
console.log(`  CPT codes    : ${library.counts.cptCodes}`);
console.log(`  ICD-10 codes : ${library.counts.icd10Codes}`);
console.log(`  Billing rules: ${library.counts.billingRules}`);
console.log(`  CCI edits    : ${library.counts.cciEdits}`);
console.log(`  Modifiers    : ${library.counts.modifiers}`);
