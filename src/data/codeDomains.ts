// Code Domain Classification — maps CPT codes to domains for modifier rule evaluation
// Derives from existing data files: cptCategories.ts, echoCodes.ts, epCodes.ts, inpatientCodes.ts

export type CodeDomain =
  | 'em'
  | 'echo'
  | 'diagnostic_cath'
  | 'pci'
  | 'ep'
  | 'peripheral_dx'
  | 'peripheral_int'
  | 'structural'
  | 'mcs'
  | 'misc';

// ==================== E/M Code Detection ====================

/** E/M code ranges: 99202-99499, plus specific inpatient codes */
const emCodeRanges: [number, number][] = [
  [99202, 99499],  // Standard E/M range
];

const specificEMCodes = new Set([
  '99221', '99222', '99223',  // Initial hospital
  '99231', '99232', '99233',  // Subsequent hospital
  '99224', '99225', '99226',  // Observation subsequent
  '99238', '99239',           // Discharge
  '99251', '99252', '99253', '99254', '99255',  // Consults
  '99291', '99292',           // Critical care
  '99354', '99355', '99356', '99357', '99417',  // Prolonged services
]);

export function isEMCode(code: string): boolean {
  if (specificEMCodes.has(code)) return true;
  const num = parseInt(code, 10);
  if (isNaN(num)) return false;
  return emCodeRanges.some(([min, max]) => num >= min && num <= max);
}

// ==================== Procedure Code Sets ====================

const diagnosticCathCodes = new Set([
  '93451', '93452', '93453',  // Standalone heart caths
  '93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461',  // Coronary angiography
]);

const pciCodes = new Set([
  '92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',  // PCI base
  '0913T', '0914T',  // DCB
  '92972', '92973', '92974',  // PCI add-ons
  '92978', '92979',  // IVUS/OCT
  '93571', '93572',  // FFR
  '0523T', '0524T',  // OCT
]);

const echoCodes = new Set([
  // TTE
  '93306', '93307', '93308', '93303', '93304',
  '93320', '93321', '93325',  // Doppler add-ons
  '93352', '93356',  // Contrast and strain add-ons
  '76376', '76377',  // 3D rendering
  // TEE
  '93312', '93313', '93314', '93315', '93316', '93317', '93318',
  '93355',  // 3D TEE structural
  // Stress echo
  '93350', '93351',
  // ICE
  '93662',
  // Cardioversion (grouped with echo in the app)
  '92960', '92961',
]);

const epCodes = new Set([
  // EP Diagnostic
  '93600', '93602', '93603', '93609', '93610', '93612', '93613',
  '93618', '93619', '93620', '93621', '93622', '93623', '93624',
  '93631', '93640', '93641', '93642',
  // Ablation
  '93650', '93653', '93654', '93655', '93656', '93657',
  // Pacemaker
  '33206', '33207', '33208', '33212', '33213',
  '33227', '33228', '33229',
  // ICD
  '33249', '33230', '33231', '33240',
  '33262', '33263', '33264',
  // CRT
  '33224', '33225', '33226',
  // Leadless
  '33274', '33275',
  // S-ICD
  '33270', '33271', '33272', '33273',
  // Device revision
  '33214', '33215', '33216', '33217', '33218', '33220', '33221', '33222', '33223',
  // Lead extraction
  '33234', '33235', '33241', '33244',
  // Loop recorder
  '33285', '33286',
  // Tilt table
  '95921', '95922', '95924',
]);

const peripheralDxCodes = new Set([
  // Catheter placement
  '36200', '36245', '36246', '36247', '36248',
  '36215', '36216', '36217',
  '36010', '36011', '36012',
  // Imaging S&I
  '75600', '75605', '75625', '75630',
  '75676', '75680',
  '75710', '75716', '75722', '75724', '75726', '75736', '75774',
  '75820', '75822', '75825', '75827',
  // Cerebrovascular catheter placement
  '36221', '36222', '36223', '36224', '36225', '36226', '36227', '36228',
]);

const peripheralIntCodes = new Set([
  // Iliac
  '37254', '37255', '37256', '37257', '37258', '37259', '37260', '37261', '37262',
  // Femoral/popliteal
  '37263', '37264', '37265', '37266', '37267', '37268', '37269', '37270',
  '37271', '37272', '37273', '37274', '37275', '37276', '37277', '37278', '37279',
  // Tibial/peroneal
  '37280', '37281', '37282', '37283', '37284', '37285', '37286', '37287',
  '37288', '37289', '37290', '37291', '37292', '37293', '37294', '37295',
  // Inframalleolar
  '37296', '37297', '37298', '37299',
  // Renal intervention
  '37246', '37247', '37248', '37249',
  '0338T', '0339T',
  // Mesenteric intervention
  '37220', '37221', '37236', '37237',
  // Carotid stenting
  '37215', '37216', '37217', '37218',
  // IVC filter
  '37191', '37192', '37193',
  // Venous stenting
  '37238', '37239',
  // Venous thrombectomy
  '37187', '37188',
  // Thrombolysis
  '37211', '37212', '37213', '37214',
  // Arterial thrombectomy
  '37184', '37185', '37186',
  // Embolization
  '37241', '37242',
  // Subclavian
  '37226', '37227',
  // Retrieval
  '37197',
]);

const structuralCodes = new Set([
  // TAVR
  '33361', '33362', '33363', '33364', '33365', '33366', '33367', '33368', '33369',
  // Balloon Valvuloplasty
  '92986', '92987', '92990',
  // Structural
  '93580', '93581', '93582', '93583',
  '93590', '93591',           // Paravalvular leak closure
  '33340',                    // LAA closure (Watchman)
  '33418', '33419',
  '0569T', '0570T',
  // EVAR
  '34701', '34702', '34703', '34704', '34705', '34706', '34707', '34708', '34709',
  '34710', '34711', '34712', '34713', '34714',
  '34808', '34812', '34820', '34833', '34834',
  '34717', '34718', '0254T', '0255T',
  // TEVAR
  '33880', '33881', '33883', '33884', '33886', '33889', '33891',
]);

const mcsCodes = new Set([
  '33990', '33991', '33995', '33992', '33993',  // pVAD (Impella)
  '33946', '33947', '33948', '33949', '33951', '33952',  // ECMO
  '33989',  // IABP
]);

const adjunctiveCodes = new Set([
  '93462', '93463', '93464',  // Transseptal, pharmacologic, exercise
  '93505',  // Biopsy
  '93566', '93567', '93568',  // Injection add-ons
  '33016', '33017',  // Pericardiocentesis
  '92950',  // CPR
  '36000', '36140',  // Access
  '93503',  // Swan-Ganz
  '33210', '33211',  // Temp pacer
  '92998',  // Unsuccessful PCI
  '33967',  // IABP insertion (alias)
]);

// ==================== Domain Map ====================

/** Get the domain classification for a CPT code */
export function getCodeDomain(code: string): CodeDomain {
  if (isEMCode(code)) return 'em';
  if (echoCodes.has(code)) return 'echo';
  if (diagnosticCathCodes.has(code)) return 'diagnostic_cath';
  if (pciCodes.has(code)) return 'pci';
  if (epCodes.has(code)) return 'ep';
  if (peripheralDxCodes.has(code)) return 'peripheral_dx';
  if (peripheralIntCodes.has(code)) return 'peripheral_int';
  if (structuralCodes.has(code)) return 'structural';
  if (mcsCodes.has(code)) return 'mcs';
  if (adjunctiveCodes.has(code)) return 'misc';
  return 'misc';
}

/** Check if code is a procedure (non-E/M) */
export function isProcedureCode(code: string): boolean {
  const domain = getCodeDomain(code);
  return domain !== 'em' && domain !== 'misc';
}

// ==================== Professional/Technical Split Codes ====================
// Codes that can be billed with -26 (professional) or -TC (technical) component

export const profTechCodes = new Set([
  // Echo — TTE
  '93306', '93307', '93308', '93303', '93304',
  '93320', '93321', '93325',
  // Echo — TEE
  '93312', '93314', '93315', '93317',
  // Stress echo
  '93350', '93351',
  // Nuclear / imaging supervision codes
  '75600', '75605', '75625', '75630',
  '75676', '75680',
  '75710', '75716', '75722', '75724', '75726', '75736', '75774',
  '75820', '75822', '75825', '75827',
  // 3D rendering
  '76376', '76377',
]);

// ==================== Bilateral-Eligible Codes ====================

export const bilateralCodes = new Set([
  '75716',  // Bilateral extremity angiography
  '75724',  // Bilateral renal angiography
  '0339T',  // Renal denervation, bilateral
  '75822',  // Bilateral venography
]);

// ==================== Laterality-Eligible Codes ====================
// Codes where -LT/-RT may apply

export const lateralityCodes = new Set([
  '93451',  // Right heart cath
  '93452',  // Left heart cath
  '75710',  // Unilateral extremity angio
  '75722',  // Unilateral renal angio
  '75820',  // Unilateral venography
  '0338T',  // Renal denervation unilateral
]);

// ==================== Procedure Domain Helpers ====================

/** Check if a code is an echo/imaging interpretation code (eligible for -26) */
export function isInterpretationCode(code: string): boolean {
  return profTechCodes.has(code) && echoCodes.has(code);
}

/** Check if code is a diagnostic cath */
export function isDiagnosticCathCode(code: string): boolean {
  return diagnosticCathCodes.has(code);
}

/** Check if code is a PCI code */
export function isPCICode(code: string): boolean {
  return pciCodes.has(code);
}

/** Check if code is an echo code */
export function isEchoCode(code: string): boolean {
  return echoCodes.has(code);
}

/** Check if code is an EP code */
export function isEPCode(code: string): boolean {
  return epCodes.has(code);
}

// ==================== Add-On Code to Primary Mapping ====================
// Add-on codes and their required primary/base codes

export const addOnCodePrimaries: Record<string, string[]> = {
  // PCI add-ons → require base PCI
  '92972': ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'],
  '92973': ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'],
  '92974': ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'],
  '0914T': ['92920', '92924', '92928', '92930', '92933', '0913T'],
  // IVUS/FFR/OCT initial → require PCI or diagnostic cath
  '92978': ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',
            '93451', '93452', '93453', '93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'],
  '93571': ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',
            '93451', '93452', '93453', '93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'],
  '0523T': ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',
            '93451', '93452', '93453', '93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'],
  // IVUS/FFR/OCT additional → require initial
  '92979': ['92978'],
  '93572': ['93571'],
  '0524T': ['0523T'],
  // Echo add-ons → require base echo (TTE or TEE)
  '93320': ['93303', '93304', '93306', '93307', '93308', '93312', '93314', '93315'],
  '93321': ['93303', '93304', '93306', '93307', '93308', '93312', '93314', '93315'],
  '93325': ['93303', '93304', '93306', '93307', '93308', '93312', '93314', '93315', '93350', '93351'],
  '93352': ['93306', '93303', '93304', '93312', '93314', '93350', '93351'],
  '93356': ['93306', '93303', '93304'],
  '76376': ['93306', '93303', '93312', '93314'],
  '76377': ['93306', '93303', '93312', '93314'],
  // TEE add-ons
  '93313': ['93312', '93314'],
  '93316': ['93315'],
  '93317': ['93315'],
  '93318': ['93312', '93314', '93315'],
  '93355': ['93312', '93314'],
  // EP add-ons
  '93621': ['93619', '93620', '93653', '93654', '93656'],
  '93622': ['93619', '93620', '93653', '93654', '93656'],
  '93623': ['93619', '93620', '93653', '93654', '93656'],
  '93655': ['93653', '93654', '93656'],
  '93657': ['93656'],
  // ICE (intracardiac echo) — used with EP ablation, structural procedures
  '93662': ['93653', '93654', '93656', '93619', '93620',
            '93580', '93581', '93582', '93590', '33340',
            '33361', '33362', '33363', '33364', '33365', '33366',
            '33418', '33419', '0569T'],
  // Cath add-ons
  '93462': ['93451', '93452', '93453', '93458', '93459', '93460', '93461'],
  '93463': ['93451', '93452', '93453', '93458', '93459', '93460', '93461'],
  '93464': ['93451', '93452', '93453', '93458', '93459', '93460', '93461'],
  '93566': ['93451', '93452', '93453', '93458', '93459', '93460', '93461'],
  '93567': ['93451', '93452', '93453', '93458', '93459', '93460', '93461'],
  '93568': ['93451', '93452', '93453', '93458', '93459', '93460', '93461'],
  // E/M add-ons
  '99292': ['99291'],
  '99355': ['99354'],
  '99357': ['99356'],
  // Device add-ons
  '33225': ['33206', '33207', '33208', '33224', '33249'],
};

// ==================== Echo Mutual Exclusion Pairs ====================
// [code1, code2, reason] — these echo code pairs should NOT be billed together

export const echoMutualExclusionPairs: [string, string, string][] = [
  ['93306', '93307', 'Complete TTE with Doppler (93306) and TTE without Doppler (93307) are mutually exclusive — use 93306 if Doppler was performed'],
  ['93306', '93303', 'Complete TTE with Doppler (93306) includes components of initial TTE (93303) — bill the more comprehensive code'],
  ['93303', '93304', 'Initial TTE (93303) and follow-up TTE (93304) cannot be billed together same session'],
  ['93306', '93304', 'Complete TTE with Doppler (93306) and follow-up TTE (93304) cannot be billed together'],
  ['93350', '93351', 'Stress echo without Doppler (93350) and stress echo with Doppler (93351) are mutually exclusive'],
  ['93312', '93314', 'Standard TEE (93312) and TEE with probe placement (93314) are mutually exclusive'],
  // Stress echo includes resting echo images — cannot bill resting TTE separately
  ['93306', '93350', 'Complete TTE with Doppler (93306) and stress echo (93350) — resting echo images are included in the stress echo. Bill the stress echo code only unless the resting TTE was a distinct, separately indicated study (requires -59 with documentation).'],
  ['93306', '93351', 'Complete TTE with Doppler (93306) and stress echo with Doppler (93351) — resting echo with Doppler is included in 93351. Bill 93351 only unless the resting TTE was a distinct study (requires -59).'],
  ['93307', '93350', 'TTE without Doppler (93307) and stress echo (93350) — resting echo is included in stress echo.'],
  ['93307', '93351', 'TTE without Doppler (93307) and stress echo with Doppler (93351) — resting echo is included in stress echo.'],
  ['93303', '93350', 'Initial TTE (93303) and stress echo (93350) — resting echo is included in stress echo.'],
  ['93303', '93351', 'Initial TTE (93303) and stress echo with Doppler (93351) — resting echo is included in stress echo.'],
  ['93304', '93351', 'Follow-up TTE (93304) and stress echo with Doppler (93351) — resting echo components are included in stress echo.'],
];

// ==================== Critical Care Bundled Procedures ====================
// These procedures are bundled into critical care (99291/99292) and cannot be separately billed

export const criticalCareBundledProcedures = new Set([
  '93503',  // Swan-Ganz insertion
  '92950',  // CPR
  '36000',  // IV access
  '36140',  // Extremity arterial access
  '36410',  // Venipuncture
  '36600',  // Arterial puncture
]);

// ==================== Sedation-Inherent Procedures ====================
// These procedures include moderate sedation — do NOT separately bill 99152/99153

export const sedationInherentProcedures = new Set([
  // Diagnostic cath
  '93451', '93452', '93453', '93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461',
  // PCI
  '92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',
  // EP procedures
  '93653', '93654', '93656', '93619', '93620',
  // Device implants
  '33206', '33207', '33208', '33212', '33213', '33249', '33230', '33231', '33240',
  '33262', '33263', '33264', '33270', '33271', '33274', '33275',
  // TEE
  '93312', '93314', '93315',
  // Cardioversion
  '92960', '92961',
  // TAVR
  '33361', '33362', '33363', '33364', '33365', '33366',
  // Structural
  '93580', '93581', '93582', '93583', '93590', '93591', '33340',
  // MCS
  '33990', '33991', '33995', '33946', '33947',
  // Balloon valvuloplasty
  '92986', '92987', '92990',
  // Peripheral interventions (representative)
  '37220', '37221', '37224', '37225', '37226', '37227', '37228', '37229',
  '37230', '37231', '37236', '37237', '37238', '37239',
]);

// ==================== Catheter Hierarchy ====================
// Higher-order selective caths include lower-order — cannot bill both in same vascular family

export const catheterHierarchy: { higher: string; includes: string[]; description: string }[] = [
  { higher: '36247', includes: ['36245', '36246'], description: '3rd order selective (36247) includes 1st (36245) and 2nd (36246) order in same vascular family' },
  { higher: '36246', includes: ['36245'], description: '2nd order selective (36246) includes 1st order (36245) in same vascular family' },
  { higher: '36224', includes: ['36222', '36223'], description: 'Cerebrovascular selective cath (36224) includes cervicocerebral arch (36222) and 3rd order cerebral (36223)' },
  { higher: '36223', includes: ['36222'], description: 'Cervicocerebral 3rd order (36223) includes arch study (36222)' },
  { higher: '36217', includes: ['36215', '36216'], description: '3rd order arterial selective (36217) includes 1st (36215) and 2nd (36216) order' },
  { higher: '36216', includes: ['36215'], description: '2nd order arterial selective (36216) includes 1st order (36215)' },
  { higher: '36012', includes: ['36010', '36011'], description: '2nd+ order venous selective (36012) includes 1st (36010) and main branch (36011)' },
  { higher: '36011', includes: ['36010'], description: 'Venous first order branch (36011) includes main venous access (36010)' },
];

// ==================== S&I Code Pairing ====================
// Supervision & Interpretation codes must pair with catheter placement in the same territory

export const siCodePairings: Record<string, { requiredCaths: string[]; territory: string }> = {
  '75600': { requiredCaths: ['36200', '36245', '36246', '36247'], territory: 'Thoracic aorta' },
  '75605': { requiredCaths: ['36200', '36245', '36246', '36247'], territory: 'Thoracic aorta' },
  '75625': { requiredCaths: ['36200', '36245', '36246', '36247'], territory: 'Abdominal aorta' },
  '75630': { requiredCaths: ['36200', '36245', '36246', '36247'], territory: 'Abdominal aorta' },
  '75710': { requiredCaths: ['36245', '36246', '36247', '36248'], territory: 'Extremity arterial (unilateral)' },
  '75716': { requiredCaths: ['36245', '36246', '36247', '36248'], territory: 'Extremity arterial (bilateral)' },
  '75722': { requiredCaths: ['36245', '36246', '36247'], territory: 'Renal (unilateral)' },
  '75724': { requiredCaths: ['36245', '36246', '36247'], territory: 'Renal (bilateral)' },
  '75726': { requiredCaths: ['36245', '36246', '36247'], territory: 'Visceral/mesenteric' },
  '75736': { requiredCaths: ['36245', '36246', '36247'], territory: 'Pelvic' },
  '75676': { requiredCaths: ['36222', '36223', '36224', '36225', '36226', '36227', '36228'], territory: 'Carotid/cerebrovascular' },
  '75680': { requiredCaths: ['36222', '36223', '36224', '36225', '36226', '36227', '36228'], territory: 'Carotid/cerebrovascular' },
  '75820': { requiredCaths: ['36010', '36011', '36012'], territory: 'Venous (unilateral extremity)' },
  '75822': { requiredCaths: ['36010', '36011', '36012'], territory: 'Venous (bilateral extremity)' },
  '75825': { requiredCaths: ['36010', '36011', '36012'], territory: 'Venous (IVC/iliac)' },
  '75827': { requiredCaths: ['36010', '36011', '36012'], territory: 'Venous (SVC/innominate)' },
  '75774': { requiredCaths: ['36245', '36246', '36247', '36248'], territory: 'Additional selective injection' },
};

// ==================== Peripheral Territory Codes (2026) ====================
// Primary code per territory + add-on codes for additional vessels

export const peripheralTerritories: Record<string, { primary: string[]; addOn: string[]; territory: string }> = {
  iliac: {
    primary: ['37254', '37256', '37258', '37260'],
    addOn: ['37255', '37257', '37259', '37261', '37262'],
    territory: 'Iliac'
  },
  femPop: {
    primary: ['37263', '37265', '37267', '37269', '37271', '37273', '37275', '37277'],
    addOn: ['37264', '37266', '37268', '37270', '37272', '37274', '37276', '37278', '37279'],
    territory: 'Femoral/Popliteal'
  },
  tibialPeroneal: {
    primary: ['37280', '37282', '37284', '37286', '37288', '37290', '37292', '37294'],
    addOn: ['37281', '37283', '37285', '37287', '37289', '37291', '37293', '37295'],
    territory: 'Tibial/Peroneal'
  },
  inframalleolar: {
    primary: ['37296', '37298'],
    addOn: ['37297', '37299'],
    territory: 'Inframalleolar'
  }
};

// ==================== Global Period Days ====================
// CPT code → global period in days (0, 10, or 90)

export const globalPeriodDays: Record<string, number> = {
  // Device implants — 90-day global
  '33206': 90, '33207': 90, '33208': 90,
  '33212': 90, '33213': 90,
  '33227': 90, '33228': 90, '33229': 90,
  '33249': 90, '33230': 90, '33231': 90, '33240': 90,
  '33262': 90, '33263': 90, '33264': 90,
  '33224': 90, '33225': 90, '33226': 90,
  '33274': 90, '33275': 90,
  '33270': 90, '33271': 90, '33272': 90, '33273': 90,
  // TAVR — 90-day global
  '33361': 90, '33362': 90, '33363': 90, '33364': 90, '33365': 90, '33366': 90,
  // EVAR — 90-day global
  '34701': 90, '34702': 90, '34703': 90, '34704': 90, '34705': 90, '34706': 90,
  // TEVAR — 90-day global
  '33880': 90, '33881': 90, '33883': 90, '33884': 90, '33886': 90,
  // Lead extraction — 90-day global
  '33234': 90, '33235': 90, '33241': 90, '33244': 90,
  // Device revision — 90-day global
  '33214': 90, '33215': 90, '33216': 90, '33217': 90,
  '33218': 90, '33220': 90, '33221': 90, '33222': 90, '33223': 90,
  // Loop recorder — 10-day global
  '33285': 10, '33286': 10,
  // Pericardiocentesis — 0-day global
  '33016': 0, '33017': 0,
  // LAA closure (Watchman) — 0-day global
  '33340': 0,
};

// ==================== Discharge and Special Code Sets ====================

export const dischargeCodes = new Set(['99238', '99239']);
export const criticalCareCodes = new Set(['99291', '99292']);
export const pericardiocentesisCodes = new Set(['33016', '33017']);
export const sedationCodes = new Set(['99152', '99153', '99155', '99156', '99157']);

// ==================== Additional Helpers ====================

export function isDischargeCode(code: string): boolean {
  return dischargeCodes.has(code);
}

export function isCriticalCareCode(code: string): boolean {
  return criticalCareCodes.has(code);
}

export function isPericardiocentesisCode(code: string): boolean {
  return pericardiocentesisCodes.has(code);
}

export function isSedationCode(code: string): boolean {
  return sedationCodes.has(code);
}

export function isAddOnCode(code: string): boolean {
  return code in addOnCodePrimaries;
}

export function getGlobalPeriod(code: string): number | undefined {
  return globalPeriodDays[code];
}

// ==================== Category III (T-Code) Detection ====================
// Category III codes are temporary tracking codes with limited/no Medicare reimbursement

/** Known Category III codes in the system with context */
export const categoryIIICodes: Record<string, string> = {
  '0913T': 'Drug-coated balloon (DCB), coronary — limited payer coverage, verify authorization',
  '0914T': 'DCB add-on vessel — limited payer coverage, verify authorization',
  '0523T': 'Coronary OCT, initial vessel — limited payer coverage, some commercial plans cover',
  '0524T': 'Coronary OCT, additional vessel — limited payer coverage',
  '0338T': 'Renal denervation, unilateral — investigational, most payers deny',
  '0339T': 'Renal denervation, bilateral — investigational, most payers deny',
  '0569T': 'Transcatheter tricuspid valve repair (TTVR) — limited coverage, check payer policy',
  '0570T': 'TTVR additional prosthesis — limited coverage, check payer policy',
  '0254T': 'Iliac bifurcation endograft — limited coverage',
  '0255T': 'Iliac bifurcation endograft add-on — limited coverage',
};

/** Check if a code is a Category III (T-code) */
export function isCategoryIIICode(code: string): boolean {
  return /^\d{4}T$/.test(code);
}

/** Get reimbursement warning for a Category III code */
export function getCategoryIIIWarning(code: string): string | undefined {
  return categoryIIICodes[code];
}

// ==================== E/M Time Thresholds ====================
// Minimum minutes required for E/M code level selection (2026 guidelines)

export const emTimeThresholds: Record<string, { minMinutes: number; maxMinutes?: number; label: string }> = {
  '99221': { minMinutes: 40, label: 'Initial hospital care, low complexity' },
  '99222': { minMinutes: 55, label: 'Initial hospital care, moderate complexity' },
  '99223': { minMinutes: 75, label: 'Initial hospital care, high complexity' },
  '99231': { minMinutes: 25, label: 'Subsequent hospital care, low complexity' },
  '99232': { minMinutes: 35, label: 'Subsequent hospital care, moderate complexity' },
  '99233': { minMinutes: 50, label: 'Subsequent hospital care, high complexity' },
  '99238': { minMinutes: 0, maxMinutes: 30, label: 'Discharge day, ≤30 min' },
  '99239': { minMinutes: 31, label: 'Discharge day, >30 min' },
  '99251': { minMinutes: 20, label: 'Consult, straightforward' },
  '99252': { minMinutes: 40, label: 'Consult, low complexity' },
  '99253': { minMinutes: 55, label: 'Consult, moderate complexity' },
  '99254': { minMinutes: 80, label: 'Consult, moderate-high complexity' },
  '99255': { minMinutes: 110, label: 'Consult, high complexity' },
  '99291': { minMinutes: 30, maxMinutes: 74, label: 'Critical care, first 30-74 min' },
  // Observation same-day admit/discharge
  '99234': { minMinutes: 45, label: 'Observation same-day, low complexity' },
  '99235': { minMinutes: 70, label: 'Observation same-day, moderate complexity' },
  '99236': { minMinutes: 90, label: 'Observation same-day, high complexity' },
  // Observation subsequent day visits
  '99224': { minMinutes: 25, label: 'Observation subsequent, low complexity' },
  '99225': { minMinutes: 35, label: 'Observation subsequent, moderate complexity' },
  '99226': { minMinutes: 50, label: 'Observation subsequent, high complexity' },
  // Prolonged services thresholds
  '99354': { minMinutes: 60, label: 'Prolonged outpatient, first hour' },
  '99355': { minMinutes: 30, label: 'Prolonged outpatient, each additional 30 min' },
  '99356': { minMinutes: 60, label: 'Prolonged inpatient, first hour' },
  '99357': { minMinutes: 30, label: 'Prolonged inpatient, each additional 30 min' },
};

// ==================== Consult & Initial Hospital Code Sets ====================

export const consultCodes = new Set(['99251', '99252', '99253', '99254', '99255']);
export const initialHospitalCodes = new Set(['99221', '99222', '99223']);
export const subsequentHospitalCodes = new Set(['99231', '99232', '99233']);

export function isConsultCode(code: string): boolean {
  return consultCodes.has(code);
}

export function isInitialHospitalCode(code: string): boolean {
  return initialHospitalCodes.has(code);
}

export function isSubsequentHospitalCode(code: string): boolean {
  return subsequentHospitalCodes.has(code);
}

// ==================== Indication ↔ Domain Compatibility ====================
// Maps case indication categories to compatible CPT code domains
// Used to detect when a procedure code doesn't match the documented indication

export const indicationDomainCompatibility: Record<string, CodeDomain[]> = {
  cardiac: ['em', 'echo', 'diagnostic_cath', 'pci', 'ep', 'mcs', 'misc'],
  peripheral: ['em', 'peripheral_dx', 'peripheral_int', 'misc'],
  structural: ['em', 'echo', 'diagnostic_cath', 'structural', 'mcs', 'misc'],
};

// ==================== Charge Lag Thresholds ====================
// Days between service date and charge entry — flags timely filing risk

export const CHARGE_LAG_WARNING_DAYS = 7;
export const CHARGE_LAG_ERROR_DAYS = 30;

// ==================== PCI Codes Requiring Vessel Documentation ====================
// These PCI codes require vessel identification for proper billing

export const pciCodesRequiringVessel = new Set([
  '92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',
  '0913T', '0914T',
]);

// ==================== E/M Level Families ====================
// Groups E/M codes by family for level optimization (upgrade/downgrade suggestions)

export const emLevelFamilies: { family: string; codes: string[] }[] = [
  { family: 'Initial Hospital Care', codes: ['99221', '99222', '99223'] },
  { family: 'Subsequent Hospital Care', codes: ['99231', '99232', '99233'] },
  { family: 'Discharge Management', codes: ['99238', '99239'] },
  { family: 'Inpatient Consult', codes: ['99251', '99252', '99253', '99254', '99255'] },
  { family: 'Observation Same-Day', codes: ['99234', '99235', '99236'] },
  { family: 'Observation Subsequent', codes: ['99224', '99225', '99226'] },
];

// ==================== Prior Authorization Required Procedures ====================
// High-cost procedures that typically require payer pre-authorization

export const priorAuthProcedures: Record<string, string> = {
  // TAVR
  '33361': 'TAVR (transfemoral) — prior authorization required by all major payers',
  '33362': 'TAVR (transapical) — prior authorization required by all major payers',
  '33363': 'TAVR (transaortic) — prior authorization required by all major payers',
  '33364': 'TAVR (transaxillary) — prior authorization required by all major payers',
  '33365': 'TAVR (transcaval) — prior authorization required by all major payers',
  '33366': 'TAVR (transcarotid) — prior authorization required by all major payers',
  // ICD/CRT-D
  '33249': 'ICD/CRT-D implant — prior authorization required by most payers',
  '33230': 'ICD generator change — prior authorization often required',
  '33231': 'ICD generator change, dual — prior authorization often required',
  '33240': 'ICD implant, single lead — prior authorization required',
  // S-ICD
  '33270': 'S-ICD implant — prior authorization required',
  '33271': 'S-ICD generator change — prior authorization often required',
  // CRT
  '33224': 'CRT upgrade — prior authorization required',
  '33225': 'CRT LV lead placement (add-on) — prior authorization via base procedure',
  // Leadless PM
  '33274': 'Leadless pacemaker implant — prior authorization required by most payers',
  // Lead extraction
  '33234': 'Lead extraction (transvenous) — prior authorization required',
  '33235': 'Lead extraction (transvenous), dual — prior authorization required',
  '33241': 'ICD lead extraction — prior authorization required',
  '33244': 'Lead extraction requiring thoracotomy — prior authorization required',
  // MCS
  '33990': 'pVAD (Impella) insertion — prior auth for elective; emergent may be retrospective',
  '33991': 'pVAD (Impella) removal — paired with insertion authorization',
  '33995': 'pVAD insertion, repositioning — prior auth for elective',
  // ECMO
  '33946': 'ECMO initiation, VA — prior auth for elective; emergent reviewed retrospectively',
  '33947': 'ECMO initiation, VV — prior auth for elective; emergent reviewed retrospectively',
  // Structural
  '93580': 'ASD closure — prior authorization required',
  '93581': 'VSD closure — prior authorization required',
  '93582': 'PFO closure — prior authorization required (limited coverage)',
  '93590': 'Paravalvular leak closure — prior authorization required for transcatheter approach',
  '33340': 'LAA closure (Watchman) — prior authorization required, Q0 modifier required (CED), dual diagnosis: AF primary + Z00.6',
  '33418': 'Mitral valve repair (TEER/MitraClip) — prior authorization required',
  '33419': 'Mitral valve repair add-on — paired with base authorization',
  '0569T': 'Transcatheter tricuspid valve repair — limited coverage, prior auth required where covered',
  // EVAR/TEVAR
  '34701': 'EVAR, infrarenal — prior authorization required for elective',
  '34702': 'EVAR, infrarenal with extension — prior auth required for elective',
  '33880': 'TEVAR, initial — prior authorization required for elective',
  // Atherectomy
  '92924': 'Coronary atherectomy — prior authorization required by some payers, especially for rotational/orbital devices',
  '92933': 'Coronary atherectomy + stent — prior authorization may be required',
  // Coronary lithotripsy (IVL)
  '92972': 'Coronary lithotripsy (IVL) — prior authorization required by many payers for Shockwave device',
};

// ==================== Modifier Documentation Requirements ====================
// What must be documented to support each modifier at audit

export const modifierDocRequirements: Record<string, string> = {
  '-25': 'Requires separate E/M documentation: distinct history, exam, or MDM beyond the procedure. The note must demonstrate a significant, separately identifiable service.',
  '-59': 'Requires documentation of a distinct service: different session, different procedure/surgery, different anatomical site or organ system, or separate incision/excision.',
  '-76': 'Requires documentation that the same procedure was repeated on the same day by the same physician, with documented medical necessity for the repeat.',
  '-77': 'Requires documentation identifying a different physician who performed the repeat procedure, with medical necessity documented.',
  '-26': 'Professional component only — physician interpretation/report must be documented separately. Facility bills technical component (-TC).',
  '-TC': 'Technical component only — facility bills equipment, supplies, and technician. Physician interpretation billed separately with -26.',
  '-24': 'Requires documentation that the E/M service was for a condition UNRELATED to the original procedure during the global period.',
  '-78': 'Requires documentation of an unplanned return to the OR for a RELATED complication during the postoperative period.',
  '-79': 'Requires documentation of an UNRELATED procedure during the postoperative period of the original surgery.',
  '-50': 'Bilateral procedure — both sides must be documented with findings. Single operative note covering both sides is acceptable.',
  '-LT': 'Left side — laterality must be documented in the operative/procedure note.',
  '-RT': 'Right side — laterality must be documented in the operative/procedure note.',
  '-51': 'Multiple procedures — each procedure must be documented separately with individual medical necessity.',
  '-57': 'Requires documentation that this E/M service resulted in the initial decision to perform surgery within the next 24 hours.',
  '-22': 'Requires detailed operative note explaining increased complexity — why the procedure was substantially more difficult than typical. Include time, findings, and technique.',
  '-52': 'Reduced services — document why the procedure was partially reduced or not completed as planned.',
  '-53': 'Discontinued procedure — document the reason for discontinuation (patient risk, equipment failure, etc.) and what portion was completed.',
};

// ==================== Age-Restricted Procedures ====================
// Procedures with age-specific coverage or clinical requirements

export const ageRestrictedProcedures: { codes: string[]; minAge?: number; maxAge?: number; note: string }[] = [
  {
    codes: ['33249', '33230', '33231', '33240', '33262', '33263', '33264'],
    minAge: 18,
    note: 'ICD implant — primary prevention NCD criteria validated for adults. Pediatric ICD coverage requires specific documented criteria per payer.'
  },
  {
    codes: ['33361', '33362', '33363', '33364', '33365', '33366'],
    minAge: 18,
    note: 'TAVR — FDA-approved and NCD-covered for adult patients. Not applicable to pediatric population.'
  },
  {
    codes: ['33270', '33271'],
    minAge: 18,
    note: 'Subcutaneous ICD (S-ICD) — FDA-approved for adults ≥18 years. Pediatric coverage is non-standard.'
  },
  {
    codes: ['33274', '33275'],
    minAge: 18,
    note: 'Leadless pacemaker — FDA indication for adults. Pediatric use is off-label and may not be covered.'
  },
  {
    codes: ['93580', '93581', '93582'],
    note: 'Structural closure — ASD/VSD/PFO closure. Verify payer-specific age requirements. PFO closure (93582) typically requires age 18-60 for stroke prevention indication.'
  },
  {
    codes: ['33340'],
    minAge: 18,
    note: 'LAA closure (Watchman) — NCD requires age ≥18, CHA₂DS₂-VASc score ≥3, and documented contraindication to long-term anticoagulation.'
  },
];

// ==================== NCD/LCD Compliance Rules ====================
// Medicare National/Local Coverage Determination requirements for major cardiac procedures

export interface NCDRule {
  id: string;
  name: string;
  procedures: string[];
  requiredDiagnosisPrefixes: string[];
  clinicalCriteria: string;
  documentationChecklist: string;
}

export const ncdRules: NCDRule[] = [
  {
    id: 'ncd-icd-primary',
    name: 'ICD Primary Prevention (NCD 20.4)',
    procedures: ['33249', '33230', '33231', '33240', '33262', '33263', '33264'],
    requiredDiagnosisPrefixes: ['I42', 'I43', 'I50', 'I25.5'],
    clinicalCriteria: 'EF ≤35% (or ≤30% for MADIT), NYHA Class II-III, on GDMT ≥3 months, ≥40 days post-MI if ischemic CMP.',
    documentationChecklist: 'EF value and date, NYHA functional class, medication list showing GDMT, MI date if applicable, heart failure etiology.'
  },
  {
    id: 'ncd-crt',
    name: 'CRT Coverage (NCD 20.4)',
    procedures: ['33224', '33225', '33226'],
    requiredDiagnosisPrefixes: ['I50', 'I42', 'I43', 'I25.5', 'I44.7'],
    clinicalCriteria: 'LBBB with QRS ≥150ms (or 120-149ms with LBBB), EF ≤35%, NYHA Class II-IV ambulatory, sinus rhythm.',
    documentationChecklist: 'QRS duration and morphology (LBBB vs non-LBBB), EF value, NYHA class, rhythm (sinus vs AF), GDMT list.'
  },
  {
    id: 'ncd-tavr',
    name: 'TAVR Coverage (NCD 20.32)',
    procedures: ['33361', '33362', '33363', '33364', '33365', '33366'],
    requiredDiagnosisPrefixes: ['I35.0', 'I35.2', 'I06.0', 'I06.2'],
    clinicalCriteria: 'Severe symptomatic aortic stenosis (valve area ≤1.0 cm² or mean gradient ≥40 mmHg), heart team evaluation, intermediate/high/prohibitive surgical risk.',
    documentationChecklist: 'Valve area and mean gradient, STS score or EuroSCORE, heart team conference note, symptom documentation (NYHA class), CT planning.'
  },
  {
    id: 'ncd-ablation',
    name: 'EP Ablation Coverage',
    procedures: ['93653', '93654', '93656'],
    requiredDiagnosisPrefixes: ['I47', 'I48', 'I49'],
    clinicalCriteria: 'Arrhythmia refractory to ≥1 antiarrhythmic drug (AAD), or documented AAD intolerance/contraindication.',
    documentationChecklist: 'Arrhythmia type documented, AAD trial(s) with dates and outcomes, reason for failure/intolerance, EP study results if applicable.'
  },
  {
    id: 'ncd-lead-extraction',
    name: 'Lead Extraction Coverage',
    procedures: ['33234', '33235', '33241', '33244'],
    requiredDiagnosisPrefixes: ['T82.1', 'T82.7', 'T81.4', 'T82.6', 'I33', 'T82.0'],
    clinicalCriteria: 'Documented indication: device/lead infection, lead malfunction/recall, or venous occlusion with need for venous access.',
    documentationChecklist: 'Indication for extraction, blood cultures (if infection), imaging showing malfunction/occlusion, manufacturer recall notice if applicable.'
  },
  {
    id: 'ncd-laa-closure',
    name: 'LAA Closure (Watchman) Coverage (NCD 20.34)',
    procedures: ['33340'],
    requiredDiagnosisPrefixes: ['I48'],
    clinicalCriteria: 'Non-valvular AF, CHA₂DS₂-VASc ≥3, documented contraindication to long-term anticoagulation, heart team recommendation. Requires modifier Q0 (CMS coverage with evidence development). Must report two diagnoses: AF primary (never I48.20) + Z00.6.',
    documentationChecklist: 'CHA₂DS₂-VASc score calculation, reason for anticoagulation contraindication, heart team/multidisciplinary note, AF documentation, Q0 modifier, dual diagnosis (AF + Z00.6).'
  },
  {
    id: 'ncd-paravalvular-leak',
    name: 'Paravalvular Leak Closure Coverage',
    procedures: ['93590'],
    requiredDiagnosisPrefixes: ['T82.0', 'T82.5', 'I38', 'T82.6'],
    clinicalCriteria: 'Symptomatic paravalvular regurgitation post valve replacement/repair, high surgical risk for redo operation, documented hemolysis or heart failure from paravalvular leak.',
    documentationChecklist: 'Prior valve surgery documentation, echo showing paravalvular leak location and severity, symptom documentation (heart failure, hemolysis), surgical risk assessment for redo.'
  },
  {
    id: 'ncd-pfo-closure',
    name: 'PFO Closure Coverage',
    procedures: ['93582'],
    requiredDiagnosisPrefixes: ['Q21.1', 'I63', 'G45'],
    clinicalCriteria: 'Age 18-60, cryptogenic stroke with PFO, neurology evaluation confirming no other stroke etiology.',
    documentationChecklist: 'Stroke documentation, bubble study/TEE showing PFO, neurology clearance, hypercoagulable workup negative, age verification.'
  },
];

// ==================== Retired/Replaced Codes (2025-2026) ====================
// Codes deleted or replaced — flag if found in active charges

export const retiredCodes: Record<string, string> = {
  // Peripheral vascular codes restructured in 2024-2025
  '75962': 'Transluminal balloon angioplasty, peripheral — replaced by territory-specific codes (37246-37249)',
  '75964': 'Transluminal balloon angioplasty, each additional vessel — replaced by territory-specific add-on codes',
  '75966': 'Transluminal balloon angioplasty, renal — replaced by 37246-37249',
  '75968': 'Transluminal balloon angioplasty, each additional renal — replaced by territory-specific codes',
  '35476': 'Transluminal balloon angioplasty, venous — replaced by 37248-37249',
  '37205': 'Transcatheter stent placement, arterial — replaced by territory-specific codes (37236-37239)',
  '37206': 'Transcatheter stent placement, each additional — replaced by territory-specific add-on codes',
};

// ==================== Observation Codes ====================

export const observationCodes = new Set(['99234', '99235', '99236']);
export const observationTimeThresholds: Record<string, { minMinutes: number; label: string }> = {
  '99234': { minMinutes: 45, label: 'Observation same-day admit/discharge, low complexity' },
  '99235': { minMinutes: 70, label: 'Observation same-day admit/discharge, moderate complexity' },
  '99236': { minMinutes: 90, label: 'Observation same-day admit/discharge, high complexity' },
};

export function isObservationCode(code: string): boolean {
  return observationCodes.has(code);
}

// ==================== Diagnostic Cath Code Hierarchy ====================
// Higher-level cath codes include components of lower-level codes

export const diagnosticCathHierarchy: Record<string, { includes: string[]; description: string }> = {
  '93453': { includes: ['93451', '93452'], description: 'Combined R+L heart cath — includes right (93451) and left (93452) heart cath' },
  '93456': { includes: ['93454', '93451'], description: 'Coronary angio + right heart cath — includes standalone right cath (93451) and angio-only (93454)' },
  '93457': { includes: ['93454', '93451', '93455', '93456'], description: 'Coronary angio + bypasses + right heart cath — includes all lower cath combinations' },
  '93458': { includes: ['93454', '93452'], description: 'Coronary angio + left heart cath — includes standalone left cath (93452) and angio-only (93454)' },
  '93459': { includes: ['93454', '93452', '93455', '93458'], description: 'Coronary angio + left + bypasses — includes left cath and angio combinations' },
  '93460': { includes: ['93454', '93451', '93452', '93453', '93456', '93458'], description: 'Coronary angio + combined R+L — includes all standalone and combination cath codes' },
  '93461': { includes: ['93454', '93451', '93452', '93453', '93455', '93456', '93457', '93458', '93459', '93460'], description: 'Coronary angio + combined R+L + bypasses — includes all cath codes' },
};

// Coronary angiography codes — mutually exclusive (only one per session)
export const coronaryAngioCodes = new Set(['93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461']);

// ==================== EP Study + Ablation Bundling ====================
// Ablation codes bundle the comprehensive EP study — EP study cannot be separately billed

export const ablationBundlesEPStudy: Record<string, { bundled: string[]; description: string }> = {
  '93653': { bundled: ['93619', '93620', '93600'], description: 'SVT/AVNRT/AVRT ablation bundles comprehensive EP study' },
  '93654': { bundled: ['93619', '93620', '93600'], description: 'VT ablation bundles comprehensive EP study' },
  '93656': { bundled: ['93619', '93620', '93621', '93622'], description: 'AFib ablation bundles comprehensive EP study + mapping' },
};

export const ablationCodes = new Set(['93653', '93654', '93655', '93656', '93657']);

export function isAblationCode(code: string): boolean {
  return ablationCodes.has(code);
}

export const epStudyCodes = new Set(['93619', '93620']);

export function isEPStudyCode(code: string): boolean {
  return epStudyCodes.has(code);
}

// ==================== Pacemaker/ICD Lead Hierarchy ====================
// Device implant codes must match the number of leads placed

export const deviceImplantLeadRules: { code: string; leads: number; type: string; description: string }[] = [
  { code: '33206', leads: 1, type: 'pacemaker', description: 'Single-chamber pacemaker — 1 lead (atrial OR ventricular)' },
  { code: '33207', leads: 2, type: 'pacemaker', description: 'Dual-chamber pacemaker — 2 leads (atrial + ventricular)' },
  { code: '33208', leads: 3, type: 'pacemaker', description: 'Biventricular pacemaker (CRT-P) — 3 leads (RA + RV + LV)' },
  { code: '33240', leads: 1, type: 'icd', description: 'Single-chamber ICD — 1 lead (ventricular)' },
  { code: '33249', leads: 2, type: 'icd', description: 'Dual-chamber ICD or CRT-D — 2+ leads' },
];

// Generator change codes (should NOT be used with de novo implant codes)
export const generatorChangeCodes = new Set([
  '33227', '33228', '33229',  // PM generator change (single, dual, multi)
  '33262', '33263', '33264',  // ICD generator change (single, dual, multi)
  '33230', '33231',           // ICD pulse generator change
]);

export const deNovoImplantCodes = new Set([
  '33206', '33207', '33208',  // PM de novo
  '33240', '33249',           // ICD de novo
  '33274',                    // Leadless PM
]);

// ==================== TEE + Structural Procedure Rules ====================
// Structural procedures where TEE guidance is expected/required

export const structuralTEECode = '93355';  // 3D TEE for structural intervention
export const genericTEEBaseCodes = new Set(['93312', '93314', '93315']);

export const structuralProceduresExpectingTEE = new Set([
  '33361', '33362', '33363', '33364', '33365', '33366',  // TAVR
  '93580', '93581', '93582',  // ASD/VSD/PFO closure
  '33340',                     // LAA closure (Watchman)
  '93590',                     // Paravalvular leak closure
  '33418', '33419',           // MitraClip/TEER
  '0569T', '0570T',           // TTVR
]);

// ==================== Coronary Vessel Territories ====================
// PCI vessel modifiers → territory. Same territory = one PCI code

export const coronaryTerritories: Record<string, string> = {
  'LD': 'LAD',
  'LC': 'LCx',
  'RC': 'RCA',
  'LM': 'Left Main',
  'RI': 'Ramus',
};

// ==================== IVUS/FFR/OCT Imaging Codes ====================

export const intravascularImagingCodes = new Set([
  '92978', '92979',  // IVUS
  '93571', '93572',  // FFR/CFR
  '0523T', '0524T',  // OCT
]);

export function isIntravascularImagingCode(code: string): boolean {
  return intravascularImagingCodes.has(code);
}

// ==================== Cardioversion Codes ====================

export const cardioversionCodes = new Set(['92960', '92961']);

export function isCardioversionCode(code: string): boolean {
  return cardioversionCodes.has(code);
}

// ==================== Staged PCI Codes ====================
// Base PCI codes (not add-ons) that represent a distinct intervention

export const basePCICodes = new Set([
  '92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',
  '0913T',
]);

// ==================== Balloon Valvuloplasty Codes ====================
// Percutaneous balloon valvuloplasty — separately billable from TAVR only when performed
// as a distinct diagnostic procedure (not as part of TAVR preparation)

export const balloonValvuloplastyCodes = new Set(['92986', '92987', '92990']);

export function isValvuloplastyCode(code: string): boolean {
  return balloonValvuloplastyCodes.has(code);
}

/** TAVR codes that bundle balloon aortic valvuloplasty (BAV) when used as pre-dilation */
export const tavrBundlesBAV: Record<string, string> = {
  '92986': 'Aortic balloon valvuloplasty (BAV) is bundled into TAVR when performed as pre-dilation. Only bill separately if BAV was a distinct diagnostic/therapeutic procedure at a separate session.',
};

// ==================== Fluoroscopy/Guidance Bundled Procedures ====================
// Standalone fluoroscopy codes that are inherently included in cath lab procedures

export const standaloneFluoroscopyCodes = new Set([
  '76000',  // Fluoroscopy, up to 1 hour
  '76001',  // Fluoroscopy, >1 hour
  '77001',  // Fluoroscopic guidance for central venous access
  '77002',  // Fluoroscopic guidance, needle placement
]);

/** Procedures that inherently include fluoroscopic guidance — do NOT bill fluoroscopy separately */
export const fluoroscopyInherentProcedures = new Set([
  // Diagnostic cath
  '93451', '93452', '93453', '93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461',
  // PCI
  '92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',
  // IVC filter (descriptions explicitly include fluoroscopic guidance)
  '37191', '37192', '37193',
  // EVAR/TEVAR (includes all radiological supervision & interpretation)
  '34701', '34702', '34703', '34704', '34705', '34706',
  '33880', '33881', '33883', '33884', '33886',
  // Peripheral interventions (2026 codes bundle imaging)
  '37254', '37255', '37256', '37257', '37258', '37259', '37260', '37261',
  '37263', '37264', '37265', '37266', '37267', '37268', '37269', '37270',
  '37280', '37281', '37282', '37283', '37284', '37285', '37286', '37287',
  // Device implants
  '33206', '33207', '33208', '33249', '33240', '33274',
  // EP procedures
  '93653', '93654', '93656',
  // Structural
  '93580', '93581', '93582', '93590', '33340', '33361', '33362', '33363', '33364', '33365', '33366',
  // Pericardiocentesis
  '33016', '33017',
  // IABP / MCS
  '33989', '33967', '33990', '33991',
]);

// ==================== ECMO Cannula + Initiation Pairing ====================

/** ECMO initiation codes and their required cannula insertion codes */
export const ecmoInitiationCannulaPairing: Record<string, { cannulaCodes: string[]; description: string }> = {
  '33946': { cannulaCodes: ['33951', '33952'], description: 'ECMO VV initiation requires peripheral cannula insertion (33951 percutaneous or 33952 open)' },
  '33947': { cannulaCodes: ['33951', '33952'], description: 'ECMO VA initiation requires peripheral cannula insertion (33951 percutaneous or 33952 open)' },
};

/** ECMO daily management codes (not currently in the main code sets) */
export const ecmoManagementCodes = new Set([
  '33948',  // ECMO daily management, first day
  '33949',  // ECMO daily management, each subsequent day (pediatric only for percutaneous cannula ≤5)
  '33954',  // ECMO/ECLS daily management, VA, first day
  '33956',  // ECMO/ECLS daily management, VA, subsequent day
  '33958',  // ECMO/ECLS daily management, VV, first day
  '33962',  // ECMO/ECLS daily management, VV, subsequent day
  '33964',  // ECMO/ECLS repositioning
  '33966',  // ECMO/ECLS removal, percutaneous
  '33984',  // ECMO/ECLS removal, open
  '33968',  // IABP removal
]);

// ==================== IABP Code Disambiguation ====================

export const iabpInsertionCodes = new Set(['33967', '33989']);

// ==================== Injection Code Context Rules ====================
// Injection add-on codes (93566-93568) should only be billed when the injection
// provides information BEYOND what the base cath code already evaluates

/** Maps injection codes to cath codes where the injection is redundant */
export const injectionCodeRedundancy: Record<string, { redundantWith: string[]; reason: string }> = {
  '93566': {
    redundantWith: ['93451', '93453', '93456', '93457', '93460', '93461'],
    reason: 'RV/RA injection (93566) may be redundant when the base cath code already includes right heart catheterization with hemodynamic evaluation. Only bill 93566 if a separate RV/RA contrast angiogram was performed beyond the standard hemodynamic assessment.',
  },
  '93568': {
    redundantWith: ['93451', '93456', '93457', '93460', '93461'],
    reason: 'Pulmonary angiography (93568) may be redundant with right heart cath codes that include PA pressure measurement. Only bill 93568 if a separate contrast pulmonary angiogram was performed for a distinct clinical question (e.g., PE evaluation).',
  },
};

// ==================== CTO Documentation Requirements ====================

export const ctoDocumentationRequirements: Record<string, string[]> = {
  '92943': [
    'Confirm chronic total occlusion (>3 months or unknown duration)',
    'Document crossing strategy: antegrade wire escalation, antegrade dissection/re-entry, or subintimal',
    'Record prior PCI attempts if applicable',
    'Document equipment used (microcatheters, specialty wires, re-entry devices)',
    'Report procedure duration and contrast volume',
    'J-CTO score recommended for complexity documentation',
  ],
  '92945': [
    'All documentation from 92943 PLUS:',
    'Document retrograde approach: donor artery used, retrograde wire/microcatheter details',
    'Confirm both antegrade AND retrograde techniques were used',
    'Document reason antegrade-only approach was insufficient',
    'Record retrograde channel used (septal, epicardial)',
    'J-CTO score recommended — 92945 typically applies to J-CTO ≥3 (difficult/very difficult)',
  ],
};

// ==================== Bypass Graft PCI Documentation ====================

export const bypassGraftPCICode = '92937';

export const bypassGraftDocRequirements = [
  'Document graft type: saphenous vein graft (SVG), left internal mammary (LIMA), right internal mammary (RIMA), radial artery, or other',
  'For SVG intervention: document whether distal embolic protection device was used (strongly recommended per guidelines)',
  'If distal protection NOT used for SVG PCI, document clinical rationale for omission',
  'Report native vessel the graft supplies and anastomosis site',
  'Note graft age if known — relevant for treatment strategy',
];

// ==================== Modifier -22 Suggestion Triggers ====================

export const modifier22Triggers: { codes: string[]; condition: string; description: string }[] = [
  {
    codes: ['92943', '92945'],
    condition: 'cto',
    description: 'CTO PCI is inherently complex. Consider modifier -22 if the procedure was substantially more difficult than typical (e.g., J-CTO ≥3, multiple crossing strategies, procedure >3 hours, excessive contrast).',
  },
  {
    codes: ['92920', '92924', '92928', '92930', '92933', '92937', '92941'],
    condition: 'mcs_support',
    description: 'PCI requiring mechanical circulatory support (Impella/IABP) indicates high-risk complexity. Consider modifier -22 with documentation of hemodynamic instability and MCS necessity.',
  },
  {
    codes: ['93653', '93654', '93656'],
    condition: 'complex_ablation',
    description: 'Ablation procedure may warrant modifier -22 if substantially more complex than typical (e.g., multiple ablation targets, redo procedure, unusual anatomy, procedure >6 hours).',
  },
];

// ==================== Unsuccessful PCI ====================

export const unsuccessfulPCICode = '92998';

// ==================== Atherectomy Codes ====================

export const atherectomyCodes = new Set(['92924', '92933']);

export const atherectomyDeviceDocuirements = [
  'Document atherectomy device type: rotational (Rotablator), orbital (Diamondback), laser (excimer), or directional (Silverhawk/TurboHawk)',
  'Report number of runs/passes performed',
  'Document burr size (rotational) or crown size (orbital) used',
  'For laser atherectomy: report catheter size and fluence/rate settings',
  'Document lesion characteristics requiring atherectomy (severe calcification, fibrotic plaque, undilatable lesion)',
];

// ==================== Observation Subsequent Codes ====================

export const observationSubsequentCodes = new Set(['99224', '99225', '99226']);

export function isObservationSubsequentCode(code: string): boolean {
  return observationSubsequentCodes.has(code);
}

// ==================== Temp Pacemaker Bundling ====================
// Temporary pacemaker placement during cath/EP may be bundled

export const tempPacemakerCodes = new Set(['33210', '33211']);

/** Procedures that inherently include temp pacemaker management during the case */
export const tempPacerBundledWith = new Set([
  // TAVR — temp pacer is routinely placed and considered part of the TAVR procedure
  '33361', '33362', '33363', '33364', '33365', '33366',
  // EP ablation — temp pacer access is part of the EP procedure
  '93653', '93654', '93656',
]);

// ==================== Access Site Code Bundling ====================
// Vascular access codes bundled into catheterization procedures

export const accessSiteCodes = new Set(['36000', '36140']);

/** Procedures where vascular access is inherent and not separately billable */
export const accessSiteBundledProcedures = new Set([
  // Diagnostic cath — access is inherent
  '93451', '93452', '93453', '93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461',
  // PCI — access is inherent
  '92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',
  // EP procedures
  '93653', '93654', '93656', '93619', '93620',
  // Device implants
  '33206', '33207', '33208', '33249', '33240', '33274',
  // Structural
  '93580', '93581', '93582', '93590', '33340', '33361', '33362', '33363', '33364', '33365', '33366',
]);

// ==================== Medicare Consult Code Restrictions ====================

export const consultPayerAwareness =
  'Payer alert: Medicare does not reimburse inpatient consultation codes (99251-99255). For Medicare patients, use initial hospital care codes (99221-99223) instead. Most commercial payers and Medicaid DO still pay for consults. Verify the patient\'s insurance before selecting consult vs initial hospital care codes.';

// ==================== Echo + Cath Same-Day Guidance ====================
// When echo interpretation and cardiac cath are performed same day by same physician

export const echoCathSameDayGuidance = {
  echoInterpCodes: new Set(['93306', '93307', '93308', '93303', '93304', '93312', '93314', '93315']),
  cathProcCodes: new Set([
    '93451', '93452', '93453', '93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461',
    '92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945',
  ]),
  guidance: 'Echo interpretation and cardiac catheterization/PCI on the same day for the same patient — if the echo was a distinct diagnostic study (not intraprocedural TEE), the E/M associated with the echo should carry modifier -25. The echo itself is separately billable with -26 (professional component) if interpreted at the hospital.',
};

// ==================== Contrast Echo Indication Codes ====================
// 93352 (contrast echo) requires documented indication

export const contrastEchoCode = '93352';
export const contrastEchoIndications = [
  'Suboptimal endocardial border definition on non-contrast images (≥2 contiguous segments)',
  'LV opacification for accurate EF measurement when standard images are suboptimal',
  'Enhancement of Doppler signals when technically inadequate',
  'Rule out LV thrombus when standard images are inconclusive',
  'Assessment of myocardial perfusion (stress echo only)',
];

// ==================== Limited vs Complete Echo Guidance ====================

export const echoCompletenessCodes = {
  complete: new Set(['93306', '93303']),    // Complete TTE codes
  limited: new Set(['93308', '93304']),     // Limited/follow-up TTE codes
  completeGuidance: 'Complete TTE (93306/93303) requires documentation of all standard views and measurements per ASE guidelines. If only targeted views were obtained, a limited study (93308) may be more appropriate.',
  limitedGuidance: 'Limited/follow-up TTE (93308/93304) is appropriate when: (1) focused assessment of a known condition, (2) targeted views for a specific clinical question, or (3) follow-up of a previously documented finding. If a comprehensive assessment was performed, upgrade to 93306.',
};

// ==================== EP + TEE Same-Day Rules ====================

export const epTEEGuidance = {
  epProcedures: new Set(['93653', '93654', '93656']),
  teeGuided: '93355',   // 3D TEE structural
  teeDiagnostic: new Set(['93312', '93314', '93315']),
  guidance: 'TEE during EP ablation: Use 93355 (3D TEE for structural guidance) if TEE was used for intraprocedural guidance during ablation (e.g., AF ablation with TEE for transseptal puncture and LA anatomy). If TEE was a separate diagnostic study (e.g., to rule out LAA thrombus pre-ablation), use 93312/93314 with documentation of the distinct diagnostic indication.',
};

// ==================== Watchman (LAA Closure) Specific Rules ====================

export const watchmanCode = '33340';

/** Watchman requires Q0 modifier (CMS Coverage with Evidence Development) */
export const watchmanModifierQ0 = {
  modifier: 'Q0',
  reason: 'LAA closure (Watchman) requires modifier Q0 — CMS Coverage with Evidence Development (CED). This procedure is covered under NCD 20.34 with the condition that it is furnished in the context of an approved clinical study or CED registry.',
};

/** Watchman requires dual diagnosis codes */
export const watchmanDiagnosisRequirements = {
  primaryRequired: 'I48',        // Atrial fibrillation — any I48.x
  primaryExcluded: 'I48.20',     // I48.20 (chronic AF, unspecified) is NOT accepted
  secondaryRequired: 'Z00.6',    // Encounter for examination for normal comparison and control in clinical research program
  guidance: 'Watchman (33340) requires two diagnosis codes: (1) Primary: Atrial fibrillation (I48.x, but NEVER I48.20), and (2) Secondary: Z00.6 (clinical research/CED enrollment). Missing either diagnosis or using I48.20 will result in claim denial.',
};

/** ICE (93662) with modifier -26 is standard with Watchman */
export const watchmanICEGuidance = {
  iceCode: '93662',
  modifier: '-26',
  guidance: 'Intracardiac echocardiography (93662) with modifier -26 (professional component) is routinely performed with Watchman LAA closure for device positioning and deployment guidance. Ensure 93662-26 is captured as a separate billable component.',
};
