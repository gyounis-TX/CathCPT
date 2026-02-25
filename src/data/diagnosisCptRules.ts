// ICD-10 ↔ CPT Medical Necessity Cross-Reference Rules
// Validates that procedure codes are supported by appropriate diagnosis codes
// Based on Medicare LCD/NCD criteria and standard cardiology coding practices

export interface DiagnosisCptRule {
  id: string;
  name: string;
  cptCodes: string[];
  cptMatch?: (code: string) => boolean;  // Alternative: function-based matcher
  icd10Prefixes: string[];               // Required ICD-10 prefixes (any match = valid)
  severity: 'error' | 'warning';
  message: string;
}

export const diagnosisCptRules: DiagnosisCptRule[] = [
  // === PCI (elective) ===
  {
    id: 'pci-cad-diagnosis',
    name: 'PCI requires CAD/ACS diagnosis',
    cptCodes: ['92920', '92924', '92928', '92930', '92933', '92937', '92943', '92945'],
    icd10Prefixes: ['I25', 'I20', 'I21', 'I22', 'I24'],
    severity: 'error',
    message: 'PCI codes require a coronary artery disease or acute coronary syndrome diagnosis (I20-I25). Missing diagnosis is a top reason for PCI claim denial.'
  },

  // === Acute MI PCI (more specific — must be STEMI/NSTEMI) ===
  {
    id: 'acute-mi-pci-diagnosis',
    name: 'Acute MI PCI requires STEMI/NSTEMI diagnosis',
    cptCodes: ['92941'],
    icd10Prefixes: ['I21', 'I22'],
    severity: 'error',
    message: 'Acute MI PCI (92941) requires an acute myocardial infarction diagnosis (I21.x STEMI/NSTEMI or I22.x subsequent MI). Chronic CAD (I25.x) does not support 92941.'
  },

  // === Diagnostic Cath ===
  {
    id: 'diag-cath-cardiac-diagnosis',
    name: 'Diagnostic cath requires cardiac indication',
    cptCodes: ['93451', '93452', '93453', '93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'],
    icd10Prefixes: [
      'I25', 'I20', 'I21', 'I22', 'I24',  // CAD/ACS
      'I50',                                  // Heart failure
      'I34', 'I35', 'I36', 'I37',           // Valve disorders
      'I42', 'I43',                           // Cardiomyopathy
      'I47', 'I48', 'I49',                   // Arrhythmias
      'Q20', 'Q21', 'Q22', 'Q23', 'Q24',    // Congenital heart
      'R00', 'R07', 'R55', 'R94.31'          // Symptoms (palpitations, chest pain, syncope, abnormal ECG)
    ],
    severity: 'warning',
    message: 'Diagnostic cardiac catheterization should be supported by a cardiac diagnosis. Verify ICD-10 code supports medical necessity.'
  },

  // === TAVR ===
  {
    id: 'tavr-aortic-stenosis',
    name: 'TAVR requires aortic stenosis diagnosis',
    cptCodes: ['33361', '33362', '33363', '33364', '33365', '33366'],
    icd10Prefixes: ['I35.0', 'I35.2', 'I06.0', 'I06.2'],
    severity: 'error',
    message: 'TAVR requires an aortic stenosis diagnosis (I35.0/I35.2 nonrheumatic, I06.0/I06.2 rheumatic). Missing diagnosis will result in claim denial.'
  },

  // === Pacemaker ===
  {
    id: 'pacemaker-bradycardia',
    name: 'Pacemaker requires bradycardia/conduction diagnosis',
    cptCodes: ['33206', '33207', '33208', '33212', '33213'],
    icd10Prefixes: ['I44', 'I45', 'I49.5', 'R00.1'],
    severity: 'error',
    message: 'Pacemaker implant requires a bradycardia or conduction disorder diagnosis (I44.x AV block, I45.x conduction disorder, I49.5 sick sinus, R00.1 bradycardia).'
  },

  // === Leadless Pacemaker ===
  {
    id: 'leadless-pm-diagnosis',
    name: 'Leadless pacemaker requires bradycardia diagnosis',
    cptCodes: ['33274', '33275'],
    icd10Prefixes: ['I44', 'I45', 'I49.5', 'R00.1'],
    severity: 'error',
    message: 'Leadless pacemaker requires a bradycardia or conduction disorder diagnosis.'
  },

  // === ICD ===
  {
    id: 'icd-vt-vf-cmp',
    name: 'ICD requires VT/VF or cardiomyopathy diagnosis',
    cptCodes: ['33249', '33230', '33231', '33240', '33262', '33263', '33264'],
    icd10Prefixes: ['I42', 'I43', 'I47.2', 'I49.01', 'I46', 'I50'],
    severity: 'error',
    message: 'ICD implant requires ventricular arrhythmia (I47.2 VT, I49.01 VF), cardiomyopathy (I42.x), cardiac arrest (I46.x), or heart failure (I50.x) diagnosis.'
  },

  // === S-ICD ===
  {
    id: 'sicd-vt-vf-diagnosis',
    name: 'S-ICD requires VT/VF or cardiomyopathy',
    cptCodes: ['33270', '33271', '33272', '33273'],
    icd10Prefixes: ['I42', 'I43', 'I47.2', 'I49.01', 'I46', 'I50'],
    severity: 'error',
    message: 'S-ICD requires a ventricular arrhythmia, cardiomyopathy, or heart failure diagnosis.'
  },

  // === CRT ===
  {
    id: 'crt-hf-diagnosis',
    name: 'CRT requires heart failure diagnosis',
    cptCodes: ['33224', '33225', '33226'],
    icd10Prefixes: ['I50', 'I42', 'I43', 'I25.5'],
    severity: 'error',
    message: 'CRT implant requires heart failure (I50.x) or cardiomyopathy (I42.x) diagnosis with reduced EF documentation.'
  },

  // === EP Ablation ===
  {
    id: 'ep-ablation-arrhythmia',
    name: 'EP ablation requires arrhythmia diagnosis',
    cptCodes: ['93653', '93654', '93655', '93656', '93657'],
    icd10Prefixes: ['I47', 'I48', 'I49'],
    severity: 'error',
    message: 'EP ablation requires an arrhythmia diagnosis (I47.x paroxysmal tachycardia, I48.x atrial fibrillation/flutter, I49.x other arrhythmias).'
  },

  // === Cardioversion ===
  {
    id: 'cardioversion-arrhythmia',
    name: 'Cardioversion requires arrhythmia diagnosis',
    cptCodes: ['92960', '92961'],
    icd10Prefixes: ['I48', 'I47'],
    severity: 'warning',
    message: 'Cardioversion should be supported by an arrhythmia diagnosis (I48.x atrial fibrillation/flutter, I47.x paroxysmal tachycardia).'
  },

  // === Echo (broad — rarely denied but should have cardiac indication) ===
  {
    id: 'echo-cardiac-indication',
    name: 'Echo requires cardiac indication',
    cptCodes: ['93303', '93304', '93306', '93307', '93308', '93312', '93314', '93315', '93350', '93351', '93355'],
    icd10Prefixes: [
      'I',                                    // All circulatory diseases
      'R00', 'R01', 'R06.0', 'R07', 'R55',  // Cardiac symptoms
      'R94.31',                                // Abnormal ECG
      'Q20', 'Q21', 'Q22', 'Q23', 'Q24', 'Q25', 'Q26', 'Q27', 'Q28',  // Congenital
      'Z01.81', 'Z13.6', 'Z82.4', 'Z87.7'   // Screening/history
    ],
    severity: 'warning',
    message: 'Echocardiogram should be supported by a cardiac diagnosis or symptom code. Verify ICD-10 supports medical necessity.'
  },

  // === Structural (ASD/PFO/VSD closure) ===
  {
    id: 'structural-closure-diagnosis',
    name: 'Structural closure requires septal defect diagnosis',
    cptCodes: ['93580', '93581', '93582', '93583'],
    icd10Prefixes: ['Q21', 'I51.0', 'Q25.0'],
    severity: 'error',
    message: 'Structural closure (ASD/PFO/VSD) requires a septal defect diagnosis (Q21.x congenital, I51.0 acquired ASD).'
  },

  // === Mitral Valve Repair ===
  {
    id: 'mitral-repair-diagnosis',
    name: 'Mitral valve repair requires mitral valve disorder',
    cptCodes: ['33418', '33419'],
    icd10Prefixes: ['I34', 'I05', 'I08'],
    severity: 'error',
    message: 'Mitral valve repair requires a mitral valve disorder diagnosis (I34.x nonrheumatic, I05.x rheumatic).'
  },

  // === Tricuspid Valve Repair ===
  {
    id: 'ttvr-diagnosis',
    name: 'TTVR requires tricuspid valve disorder',
    cptCodes: ['0569T', '0570T'],
    icd10Prefixes: ['I36', 'I07', 'Q22.4', 'Q22.8'],
    severity: 'error',
    message: 'Transcatheter tricuspid valve repair requires a tricuspid valve disorder diagnosis (I36.x nonrheumatic, I07.x rheumatic, Q22.4 congenital).'
  },

  // === MCS / ECMO ===
  {
    id: 'mcs-shock-hf-diagnosis',
    name: 'MCS/ECMO requires shock or heart failure diagnosis',
    cptCodes: ['33990', '33991', '33995', '33992', '33993', '33946', '33947', '33948', '33949', '33951', '33952', '33989'],
    icd10Prefixes: ['I50', 'I21', 'I46', 'R57', 'I40', 'I51.4', 'T86.2'],
    severity: 'error',
    message: 'Mechanical circulatory support requires cardiogenic shock (R57.0), heart failure (I50.x), acute MI (I21.x), or cardiac arrest (I46.x) diagnosis.'
  },

  // === Peripheral Vascular Intervention ===
  {
    id: 'peripheral-pvd-diagnosis',
    name: 'Peripheral intervention requires PVD diagnosis',
    cptCodes: [],
    cptMatch: (code: string) => {
      const num = parseInt(code, 10);
      return !isNaN(num) && num >= 37184 && num <= 37299;
    },
    icd10Prefixes: ['I70', 'I73', 'I74', 'I77', 'I80', 'I82', 'I87'],
    severity: 'warning',
    message: 'Peripheral vascular intervention should be supported by a vascular disease diagnosis (I70.x atherosclerosis, I73.x PVD, I74.x embolism).'
  },

  // === EVAR / TEVAR ===
  {
    id: 'evar-aortic-diagnosis',
    name: 'EVAR/TEVAR requires aortic diagnosis',
    cptCodes: [
      '34701', '34702', '34703', '34704', '34705', '34706', '34707', '34708', '34709',
      '34710', '34711', '34712', '34713', '34714',
      '33880', '33881', '33883', '33884', '33886', '33889', '33891'
    ],
    icd10Prefixes: ['I71', 'I77.0', 'I77.1'],
    severity: 'error',
    message: 'Endovascular aortic repair requires an aortic aneurysm (I71.x) or aortic dissection diagnosis.'
  },
];

/**
 * Validate that a CPT code is supported by at least one appropriate diagnosis.
 * Returns null if no rule applies to the code or if diagnosis is valid.
 */
export function validateDiagnosisCpt(
  cptCode: string,
  diagnoses: string[]
): { ruleId: string; severity: 'error' | 'warning'; message: string } | null {
  if (!diagnoses || diagnoses.length === 0) return null;

  for (const rule of diagnosisCptRules) {
    const applies = rule.cptMatch
      ? rule.cptMatch(cptCode)
      : rule.cptCodes.includes(cptCode);

    if (!applies) continue;

    // Check if any diagnosis matches the required prefixes
    const hasMatch = diagnoses.some(dx =>
      rule.icd10Prefixes.some(prefix => dx.startsWith(prefix))
    );

    if (!hasMatch) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message
      };
    }

    // Diagnosis is valid for this rule
    return null;
  }

  // No rule applies to this CPT code — no issue
  return null;
}
