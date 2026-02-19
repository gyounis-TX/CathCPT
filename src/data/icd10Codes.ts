// Comprehensive Cardiology Inpatient ICD-10 Codes for Rounds Diagnosis Entry
// Organized into 3 categories with subcategories:
//   Primary Cardiac (~100 codes), Comorbidities (~500 codes), Post-Procedure Status (~30 codes)

export interface ICD10Code {
  code: string;
  description: string;
  shortLabel: string;
  category: 'primary' | 'comorbid' | 'postProcedure';
  subcategory: string;
}

export interface ICD10Subcategory {
  id: string;
  label: string;
  category: 'primary' | 'comorbid' | 'postProcedure';
  codes: ICD10Code[];
}

// ============================================================================
// PRIMARY CARDIAC CONDITIONS (~100 codes)
// ============================================================================

const primaryCoronary: ICD10Code[] = [
  { code: 'I21.01', description: 'ST elevation myocardial infarction involving left anterior descending coronary artery', shortLabel: 'STEMI LAD', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.02', description: 'ST elevation myocardial infarction involving left circumflex coronary artery', shortLabel: 'STEMI LCx', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.09', description: 'ST elevation myocardial infarction involving other coronary artery of anterior wall', shortLabel: 'STEMI anterior other', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.11', description: 'ST elevation myocardial infarction involving right coronary artery', shortLabel: 'STEMI RCA', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.19', description: 'ST elevation myocardial infarction involving other coronary artery of inferior wall', shortLabel: 'STEMI inferior other', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.21', description: 'ST elevation myocardial infarction involving left main coronary artery', shortLabel: 'STEMI left main', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.29', description: 'ST elevation myocardial infarction involving other sites', shortLabel: 'STEMI other', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.3', description: 'ST elevation myocardial infarction of unspecified site', shortLabel: 'STEMI unspecified', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.4', description: 'Non-ST elevation (NSTEMI) myocardial infarction', shortLabel: 'NSTEMI', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', shortLabel: 'AMI unspecified', category: 'primary', subcategory: 'coronary' },
  { code: 'I21.A1', description: 'Myocardial infarction type 2', shortLabel: 'MI type 2', category: 'primary', subcategory: 'coronary' },
  { code: 'I22.0', description: 'Subsequent ST elevation myocardial infarction of anterior wall', shortLabel: 'Subsequent STEMI ant', category: 'primary', subcategory: 'coronary' },
  { code: 'I22.1', description: 'Subsequent ST elevation myocardial infarction of inferior wall', shortLabel: 'Subsequent STEMI inf', category: 'primary', subcategory: 'coronary' },
  { code: 'I24.0', description: 'Acute coronary thrombosis not resulting in myocardial infarction', shortLabel: 'Acute coronary thrombosis', category: 'primary', subcategory: 'coronary' },
  { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris', shortLabel: 'CAD native', category: 'primary', subcategory: 'coronary' },
  { code: 'I25.110', description: 'Atherosclerotic heart disease of native coronary artery with unstable angina pectoris', shortLabel: 'Unstable angina', category: 'primary', subcategory: 'coronary' },
  { code: 'I25.111', description: 'Atherosclerotic heart disease of native coronary artery with angina pectoris with documented spasm', shortLabel: 'Vasospastic angina', category: 'primary', subcategory: 'coronary' },
  { code: 'I25.118', description: 'Atherosclerotic heart disease of native coronary artery with other forms of angina pectoris', shortLabel: 'Stable angina', category: 'primary', subcategory: 'coronary' },
  { code: 'I25.2', description: 'Old myocardial infarction', shortLabel: 'Old MI', category: 'primary', subcategory: 'coronary' },
  { code: 'I25.5', description: 'Ischemic cardiomyopathy', shortLabel: 'Ischemic CM', category: 'primary', subcategory: 'coronary' },
  { code: 'I25.700', description: 'Atherosclerosis of coronary artery bypass graft(s), unspecified, with unstable angina pectoris', shortLabel: 'Graft disease unstable', category: 'primary', subcategory: 'coronary' },
  { code: 'I25.810', description: 'Atherosclerosis of coronary artery bypass graft(s) without angina pectoris', shortLabel: 'Graft disease', category: 'primary', subcategory: 'coronary' },
];

const primaryHeartFailure: ICD10Code[] = [
  { code: 'I50.1', description: 'Left ventricular failure, unspecified', shortLabel: 'LV failure', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.20', description: 'Unspecified systolic (congestive) heart failure', shortLabel: 'Systolic HF unspec', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.21', description: 'Acute systolic (congestive) heart failure', shortLabel: 'Systolic HF acute', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.22', description: 'Chronic systolic (congestive) heart failure', shortLabel: 'Systolic HF chronic', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.23', description: 'Acute on chronic systolic (congestive) heart failure', shortLabel: 'Systolic HF acute/chronic', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.30', description: 'Unspecified diastolic (congestive) heart failure', shortLabel: 'Diastolic HF unspec', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.31', description: 'Acute diastolic (congestive) heart failure', shortLabel: 'Diastolic HF acute', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.32', description: 'Chronic diastolic (congestive) heart failure', shortLabel: 'Diastolic HF chronic', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.33', description: 'Acute on chronic diastolic (congestive) heart failure', shortLabel: 'Diastolic HF acute/chronic', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.40', description: 'Unspecified combined systolic and diastolic heart failure', shortLabel: 'Combined HF unspec', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.41', description: 'Acute combined systolic and diastolic heart failure', shortLabel: 'Combined HF acute', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.42', description: 'Chronic combined systolic and diastolic heart failure', shortLabel: 'Combined HF chronic', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.43', description: 'Acute on chronic combined systolic and diastolic heart failure', shortLabel: 'Combined HF acute/chronic', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.810', description: 'Right heart failure, unspecified', shortLabel: 'Right HF', category: 'primary', subcategory: 'heartFailure' },
  { code: 'I50.9', description: 'Heart failure, unspecified', shortLabel: 'HF unspecified', category: 'primary', subcategory: 'heartFailure' },
];

const primaryArrhythmia: ICD10Code[] = [
  { code: 'I48.0', description: 'Paroxysmal atrial fibrillation', shortLabel: 'AFib paroxysmal', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I48.11', description: 'Longstanding persistent atrial fibrillation', shortLabel: 'AFib longstanding', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I48.19', description: 'Other persistent atrial fibrillation', shortLabel: 'AFib persistent', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I48.20', description: 'Chronic atrial fibrillation, unspecified', shortLabel: 'AFib chronic', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I48.21', description: 'Permanent atrial fibrillation', shortLabel: 'AFib permanent', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I48.91', description: 'Unspecified atrial fibrillation', shortLabel: 'AFib unspecified', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I48.3', description: 'Typical atrial flutter', shortLabel: 'AFlutter typical', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I48.4', description: 'Atypical atrial flutter', shortLabel: 'AFlutter atypical', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I48.92', description: 'Unspecified atrial flutter', shortLabel: 'AFlutter unspecified', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I47.1', description: 'Supraventricular tachycardia', shortLabel: 'SVT', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I47.2', description: 'Ventricular tachycardia', shortLabel: 'VT', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I47.20', description: 'Ventricular tachycardia, unspecified', shortLabel: 'VT unspecified', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I49.01', description: 'Ventricular fibrillation', shortLabel: 'VFib', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'I49.5', description: 'Sick sinus syndrome', shortLabel: 'Sick sinus', category: 'primary', subcategory: 'arrhythmia' },
  { code: 'R00.1', description: 'Bradycardia, unspecified', shortLabel: 'Bradycardia', category: 'primary', subcategory: 'arrhythmia' },
];

const primaryHeartBlock: ICD10Code[] = [
  { code: 'I44.0', description: 'Atrioventricular block, first degree', shortLabel: '1st degree block', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I44.1', description: 'Atrioventricular block, second degree', shortLabel: '2nd degree block', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I44.10', description: 'Atrioventricular block, second degree, Mobitz type I', shortLabel: 'Mobitz I', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I44.11', description: 'Atrioventricular block, second degree, Mobitz type II', shortLabel: 'Mobitz II', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I44.2', description: 'Atrioventricular block, complete', shortLabel: '3rd degree block', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I44.30', description: 'Unspecified atrioventricular block', shortLabel: 'AV block unspec', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I45.0', description: 'Right fascicular block', shortLabel: 'RBBB', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I45.10', description: 'Unspecified right bundle-branch block', shortLabel: 'RBBB unspec', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I44.4', description: 'Left anterior fascicular block', shortLabel: 'LAFB', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I44.5', description: 'Left posterior fascicular block', shortLabel: 'LPFB', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I44.60', description: 'Unspecified fascicular block', shortLabel: 'Bifascicular block', category: 'primary', subcategory: 'heartBlock' },
  { code: 'I44.7', description: 'Left bundle-branch block, unspecified', shortLabel: 'LBBB', category: 'primary', subcategory: 'heartBlock' },
];

const primaryValvular: ICD10Code[] = [
  { code: 'I35.0', description: 'Nonrheumatic aortic (valve) stenosis', shortLabel: 'Aortic stenosis', category: 'primary', subcategory: 'valvular' },
  { code: 'I35.1', description: 'Nonrheumatic aortic (valve) insufficiency', shortLabel: 'Aortic regurg', category: 'primary', subcategory: 'valvular' },
  { code: 'I35.2', description: 'Nonrheumatic aortic (valve) stenosis with insufficiency', shortLabel: 'Mixed aortic disease', category: 'primary', subcategory: 'valvular' },
  { code: 'I34.0', description: 'Nonrheumatic mitral (valve) insufficiency', shortLabel: 'Mitral regurg', category: 'primary', subcategory: 'valvular' },
  { code: 'I34.2', description: 'Nonrheumatic mitral (valve) stenosis', shortLabel: 'Mitral stenosis', category: 'primary', subcategory: 'valvular' },
  { code: 'I05.0', description: 'Rheumatic mitral stenosis', shortLabel: 'Rheumatic MS', category: 'primary', subcategory: 'valvular' },
  { code: 'I34.1', description: 'Nonrheumatic mitral (valve) prolapse', shortLabel: 'MVP', category: 'primary', subcategory: 'valvular' },
  { code: 'I36.1', description: 'Nonrheumatic tricuspid (valve) insufficiency', shortLabel: 'Tricuspid regurg', category: 'primary', subcategory: 'valvular' },
  { code: 'I36.0', description: 'Nonrheumatic tricuspid (valve) stenosis', shortLabel: 'Tricuspid stenosis', category: 'primary', subcategory: 'valvular' },
  { code: 'I37.0', description: 'Nonrheumatic pulmonary valve stenosis', shortLabel: 'Pulmonic stenosis', category: 'primary', subcategory: 'valvular' },
  { code: 'I37.1', description: 'Nonrheumatic pulmonary valve insufficiency', shortLabel: 'Pulmonic regurg', category: 'primary', subcategory: 'valvular' },
  { code: 'I38', description: 'Endocarditis, valve unspecified', shortLabel: 'Endocarditis unspec', category: 'primary', subcategory: 'valvular' },
  { code: 'I08.0', description: 'Rheumatic disorders of both mitral and aortic valves', shortLabel: 'Mitral + aortic disease', category: 'primary', subcategory: 'valvular' },
  { code: 'I35.8', description: 'Other nonrheumatic aortic valve disorders', shortLabel: 'Bicuspid aortic valve', category: 'primary', subcategory: 'valvular' },
  { code: 'I34.8', description: 'Other nonrheumatic mitral valve disorders', shortLabel: 'Mitral annular calc', category: 'primary', subcategory: 'valvular' },
];

const primaryCardiomyopathy: ICD10Code[] = [
  { code: 'I42.0', description: 'Dilated cardiomyopathy', shortLabel: 'Dilated CM', category: 'primary', subcategory: 'cardiomyopathy' },
  { code: 'I42.1', description: 'Obstructive hypertrophic cardiomyopathy', shortLabel: 'HOCM', category: 'primary', subcategory: 'cardiomyopathy' },
  { code: 'I42.2', description: 'Other hypertrophic cardiomyopathy', shortLabel: 'HCM non-obstructive', category: 'primary', subcategory: 'cardiomyopathy' },
  { code: 'I42.5', description: 'Other restrictive cardiomyopathy', shortLabel: 'Restrictive CM', category: 'primary', subcategory: 'cardiomyopathy' },
  { code: 'I42.7', description: 'Cardiomyopathy due to drug and external agent', shortLabel: 'Toxic CM', category: 'primary', subcategory: 'cardiomyopathy' },
  { code: 'I42.8', description: 'Other cardiomyopathies', shortLabel: 'Other CM', category: 'primary', subcategory: 'cardiomyopathy' },
  { code: 'I42.9', description: 'Cardiomyopathy, unspecified', shortLabel: 'CM unspecified', category: 'primary', subcategory: 'cardiomyopathy' },
  { code: 'I51.81', description: 'Takotsubo syndrome', shortLabel: 'Takotsubo', category: 'primary', subcategory: 'cardiomyopathy' },
];

const primaryPericardial: ICD10Code[] = [
  { code: 'I30.0', description: 'Acute nonspecific idiopathic pericarditis', shortLabel: 'Acute pericarditis', category: 'primary', subcategory: 'pericardial' },
  { code: 'I30.9', description: 'Acute pericarditis, unspecified', shortLabel: 'Pericarditis unspec', category: 'primary', subcategory: 'pericardial' },
  { code: 'I31.3', description: 'Pericardial effusion (noninflammatory)', shortLabel: 'Pericardial effusion', category: 'primary', subcategory: 'pericardial' },
  { code: 'I31.4', description: 'Cardiac tamponade', shortLabel: 'Tamponade', category: 'primary', subcategory: 'pericardial' },
  { code: 'I31.1', description: 'Chronic constrictive pericarditis', shortLabel: 'Constrictive pericarditis', category: 'primary', subcategory: 'pericardial' },
];

const primaryOtherCardiac: ICD10Code[] = [
  { code: 'I33.0', description: 'Acute and subacute infective endocarditis', shortLabel: 'Infective endocarditis', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I40.9', description: 'Acute myocarditis, unspecified', shortLabel: 'Myocarditis', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I27.0', description: 'Primary pulmonary hypertension', shortLabel: 'Primary pulm HTN', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I27.20', description: 'Pulmonary hypertension, unspecified', shortLabel: 'Pulm HTN unspec', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I27.21', description: 'Secondary pulmonary arterial hypertension', shortLabel: 'Secondary pulm HTN', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I27.82', description: 'Chronic pulmonary embolism', shortLabel: 'Chronic PE', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I46.9', description: 'Cardiac arrest, cause unspecified', shortLabel: 'Cardiac arrest', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I46.2', description: 'Cardiac arrest due to underlying cardiac condition', shortLabel: 'Cardiac arrest (cardiac)', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'R57.0', description: 'Cardiogenic shock', shortLabel: 'Cardiogenic shock', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I71.00', description: 'Dissection of unspecified site of aorta', shortLabel: 'Aortic dissection', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I71.01', description: 'Dissection of thoracic aorta', shortLabel: 'Thoracic dissection', category: 'primary', subcategory: 'otherCardiac' },
  { code: 'I26.99', description: 'Other pulmonary embolism without acute cor pulmonale', shortLabel: 'Acute PE', category: 'primary', subcategory: 'otherCardiac' },
];

// ============================================================================
// COMORBID CONDITIONS (~500 codes)
// ============================================================================

const comorbidHypertension: ICD10Code[] = [
  { code: 'I10', description: 'Essential (primary) hypertension', shortLabel: 'HTN', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I11.0', description: 'Hypertensive heart disease with heart failure', shortLabel: 'HTN heart disease w/ HF', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I11.9', description: 'Hypertensive heart disease without heart failure', shortLabel: 'HTN heart disease', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I12.0', description: 'Hypertensive chronic kidney disease with stage 5 CKD or ESRD', shortLabel: 'HTN + CKD 5/ESRD', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I12.9', description: 'Hypertensive chronic kidney disease with stage 1-4 CKD', shortLabel: 'HTN + CKD', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I13.0', description: 'Hypertensive heart and chronic kidney disease with heart failure and stage 1-4 CKD', shortLabel: 'HTN + HF + CKD', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I13.10', description: 'Hypertensive heart and CKD without HF, with stage 1-4 CKD', shortLabel: 'HTN heart + CKD', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I13.2', description: 'Hypertensive heart and CKD with HF and stage 5 CKD or ESRD', shortLabel: 'HTN + HF + ESRD', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I15.0', description: 'Renovascular hypertension', shortLabel: 'Renovascular HTN', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I15.8', description: 'Other secondary hypertension', shortLabel: 'Secondary HTN', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I16.0', description: 'Hypertensive urgency', shortLabel: 'HTN urgency', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I16.1', description: 'Hypertensive emergency', shortLabel: 'HTN emergency', category: 'comorbid', subcategory: 'hypertension' },
  { code: 'I16.9', description: 'Hypertensive crisis, unspecified', shortLabel: 'HTN crisis', category: 'comorbid', subcategory: 'hypertension' },
];

const comorbidDiabetes: ICD10Code[] = [
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', shortLabel: 'DM2', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', shortLabel: 'DM2 hyperglycemia', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.21', description: 'Type 2 diabetes mellitus with diabetic nephropathy', shortLabel: 'DM2 nephropathy', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.22', description: 'Type 2 diabetes mellitus with diabetic chronic kidney disease', shortLabel: 'DM2 + CKD', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.40', description: 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified', shortLabel: 'DM2 neuropathy', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.42', description: 'Type 2 diabetes mellitus with diabetic polyneuropathy', shortLabel: 'DM2 polyneuropathy', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.311', description: 'Type 2 diabetes mellitus with unspecified diabetic retinopathy with macular edema', shortLabel: 'DM2 retinopathy', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.51', description: 'Type 2 diabetes mellitus with diabetic peripheral angiopathy without gangrene', shortLabel: 'DM2 PVD', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.59', description: 'Type 2 diabetes mellitus with other circulatory complications', shortLabel: 'DM2 circulatory', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.69', description: 'Type 2 diabetes mellitus with other specified complication', shortLabel: 'DM2 other complication', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E11.8', description: 'Type 2 diabetes mellitus with unspecified complications', shortLabel: 'DM2 unspec complications', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', shortLabel: 'DM1', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E10.65', description: 'Type 1 diabetes mellitus with hyperglycemia', shortLabel: 'DM1 hyperglycemia', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E10.21', description: 'Type 1 diabetes mellitus with diabetic nephropathy', shortLabel: 'DM1 nephropathy', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E10.22', description: 'Type 1 diabetes mellitus with diabetic chronic kidney disease', shortLabel: 'DM1 + CKD', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E10.40', description: 'Type 1 diabetes mellitus with diabetic neuropathy, unspecified', shortLabel: 'DM1 neuropathy', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E13.9', description: 'Other specified diabetes mellitus without complications', shortLabel: 'Other DM', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'E08.9', description: 'Diabetes mellitus due to underlying condition without complications', shortLabel: 'Secondary DM', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'R73.03', description: 'Prediabetes', shortLabel: 'Prediabetes', category: 'comorbid', subcategory: 'diabetes' },
  { code: 'Z79.4', description: 'Long term (current) use of insulin', shortLabel: 'Insulin use', category: 'comorbid', subcategory: 'diabetes' },
];

const comorbidHyperlipidemia: ICD10Code[] = [
  { code: 'E78.00', description: 'Pure hypercholesterolemia, unspecified', shortLabel: 'Hypercholesterolemia', category: 'comorbid', subcategory: 'hyperlipidemia' },
  { code: 'E78.01', description: 'Familial hypercholesterolemia', shortLabel: 'Familial HLD', category: 'comorbid', subcategory: 'hyperlipidemia' },
  { code: 'E78.1', description: 'Pure hyperglyceridemia', shortLabel: 'Hypertriglyceridemia', category: 'comorbid', subcategory: 'hyperlipidemia' },
  { code: 'E78.2', description: 'Mixed hyperlipidemia', shortLabel: 'Mixed HLD', category: 'comorbid', subcategory: 'hyperlipidemia' },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified', shortLabel: 'HLD unspecified', category: 'comorbid', subcategory: 'hyperlipidemia' },
  { code: 'E78.41', description: 'Elevated lipoprotein(a)', shortLabel: 'Elevated Lp(a)', category: 'comorbid', subcategory: 'hyperlipidemia' },
  { code: 'Z79.899', description: 'Other long term (current) drug therapy', shortLabel: 'Statin use', category: 'comorbid', subcategory: 'hyperlipidemia' },
];

const comorbidCKD: ICD10Code[] = [
  { code: 'N18.1', description: 'Chronic kidney disease, stage 1', shortLabel: 'CKD 1', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N18.2', description: 'Chronic kidney disease, stage 2 (mild)', shortLabel: 'CKD 2', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N18.30', description: 'Chronic kidney disease, stage 3 unspecified', shortLabel: 'CKD 3', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N18.31', description: 'Chronic kidney disease, stage 3a', shortLabel: 'CKD 3a', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N18.32', description: 'Chronic kidney disease, stage 3b', shortLabel: 'CKD 3b', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)', shortLabel: 'CKD 4', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N18.5', description: 'Chronic kidney disease, stage 5', shortLabel: 'CKD 5', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N18.6', description: 'End stage renal disease', shortLabel: 'ESRD', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N18.9', description: 'Chronic kidney disease, unspecified', shortLabel: 'CKD unspecified', category: 'comorbid', subcategory: 'ckd' },
  { code: 'Z99.2', description: 'Dependence on renal dialysis', shortLabel: 'Dialysis status', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N17.9', description: 'Acute kidney failure, unspecified', shortLabel: 'AKI', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N17.0', description: 'Acute kidney failure with tubular necrosis', shortLabel: 'AKI tubular necrosis', category: 'comorbid', subcategory: 'ckd' },
  { code: 'N17.8', description: 'Other acute kidney failure', shortLabel: 'AKI other', category: 'comorbid', subcategory: 'ckd' },
];

const comorbidPulmonary: ICD10Code[] = [
  { code: 'J44.0', description: 'COPD with (acute) lower respiratory infection', shortLabel: 'COPD + infection', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J44.1', description: 'COPD with acute exacerbation', shortLabel: 'COPD exacerbation', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J44.9', description: 'COPD, unspecified', shortLabel: 'COPD', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J45.20', description: 'Mild intermittent asthma, uncomplicated', shortLabel: 'Asthma mild', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J45.40', description: 'Moderate persistent asthma, uncomplicated', shortLabel: 'Asthma moderate', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J45.50', description: 'Severe persistent asthma, uncomplicated', shortLabel: 'Asthma severe', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'I26.02', description: 'Saddle embolus of pulmonary artery with acute cor pulmonale', shortLabel: 'Saddle PE', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'I26.09', description: 'Other pulmonary embolism with acute cor pulmonale', shortLabel: 'PE with cor pulmonale', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'I26.90', description: 'Septic pulmonary embolism without acute cor pulmonale', shortLabel: 'Septic PE', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'I26.92', description: 'Saddle embolus of pulmonary artery without acute cor pulmonale', shortLabel: 'Saddle PE (no cor pulmonale)', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'I26.99', description: 'Other pulmonary embolism without acute cor pulmonale', shortLabel: 'PE acute', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J90', description: 'Pleural effusion, not elsewhere classified', shortLabel: 'Pleural effusion', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J91.0', description: 'Malignant pleural effusion', shortLabel: 'Malignant effusion', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J84.10', description: 'Pulmonary fibrosis, unspecified', shortLabel: 'Pulm fibrosis', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J96.00', description: 'Acute respiratory failure, unspecified whether with hypoxia or hypercapnia', shortLabel: 'Resp failure acute', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J96.01', description: 'Acute respiratory failure with hypoxia', shortLabel: 'Resp failure hypoxic', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J96.02', description: 'Acute respiratory failure with hypercapnia', shortLabel: 'Resp failure hypercapnic', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J96.10', description: 'Chronic respiratory failure, unspecified', shortLabel: 'Chronic resp failure', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J96.20', description: 'Acute and chronic respiratory failure, unspecified', shortLabel: 'Acute on chronic resp fail', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J80', description: 'Acute respiratory distress syndrome', shortLabel: 'ARDS', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', shortLabel: 'Pneumonia', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J95.821', description: 'Acute postprocedural respiratory failure', shortLabel: 'Postop resp failure', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'Z99.11', description: 'Dependence on respirator [ventilator] status', shortLabel: 'Ventilator status', category: 'comorbid', subcategory: 'pulmonary' },
  { code: 'J95.04', description: 'Mendelson syndrome (aspiration pneumonitis)', shortLabel: 'Aspiration pneumonitis', category: 'comorbid', subcategory: 'pulmonary' },
];

const comorbidCerebrovascular: ICD10Code[] = [
  { code: 'I63.9', description: 'Cerebral infarction, unspecified', shortLabel: 'Ischemic stroke', category: 'comorbid', subcategory: 'cerebrovascular' },
  { code: 'I63.50', description: 'Cerebral infarction due to unspecified occlusion or stenosis of unspecified cerebral artery', shortLabel: 'Stroke occlusion', category: 'comorbid', subcategory: 'cerebrovascular' },
  { code: 'I61.9', description: 'Nontraumatic intracerebral hemorrhage, unspecified', shortLabel: 'Hemorrhagic stroke', category: 'comorbid', subcategory: 'cerebrovascular' },
  { code: 'G45.9', description: 'Transient cerebral ischemic attack, unspecified', shortLabel: 'TIA', category: 'comorbid', subcategory: 'cerebrovascular' },
  { code: 'I65.21', description: 'Occlusion and stenosis of right carotid artery', shortLabel: 'R carotid stenosis', category: 'comorbid', subcategory: 'cerebrovascular' },
  { code: 'I65.22', description: 'Occlusion and stenosis of left carotid artery', shortLabel: 'L carotid stenosis', category: 'comorbid', subcategory: 'cerebrovascular' },
  { code: 'I65.23', description: 'Occlusion and stenosis of bilateral carotid arteries', shortLabel: 'Bilateral carotid stenosis', category: 'comorbid', subcategory: 'cerebrovascular' },
  { code: 'I67.1', description: 'Cerebral aneurysm, nonruptured', shortLabel: 'Cerebral aneurysm', category: 'comorbid', subcategory: 'cerebrovascular' },
  { code: 'I60.9', description: 'Nontraumatic subarachnoid hemorrhage, unspecified', shortLabel: 'SAH', category: 'comorbid', subcategory: 'cerebrovascular' },
  { code: 'I69.30', description: 'Unspecified sequelae of cerebral infarction', shortLabel: 'Prior stroke sequelae', category: 'comorbid', subcategory: 'cerebrovascular' },
];

const comorbidPeripheralVascular: ICD10Code[] = [
  { code: 'I70.201', description: 'Unspecified atherosclerosis of native arteries of extremities, right leg', shortLabel: 'PAD right leg', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I70.202', description: 'Unspecified atherosclerosis of native arteries of extremities, left leg', shortLabel: 'PAD left leg', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I70.209', description: 'Unspecified atherosclerosis of native arteries of extremities, unspecified extremity', shortLabel: 'PAD unspec', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I70.211', description: 'Atherosclerosis of native arteries of extremities with intermittent claudication, right leg', shortLabel: 'Claudication right', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I70.212', description: 'Atherosclerosis of native arteries of extremities with intermittent claudication, left leg', shortLabel: 'Claudication left', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I70.25', description: 'Atherosclerosis of native arteries of other extremities with ulceration', shortLabel: 'PAD with ulceration', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I70.261', description: 'Atherosclerosis of native arteries of extremities with gangrene, right leg', shortLabel: 'CLI right', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I70.262', description: 'Atherosclerosis of native arteries of extremities with gangrene, left leg', shortLabel: 'CLI left', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I71.4', description: 'Abdominal aortic aneurysm, without rupture', shortLabel: 'AAA', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I71.3', description: 'Abdominal aortic aneurysm, ruptured', shortLabel: 'AAA ruptured', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I71.2', description: 'Thoracic aortic aneurysm, without rupture', shortLabel: 'Thoracic aneurysm', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I70.0', description: 'Atherosclerosis of aorta', shortLabel: 'Aortic atherosclerosis', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I74.3', description: 'Embolism and thrombosis of arteries of the lower extremities', shortLabel: 'Arterial embolism leg', category: 'comorbid', subcategory: 'peripheralVascular' },
  { code: 'I73.9', description: 'Peripheral vascular disease, unspecified', shortLabel: 'PVD unspecified', category: 'comorbid', subcategory: 'peripheralVascular' },
];

const comorbidVenousThromboembolic: ICD10Code[] = [
  { code: 'I82.401', description: 'Acute embolism and thrombosis of unspecified deep veins of right lower extremity', shortLabel: 'DVT right leg', category: 'comorbid', subcategory: 'venous' },
  { code: 'I82.402', description: 'Acute embolism and thrombosis of unspecified deep veins of left lower extremity', shortLabel: 'DVT left leg', category: 'comorbid', subcategory: 'venous' },
  { code: 'I82.409', description: 'Acute embolism and thrombosis of unspecified deep veins of unspecified lower extremity', shortLabel: 'DVT leg unspec', category: 'comorbid', subcategory: 'venous' },
  { code: 'I82.601', description: 'Acute embolism and thrombosis of unspecified veins of right upper extremity', shortLabel: 'DVT right arm', category: 'comorbid', subcategory: 'venous' },
  { code: 'I82.602', description: 'Acute embolism and thrombosis of unspecified veins of left upper extremity', shortLabel: 'DVT left arm', category: 'comorbid', subcategory: 'venous' },
  { code: 'I82.501', description: 'Chronic embolism and thrombosis of unspecified deep veins of right lower extremity', shortLabel: 'Chronic DVT right', category: 'comorbid', subcategory: 'venous' },
  { code: 'I82.502', description: 'Chronic embolism and thrombosis of unspecified deep veins of left lower extremity', shortLabel: 'Chronic DVT left', category: 'comorbid', subcategory: 'venous' },
  { code: 'Z79.01', description: 'Long term (current) use of anticoagulants', shortLabel: 'Anticoagulant use', category: 'comorbid', subcategory: 'venous' },
  { code: 'D68.9', description: 'Coagulation defect, unspecified', shortLabel: 'Coagulopathy', category: 'comorbid', subcategory: 'venous' },
  { code: 'D68.59', description: 'Other primary thrombophilia', shortLabel: 'Thrombophilia', category: 'comorbid', subcategory: 'venous' },
  { code: 'D75.82', description: 'Heparin induced thrombocytopenia (HIT)', shortLabel: 'HIT', category: 'comorbid', subcategory: 'venous' },
];

const comorbidHematologic: ICD10Code[] = [
  { code: 'D50.9', description: 'Iron deficiency anemia, unspecified', shortLabel: 'Anemia iron def', category: 'comorbid', subcategory: 'hematologic' },
  { code: 'D63.1', description: 'Anemia in chronic kidney disease', shortLabel: 'Anemia CKD', category: 'comorbid', subcategory: 'hematologic' },
  { code: 'D64.9', description: 'Anemia, unspecified', shortLabel: 'Anemia unspecified', category: 'comorbid', subcategory: 'hematologic' },
  { code: 'D62', description: 'Acute posthemorrhagic anemia', shortLabel: 'Anemia acute blood loss', category: 'comorbid', subcategory: 'hematologic' },
  { code: 'D69.6', description: 'Thrombocytopenia, unspecified', shortLabel: 'Thrombocytopenia', category: 'comorbid', subcategory: 'hematologic' },
  { code: 'D69.59', description: 'Other secondary thrombocytopenia', shortLabel: 'Thrombocytopenia secondary', category: 'comorbid', subcategory: 'hematologic' },
  { code: 'D61.818', description: 'Other pancytopenia', shortLabel: 'Pancytopenia', category: 'comorbid', subcategory: 'hematologic' },
  { code: 'Z79.02', description: 'Long term (current) use of antithrombotics/antiplatelets', shortLabel: 'Antiplatelet use', category: 'comorbid', subcategory: 'hematologic' },
  { code: 'D68.32', description: 'Hemorrhagic disorder due to extrinsic circulating anticoagulants', shortLabel: 'Anticoag-related bleeding', category: 'comorbid', subcategory: 'hematologic' },
  { code: 'R71.0', description: 'Precipitous drop in hematocrit', shortLabel: 'Hematocrit drop', category: 'comorbid', subcategory: 'hematologic' },
];

const comorbidEndocrine: ICD10Code[] = [
  { code: 'E03.9', description: 'Hypothyroidism, unspecified', shortLabel: 'Hypothyroid', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'E05.90', description: 'Thyrotoxicosis, unspecified without thyrotoxic crisis or storm', shortLabel: 'Hyperthyroid', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'E05.91', description: 'Thyrotoxicosis, unspecified with thyrotoxic crisis or storm', shortLabel: 'Thyroid storm', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories', shortLabel: 'Morbid obesity', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'E66.09', description: 'Other obesity due to excess calories', shortLabel: 'Obesity', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'E66.9', description: 'Obesity, unspecified', shortLabel: 'Obesity unspecified', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'Z68.41', description: 'Body mass index [BMI] 40.0-44.9, adult', shortLabel: 'BMI 40-44.9', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'Z68.45', description: 'Body mass index [BMI] 70 or greater, adult', shortLabel: 'BMI 70+', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'E88.81', description: 'Metabolic syndrome', shortLabel: 'Metabolic syndrome', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'M10.9', description: 'Gout, unspecified', shortLabel: 'Gout', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'E21.0', description: 'Primary hyperparathyroidism', shortLabel: 'Hyperparathyroidism', category: 'comorbid', subcategory: 'endocrine' },
  { code: 'E27.1', description: 'Primary adrenocortical insufficiency', shortLabel: 'Adrenal insufficiency', category: 'comorbid', subcategory: 'endocrine' },
];

const comorbidElectrolyte: ICD10Code[] = [
  { code: 'E87.6', description: 'Hypokalemia', shortLabel: 'Hypokalemia', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E87.5', description: 'Hyperkalemia', shortLabel: 'Hyperkalemia', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E87.1', description: 'Hypo-osmolality and hyponatremia', shortLabel: 'Hyponatremia', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E87.0', description: 'Hyperosmolality and hypernatremia', shortLabel: 'Hypernatremia', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E83.42', description: 'Hypomagnesemia', shortLabel: 'Hypomagnesemia', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E83.51', description: 'Hypocalcemia', shortLabel: 'Hypocalcemia', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E83.52', description: 'Hypercalcemia', shortLabel: 'Hypercalcemia', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E87.2', description: 'Acidosis', shortLabel: 'Metabolic acidosis', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E87.3', description: 'Alkalosis', shortLabel: 'Metabolic alkalosis', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E87.4', description: 'Mixed disorder of acid-base balance', shortLabel: 'Mixed acid-base disorder', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E83.39', description: 'Other disorders of phosphorus metabolism', shortLabel: 'Hypophosphatemia', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E86.0', description: 'Dehydration', shortLabel: 'Dehydration', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E86.1', description: 'Hypovolemia', shortLabel: 'Hypovolemia', category: 'comorbid', subcategory: 'electrolyte' },
  { code: 'E87.70', description: 'Fluid overload, unspecified', shortLabel: 'Fluid overload', category: 'comorbid', subcategory: 'electrolyte' },
];

const comorbidGI: ICD10Code[] = [
  { code: 'K92.0', description: 'Hematemesis', shortLabel: 'Hematemesis', category: 'comorbid', subcategory: 'gi' },
  { code: 'K92.1', description: 'Melena', shortLabel: 'Melena', category: 'comorbid', subcategory: 'gi' },
  { code: 'K92.2', description: 'Gastrointestinal hemorrhage, unspecified', shortLabel: 'GI bleed', category: 'comorbid', subcategory: 'gi' },
  { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis', shortLabel: 'GERD', category: 'comorbid', subcategory: 'gi' },
  { code: 'K74.60', description: 'Unspecified cirrhosis of liver', shortLabel: 'Cirrhosis', category: 'comorbid', subcategory: 'gi' },
  { code: 'K76.0', description: 'Fatty (change of) liver, not elsewhere classified', shortLabel: 'Fatty liver', category: 'comorbid', subcategory: 'gi' },
  { code: 'K76.9', description: 'Liver disease, unspecified', shortLabel: 'Liver disease', category: 'comorbid', subcategory: 'gi' },
  { code: 'K85.9', description: 'Acute pancreatitis, unspecified', shortLabel: 'Pancreatitis', category: 'comorbid', subcategory: 'gi' },
  { code: 'K25.9', description: 'Gastric ulcer, unspecified', shortLabel: 'Gastric ulcer', category: 'comorbid', subcategory: 'gi' },
  { code: 'K26.9', description: 'Duodenal ulcer, unspecified', shortLabel: 'Duodenal ulcer', category: 'comorbid', subcategory: 'gi' },
  { code: 'K56.60', description: 'Unspecified intestinal obstruction', shortLabel: 'Bowel obstruction', category: 'comorbid', subcategory: 'gi' },
  { code: 'K65.9', description: 'Peritonitis, unspecified', shortLabel: 'Peritonitis', category: 'comorbid', subcategory: 'gi' },
  { code: 'R18.8', description: 'Other ascites', shortLabel: 'Ascites', category: 'comorbid', subcategory: 'gi' },
  { code: 'K72.00', description: 'Acute and subacute hepatic failure without coma', shortLabel: 'Hepatic failure', category: 'comorbid', subcategory: 'gi' },
];

const comorbidRenal: ICD10Code[] = [
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', shortLabel: 'UTI', category: 'comorbid', subcategory: 'renal' },
  { code: 'N04.9', description: 'Nephrotic syndrome with unspecified morphologic changes', shortLabel: 'Nephrotic syndrome', category: 'comorbid', subcategory: 'renal' },
  { code: 'R80.9', description: 'Proteinuria, unspecified', shortLabel: 'Proteinuria', category: 'comorbid', subcategory: 'renal' },
  { code: 'R31.9', description: 'Hematuria, unspecified', shortLabel: 'Hematuria', category: 'comorbid', subcategory: 'renal' },
  { code: 'R33.9', description: 'Retention of urine, unspecified', shortLabel: 'Urinary retention', category: 'comorbid', subcategory: 'renal' },
  { code: 'N13.30', description: 'Unspecified hydronephrosis', shortLabel: 'Hydronephrosis', category: 'comorbid', subcategory: 'renal' },
  { code: 'E87.79', description: 'Other fluid overload', shortLabel: 'Volume overload', category: 'comorbid', subcategory: 'renal' },
  { code: 'N14.1', description: 'Nephropathy induced by other drugs, medicaments and biological substances', shortLabel: 'Contrast nephropathy', category: 'comorbid', subcategory: 'renal' },
];

const comorbidInfectious: ICD10Code[] = [
  { code: 'A41.9', description: 'Sepsis, unspecified organism', shortLabel: 'Sepsis', category: 'comorbid', subcategory: 'infectious' },
  { code: 'A41.01', description: 'Sepsis due to Methicillin susceptible Staphylococcus aureus', shortLabel: 'MSSA sepsis', category: 'comorbid', subcategory: 'infectious' },
  { code: 'A41.02', description: 'Sepsis due to Methicillin resistant Staphylococcus aureus', shortLabel: 'MRSA sepsis', category: 'comorbid', subcategory: 'infectious' },
  { code: 'R65.20', description: 'Severe sepsis without septic shock', shortLabel: 'Severe sepsis', category: 'comorbid', subcategory: 'infectious' },
  { code: 'R65.21', description: 'Severe sepsis with septic shock', shortLabel: 'Septic shock', category: 'comorbid', subcategory: 'infectious' },
  { code: 'A49.9', description: 'Bacterial infection, unspecified', shortLabel: 'Bacteremia', category: 'comorbid', subcategory: 'infectious' },
  { code: 'J18.1', description: 'Lobar pneumonia, unspecified organism', shortLabel: 'Lobar pneumonia', category: 'comorbid', subcategory: 'infectious' },
  { code: 'J15.9', description: 'Unspecified bacterial pneumonia', shortLabel: 'Bacterial pneumonia', category: 'comorbid', subcategory: 'infectious' },
  { code: 'U07.1', description: 'COVID-19', shortLabel: 'COVID-19', category: 'comorbid', subcategory: 'infectious' },
  { code: 'B96.20', description: 'Unspecified Escherichia coli as cause of diseases classified elsewhere', shortLabel: 'E. coli infection', category: 'comorbid', subcategory: 'infectious' },
  { code: 'A04.72', description: 'Enterocolitis due to Clostridioides difficile, not specified as recurrent', shortLabel: 'C. diff', category: 'comorbid', subcategory: 'infectious' },
  { code: 'L03.90', description: 'Cellulitis, unspecified', shortLabel: 'Cellulitis', category: 'comorbid', subcategory: 'infectious' },
  { code: 'T81.49XA', description: 'Infection following a procedure, other surgical site, initial encounter', shortLabel: 'Postop infection', category: 'comorbid', subcategory: 'infectious' },
];

const comorbidNeurologic: ICD10Code[] = [
  { code: 'R55', description: 'Syncope and collapse', shortLabel: 'Syncope', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'R56.9', description: 'Unspecified convulsions', shortLabel: 'Seizure', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'G47.33', description: 'Obstructive sleep apnea (adult) (pediatric)', shortLabel: 'Sleep apnea', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'G47.30', description: 'Sleep apnea, unspecified', shortLabel: 'Sleep apnea unspec', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'F03.90', description: 'Unspecified dementia without behavioral disturbance', shortLabel: 'Dementia', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'R41.0', description: 'Disorientation, unspecified', shortLabel: 'Delirium', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'F05', description: 'Delirium due to known physiological condition', shortLabel: 'Delirium (known cause)', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'G62.9', description: 'Polyneuropathy, unspecified', shortLabel: 'Neuropathy', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'G20', description: 'Parkinson disease', shortLabel: 'Parkinson disease', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'G40.909', description: 'Epilepsy, unspecified, not intractable, without status epilepticus', shortLabel: 'Epilepsy', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'R40.20', description: 'Unspecified coma', shortLabel: 'Coma', category: 'comorbid', subcategory: 'neurologic' },
  { code: 'G93.1', description: 'Anoxic brain damage, not elsewhere classified', shortLabel: 'Anoxic brain injury', category: 'comorbid', subcategory: 'neurologic' },
];

const comorbidPsychiatric: ICD10Code[] = [
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', shortLabel: 'Depression', category: 'comorbid', subcategory: 'psychiatric' },
  { code: 'F33.9', description: 'Major depressive disorder, recurrent, unspecified', shortLabel: 'Depression recurrent', category: 'comorbid', subcategory: 'psychiatric' },
  { code: 'F41.1', description: 'Generalized anxiety disorder', shortLabel: 'Anxiety', category: 'comorbid', subcategory: 'psychiatric' },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified', shortLabel: 'Anxiety unspecified', category: 'comorbid', subcategory: 'psychiatric' },
  { code: 'G47.00', description: 'Insomnia, unspecified', shortLabel: 'Insomnia', category: 'comorbid', subcategory: 'psychiatric' },
  { code: 'F10.20', description: 'Alcohol dependence, uncomplicated', shortLabel: 'Alcohol dependence', category: 'comorbid', subcategory: 'psychiatric' },
  { code: 'F10.239', description: 'Alcohol dependence with withdrawal, unspecified', shortLabel: 'Alcohol withdrawal', category: 'comorbid', subcategory: 'psychiatric' },
];

const comorbidMusculoskeletal: ICD10Code[] = [
  { code: 'M17.9', description: 'Osteoarthritis of knee, unspecified', shortLabel: 'Knee OA', category: 'comorbid', subcategory: 'musculoskeletal' },
  { code: 'M19.90', description: 'Unspecified osteoarthritis, unspecified site', shortLabel: 'Osteoarthritis', category: 'comorbid', subcategory: 'musculoskeletal' },
  { code: 'M54.5', description: 'Low back pain', shortLabel: 'Back pain', category: 'comorbid', subcategory: 'musculoskeletal' },
  { code: 'M81.0', description: 'Age-related osteoporosis without current pathological fracture', shortLabel: 'Osteoporosis', category: 'comorbid', subcategory: 'musculoskeletal' },
  { code: 'R29.6', description: 'Repeated falls', shortLabel: 'Fall risk', category: 'comorbid', subcategory: 'musculoskeletal' },
  { code: 'W19.XXXA', description: 'Unspecified fall, initial encounter', shortLabel: 'Fall', category: 'comorbid', subcategory: 'musculoskeletal' },
  { code: 'M62.81', description: 'Muscle weakness (generalized)', shortLabel: 'Muscle weakness', category: 'comorbid', subcategory: 'musculoskeletal' },
  { code: 'Z87.31', description: 'Personal history of (healed) nontraumatic fracture', shortLabel: 'Prior fracture', category: 'comorbid', subcategory: 'musculoskeletal' },
];

const comorbidTobacco: ICD10Code[] = [
  { code: 'F17.210', description: 'Nicotine dependence, cigarettes, uncomplicated', shortLabel: 'Current smoker', category: 'comorbid', subcategory: 'tobacco' },
  { code: 'F17.200', description: 'Nicotine dependence, unspecified, uncomplicated', shortLabel: 'Nicotine dependence', category: 'comorbid', subcategory: 'tobacco' },
  { code: 'Z87.891', description: 'Personal history of nicotine dependence', shortLabel: 'Former smoker', category: 'comorbid', subcategory: 'tobacco' },
  { code: 'Z72.0', description: 'Tobacco use', shortLabel: 'Tobacco use', category: 'comorbid', subcategory: 'tobacco' },
  { code: 'F10.10', description: 'Alcohol abuse, uncomplicated', shortLabel: 'Alcohol use', category: 'comorbid', subcategory: 'tobacco' },
  { code: 'F11.10', description: 'Opioid abuse, uncomplicated', shortLabel: 'Opioid use', category: 'comorbid', subcategory: 'tobacco' },
  { code: 'F14.10', description: 'Cocaine abuse, uncomplicated', shortLabel: 'Cocaine use', category: 'comorbid', subcategory: 'tobacco' },
  { code: 'F15.10', description: 'Other stimulant abuse, uncomplicated', shortLabel: 'Stimulant use', category: 'comorbid', subcategory: 'tobacco' },
];

const comorbidSurgical: ICD10Code[] = [
  { code: 'T81.4XXA', description: 'Infection following a procedure, initial encounter', shortLabel: 'Postop wound infection', category: 'comorbid', subcategory: 'surgical' },
  { code: 'T81.31XA', description: 'Disruption of external operation wound, not elsewhere classified, initial encounter', shortLabel: 'Wound dehiscence', category: 'comorbid', subcategory: 'surgical' },
  { code: 'T81.89XA', description: 'Other complications of procedures, not elsewhere classified, initial encounter', shortLabel: 'Surgical complication', category: 'comorbid', subcategory: 'surgical' },
  { code: 'L89.90', description: 'Pressure ulcer of unspecified site, unspecified stage', shortLabel: 'Pressure ulcer', category: 'comorbid', subcategory: 'surgical' },
  { code: 'T81.10XA', description: 'Postprocedural shock unspecified, initial encounter', shortLabel: 'Postop shock', category: 'comorbid', subcategory: 'surgical' },
  { code: 'T81.11XA', description: 'Postprocedural cardiogenic shock, initial encounter', shortLabel: 'Postop cardiogenic shock', category: 'comorbid', subcategory: 'surgical' },
  { code: 'T81.12XA', description: 'Postprocedural septic shock, initial encounter', shortLabel: 'Postop septic shock', category: 'comorbid', subcategory: 'surgical' },
  { code: 'T81.0XXA', description: 'Postprocedural hemorrhage, initial encounter', shortLabel: 'Postop hemorrhage', category: 'comorbid', subcategory: 'surgical' },
];

const comorbidOther: ICD10Code[] = [
  { code: 'E46', description: 'Unspecified protein-calorie malnutrition', shortLabel: 'Malnutrition', category: 'comorbid', subcategory: 'other' },
  { code: 'E44.0', description: 'Moderate protein-calorie malnutrition', shortLabel: 'Moderate malnutrition', category: 'comorbid', subcategory: 'other' },
  { code: 'E43', description: 'Unspecified severe protein-calorie malnutrition', shortLabel: 'Severe malnutrition', category: 'comorbid', subcategory: 'other' },
  { code: 'R54', description: 'Age-related physical debility', shortLabel: 'Frailty', category: 'comorbid', subcategory: 'other' },
  { code: 'Z68.30', description: 'Body mass index [BMI] 30.0-30.9, adult', shortLabel: 'BMI 30+', category: 'comorbid', subcategory: 'other' },
  { code: 'Z68.35', description: 'Body mass index [BMI] 35.0-35.9, adult', shortLabel: 'BMI 35+', category: 'comorbid', subcategory: 'other' },
  { code: 'Z13.6', description: 'Encounter for screening for cardiovascular disorders', shortLabel: 'CV screening', category: 'comorbid', subcategory: 'other' },
  { code: 'R00.0', description: 'Tachycardia, unspecified', shortLabel: 'Tachycardia', category: 'comorbid', subcategory: 'other' },
  { code: 'R06.00', description: 'Dyspnea, unspecified', shortLabel: 'Dyspnea', category: 'comorbid', subcategory: 'other' },
  { code: 'R07.9', description: 'Chest pain, unspecified', shortLabel: 'Chest pain', category: 'comorbid', subcategory: 'other' },
  { code: 'R42', description: 'Dizziness and giddiness', shortLabel: 'Dizziness', category: 'comorbid', subcategory: 'other' },
  { code: 'R09.02', description: 'Hypoxemia', shortLabel: 'Hypoxemia', category: 'comorbid', subcategory: 'other' },
  { code: 'R57.1', description: 'Hypovolemic shock', shortLabel: 'Hypovolemic shock', category: 'comorbid', subcategory: 'other' },
  { code: 'R57.9', description: 'Shock, unspecified', shortLabel: 'Shock unspecified', category: 'comorbid', subcategory: 'other' },
];

// ============================================================================
// POST-PROCEDURE STATUS (~30 codes)
// ============================================================================

const postProcCoronary: ICD10Code[] = [
  { code: 'Z95.1', description: 'Presence of aortocoronary bypass graft', shortLabel: 'Prior CABG', category: 'postProcedure', subcategory: 'ppCoronary' },
  { code: 'Z95.5', description: 'Presence of coronary angioplasty implant and graft', shortLabel: 'Prior PCI/stent', category: 'postProcedure', subcategory: 'ppCoronary' },
  { code: 'Z95.8', description: 'Presence of other cardiac and vascular implants and grafts', shortLabel: 'Cardiac implant', category: 'postProcedure', subcategory: 'ppCoronary' },
  { code: 'T82.855A', description: 'Stenosis of coronary artery stent, initial encounter', shortLabel: 'In-stent restenosis', category: 'postProcedure', subcategory: 'ppCoronary' },
  { code: 'T82.857A', description: 'Stenosis of cardiac vascular graft, initial encounter', shortLabel: 'Graft stenosis', category: 'postProcedure', subcategory: 'ppCoronary' },
  { code: 'T82.897A', description: 'Other specified complication of cardiac prosthetic devices, implants and grafts, initial encounter', shortLabel: 'Stent complication', category: 'postProcedure', subcategory: 'ppCoronary' },
];

const postProcDevices: ICD10Code[] = [
  { code: 'Z95.0', description: 'Presence of cardiac pacemaker', shortLabel: 'Pacemaker', category: 'postProcedure', subcategory: 'ppDevices' },
  { code: 'Z95.810', description: 'Presence of automatic (implantable) cardiac defibrillator', shortLabel: 'ICD', category: 'postProcedure', subcategory: 'ppDevices' },
  { code: 'Z95.811', description: 'Presence of heart assist device', shortLabel: 'LVAD', category: 'postProcedure', subcategory: 'ppDevices' },
  { code: 'Z95.818', description: 'Presence of other cardiac implants and grafts', shortLabel: 'CRT-D', category: 'postProcedure', subcategory: 'ppDevices' },
  { code: 'Z95.812', description: 'Presence of fully implantable artificial heart', shortLabel: 'Artificial heart', category: 'postProcedure', subcategory: 'ppDevices' },
  { code: 'Z96.89', description: 'Presence of other specified functional implants', shortLabel: 'Loop recorder', category: 'postProcedure', subcategory: 'ppDevices' },
];

const postProcValvular: ICD10Code[] = [
  { code: 'Z95.2', description: 'Presence of prosthetic heart valve', shortLabel: 'Prosthetic valve', category: 'postProcedure', subcategory: 'ppValvular' },
  { code: 'Z95.3', description: 'Presence of xenogenic heart valve', shortLabel: 'Bio valve', category: 'postProcedure', subcategory: 'ppValvular' },
  { code: 'Z95.4', description: 'Presence of other heart-valve replacement', shortLabel: 'Other valve replacement', category: 'postProcedure', subcategory: 'ppValvular' },
  { code: 'T82.01XA', description: 'Breakdown (mechanical) of heart valve prosthesis, initial encounter', shortLabel: 'Valve prosthesis malfunction', category: 'postProcedure', subcategory: 'ppValvular' },
  { code: 'T82.09XA', description: 'Other mechanical complication of heart valve prosthesis, initial encounter', shortLabel: 'Valve prosthesis complication', category: 'postProcedure', subcategory: 'ppValvular' },
  { code: 'T82.6XXA', description: 'Infection and inflammatory reaction due to cardiac valve prosthesis, initial encounter', shortLabel: 'Prosthetic valve endocarditis', category: 'postProcedure', subcategory: 'ppValvular' },
];

const postProcVascular: ICD10Code[] = [
  { code: 'Z95.820', description: 'Peripheral vascular angioplasty status with implants and grafts', shortLabel: 'Vascular stent', category: 'postProcedure', subcategory: 'ppVascular' },
  { code: 'Z95.828', description: 'Presence of other vascular implants and grafts', shortLabel: 'Vascular graft', category: 'postProcedure', subcategory: 'ppVascular' },
  { code: 'T82.318A', description: 'Breakdown (mechanical) of other vascular grafts, initial encounter', shortLabel: 'Graft failure', category: 'postProcedure', subcategory: 'ppVascular' },
  { code: 'T82.398A', description: 'Other mechanical complication of other vascular grafts, initial encounter', shortLabel: 'Graft complication', category: 'postProcedure', subcategory: 'ppVascular' },
];

const postProcDeviceComplications: ICD10Code[] = [
  { code: 'T82.110A', description: 'Breakdown (mechanical) of cardiac electrode, initial encounter', shortLabel: 'Lead malfunction', category: 'postProcedure', subcategory: 'ppDeviceComplications' },
  { code: 'T82.111A', description: 'Breakdown (mechanical) of cardiac pulse generator (battery), initial encounter', shortLabel: 'Generator malfunction', category: 'postProcedure', subcategory: 'ppDeviceComplications' },
  { code: 'T82.120A', description: 'Displacement of cardiac electrode, initial encounter', shortLabel: 'Lead displacement', category: 'postProcedure', subcategory: 'ppDeviceComplications' },
  { code: 'T82.190A', description: 'Other mechanical complication of cardiac electrode, initial encounter', shortLabel: 'Lead complication other', category: 'postProcedure', subcategory: 'ppDeviceComplications' },
  { code: 'T82.7XXA', description: 'Infection and inflammatory reaction due to other cardiac and vascular devices, implants and grafts, initial encounter', shortLabel: 'Device infection', category: 'postProcedure', subcategory: 'ppDeviceComplications' },
];

// ============================================================================
// AGGREGATE ALL CODES
// ============================================================================

export const icd10Codes: ICD10Code[] = [
  // Primary Cardiac
  ...primaryCoronary,
  ...primaryHeartFailure,
  ...primaryArrhythmia,
  ...primaryHeartBlock,
  ...primaryValvular,
  ...primaryCardiomyopathy,
  ...primaryPericardial,
  ...primaryOtherCardiac,
  // Comorbidities
  ...comorbidHypertension,
  ...comorbidDiabetes,
  ...comorbidHyperlipidemia,
  ...comorbidCKD,
  ...comorbidPulmonary,
  ...comorbidCerebrovascular,
  ...comorbidPeripheralVascular,
  ...comorbidVenousThromboembolic,
  ...comorbidHematologic,
  ...comorbidEndocrine,
  ...comorbidElectrolyte,
  ...comorbidGI,
  ...comorbidRenal,
  ...comorbidInfectious,
  ...comorbidNeurologic,
  ...comorbidPsychiatric,
  ...comorbidMusculoskeletal,
  ...comorbidTobacco,
  ...comorbidSurgical,
  ...comorbidOther,
  // Post-Procedure
  ...postProcCoronary,
  ...postProcDevices,
  ...postProcValvular,
  ...postProcVascular,
  ...postProcDeviceComplications,
];

// ============================================================================
// SUBCATEGORY DEFINITIONS
// ============================================================================

export const icd10Subcategories: ICD10Subcategory[] = [
  // Primary Cardiac
  { id: 'coronary', label: 'Coronary / ACS', category: 'primary', codes: primaryCoronary },
  { id: 'heartFailure', label: 'Heart Failure', category: 'primary', codes: primaryHeartFailure },
  { id: 'arrhythmia', label: 'Arrhythmia', category: 'primary', codes: primaryArrhythmia },
  { id: 'heartBlock', label: 'Heart Block / Conduction', category: 'primary', codes: primaryHeartBlock },
  { id: 'valvular', label: 'Valvular', category: 'primary', codes: primaryValvular },
  { id: 'cardiomyopathy', label: 'Cardiomyopathy', category: 'primary', codes: primaryCardiomyopathy },
  { id: 'pericardial', label: 'Pericardial', category: 'primary', codes: primaryPericardial },
  { id: 'otherCardiac', label: 'Other Cardiac', category: 'primary', codes: primaryOtherCardiac },
  // Comorbidities
  { id: 'hypertension', label: 'Hypertension', category: 'comorbid', codes: comorbidHypertension },
  { id: 'diabetes', label: 'Diabetes', category: 'comorbid', codes: comorbidDiabetes },
  { id: 'hyperlipidemia', label: 'Hyperlipidemia', category: 'comorbid', codes: comorbidHyperlipidemia },
  { id: 'ckd', label: 'Chronic Kidney Disease', category: 'comorbid', codes: comorbidCKD },
  { id: 'pulmonary', label: 'Pulmonary', category: 'comorbid', codes: comorbidPulmonary },
  { id: 'cerebrovascular', label: 'Cerebrovascular', category: 'comorbid', codes: comorbidCerebrovascular },
  { id: 'peripheralVascular', label: 'Peripheral Vascular', category: 'comorbid', codes: comorbidPeripheralVascular },
  { id: 'venous', label: 'Venous / Thromboembolic', category: 'comorbid', codes: comorbidVenousThromboembolic },
  { id: 'hematologic', label: 'Hematologic', category: 'comorbid', codes: comorbidHematologic },
  { id: 'endocrine', label: 'Endocrine / Metabolic', category: 'comorbid', codes: comorbidEndocrine },
  { id: 'electrolyte', label: 'Electrolyte', category: 'comorbid', codes: comorbidElectrolyte },
  { id: 'gi', label: 'GI / Hepatic', category: 'comorbid', codes: comorbidGI },
  { id: 'renal', label: 'Renal (non-CKD)', category: 'comorbid', codes: comorbidRenal },
  { id: 'infectious', label: 'Infectious', category: 'comorbid', codes: comorbidInfectious },
  { id: 'neurologic', label: 'Neurologic', category: 'comorbid', codes: comorbidNeurologic },
  { id: 'psychiatric', label: 'Psychiatric', category: 'comorbid', codes: comorbidPsychiatric },
  { id: 'musculoskeletal', label: 'Musculoskeletal', category: 'comorbid', codes: comorbidMusculoskeletal },
  { id: 'tobacco', label: 'Tobacco / Substance', category: 'comorbid', codes: comorbidTobacco },
  { id: 'surgical', label: 'Surgical / Wound', category: 'comorbid', codes: comorbidSurgical },
  { id: 'other', label: 'Other / Supportive', category: 'comorbid', codes: comorbidOther },
  // Post-Procedure
  { id: 'ppCoronary', label: 'Coronary', category: 'postProcedure', codes: postProcCoronary },
  { id: 'ppDevices', label: 'Cardiac Devices', category: 'postProcedure', codes: postProcDevices },
  { id: 'ppValvular', label: 'Valvular', category: 'postProcedure', codes: postProcValvular },
  { id: 'ppVascular', label: 'Vascular', category: 'postProcedure', codes: postProcVascular },
  { id: 'ppDeviceComplications', label: 'Device Complications', category: 'postProcedure', codes: postProcDeviceComplications },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get codes by category (replaces old getCodesByCluster)
export function getCodesByCategory(category: 'primary' | 'comorbid' | 'postProcedure'): ICD10Code[] {
  return icd10Codes.filter(code => code.category === category);
}

// Backward compatibility alias
export function getCodesByCluster(cluster: 'primary' | 'comorbid' | 'postProcedure'): ICD10Code[] {
  return getCodesByCategory(cluster);
}

// Get subcategories for a given category
export function getSubcategoriesByCategory(category: 'primary' | 'comorbid' | 'postProcedure'): ICD10Subcategory[] {
  return icd10Subcategories.filter(sub => sub.category === category);
}

// Get all codes
export function getAllICD10Codes(): ICD10Code[] {
  return icd10Codes;
}

// Search ICD-10 codes (searches code, description, and shortLabel)
export function searchICD10Codes(query: string): ICD10Code[] {
  const lowerQuery = query.toLowerCase();
  return icd10Codes.filter(code =>
    code.code.toLowerCase().includes(lowerQuery) ||
    code.description.toLowerCase().includes(lowerQuery) ||
    code.shortLabel.toLowerCase().includes(lowerQuery)
  );
}

// Category display names
export const categoryNames: Record<string, string> = {
  'primary': 'Primary Cardiac',
  'comorbid': 'Comorbidities',
  'postProcedure': 'Post-Procedure Status'
};

// Backward compatibility alias
export const clusterNames = categoryNames;

// Category colors for UI
export const categoryColors: Record<string, { bg: string; text: string; border: string; chipBg: string; chipText: string; chipSelected: string }> = {
  'primary': {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    chipBg: 'bg-red-100',
    chipText: 'text-red-800',
    chipSelected: 'bg-red-600 text-white'
  },
  'comorbid': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    chipBg: 'bg-blue-100',
    chipText: 'text-blue-800',
    chipSelected: 'bg-blue-600 text-white'
  },
  'postProcedure': {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    chipBg: 'bg-green-100',
    chipText: 'text-green-800',
    chipSelected: 'bg-green-600 text-white'
  }
};

// Backward compatibility alias
export const clusterColors = categoryColors;

// Default-expanded subcategories (most commonly used)
export const defaultExpandedSubcategories = new Set([
  'coronary', 'heartFailure', 'hypertension', 'diabetes'
]);

// Maximum number of diagnosis codes allowed per patient
export const MAX_DIAGNOSIS_CODES = 24;
