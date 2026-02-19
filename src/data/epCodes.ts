import { CPTCode } from '../types';

// Electrophysiology CPT Codes organized by subcategory
// All RVU values are 2026 CMS Physician Fee Schedule

export interface EPCode extends CPTCode {
  rvu?: number;
  colorTheme?: string;
}

export const epCategories: Record<string, EPCode[]> = {
  'EP Studies (Diagnostic)': [
    { code: 'HEADER-RECORDING', summary: '— Intracardiac Recording —', description: '', isDivider: true },
    { code: '93600', summary: 'Bundle of His recording', description: 'Bundle of His recording', rvu: 3.75, colorTheme: 'violet' },
    { code: '93602', summary: 'Intra-atrial recording', description: 'Intra-atrial recording', rvu: 3.24, colorTheme: 'violet' },
    { code: '93603', summary: 'Right ventricular recording', description: 'Right ventricular recording', rvu: 3.24, colorTheme: 'violet' },
    { code: '93609', summary: 'Tachycardia mapping', description: 'Intraventricular and/or intra-atrial mapping of tachycardia site(s) with catheter manipulation to record from multiple sites to identify origin of tachycardia (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 3.84, colorTheme: 'violet' },

    { code: 'HEADER-PACING', summary: '— Intracardiac Pacing —', description: '', isDivider: true },
    { code: '93610', summary: 'Intra-atrial pacing', description: 'Intra-atrial pacing', rvu: 3.35, colorTheme: 'violet' },
    { code: '93612', summary: 'Intraventricular pacing', description: 'Intraventricular pacing', rvu: 3.24, colorTheme: 'violet' },
    { code: '93613', summary: '3D mapping (add-on)', description: 'Intracardiac electrophysiologic 3-dimensional mapping (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 4.50, colorTheme: 'violet' },

    { code: 'HEADER-TESTING', summary: '— EP Testing —', description: '', isDivider: true },
    { code: '93618', summary: 'Arrhythmia induction', description: 'Induction of arrhythmia by electrical pacing', rvu: 4.11, colorTheme: 'violet' },
    { code: '93619', summary: 'Comprehensive EP evaluation (RA)', description: 'Comprehensive electrophysiologic evaluation with right atrial pacing and recording, His bundle recording, right ventricular pacing and recording (when necessary), including insertion and repositioning of multiple electrode catheters, without induction or attempted induction of arrhythmia', rvu: 10.23, colorTheme: 'violet' },
    { code: '93620', summary: 'Comprehensive EP evaluation (LA via transseptal)', description: 'Comprehensive electrophysiologic evaluation including insertion and repositioning of multiple electrode catheters with induction or attempted induction of an arrhythmia; with left atrial pacing and recording from coronary sinus or left atrium (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 3.82, colorTheme: 'violet' },
    { code: '93621', summary: 'LA pacing/recording (add-on)', description: 'Comprehensive electrophysiologic evaluation including insertion and repositioning of multiple electrode catheters with induction or attempted induction of an arrhythmia; with left atrial pacing and recording from coronary sinus or left atrium', isAddOn: true, rvu: 2.14, colorTheme: 'violet' },
    { code: '93622', summary: 'LV pacing/recording (add-on)', description: 'Comprehensive electrophysiologic evaluation including insertion and repositioning of multiple electrode catheters with induction or attempted induction of an arrhythmia; with left ventricular pacing and recording', isAddOn: true, rvu: 2.50, colorTheme: 'violet' },
    { code: '93623', summary: 'Programmed stimulation (add-on)', description: 'Programmed stimulation and pacing after intravenous drug infusion (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 1.76, colorTheme: 'violet' },
    { code: '93624', summary: 'EP evaluation post drug', description: 'Electrophysiologic follow-up study with pacing and recording to test effectiveness of therapy, including induction or attempted induction of arrhythmia', rvu: 6.86, colorTheme: 'violet' },
    { code: '93631', summary: 'Intra-op mapping', description: 'Intra-operative epicardial and endocardial pacing and mapping to localize the site of tachycardia or zone of slow conduction for surgical correction', rvu: 9.88, colorTheme: 'violet' },
    { code: '93640', summary: 'EP eval of ICD leads', description: 'Electrophysiologic evaluation of single or dual chamber pacing cardioverter-defibrillator leads including defibrillation threshold evaluation (induction of arrhythmia, evaluation of sensing and pacing for arrhythmia termination) at time of initial implantation or replacement', rvu: 4.55, colorTheme: 'violet' },
    { code: '93641', summary: 'EP eval of ICD (testing)', description: 'Electrophysiologic evaluation of single or dual chamber pacing cardioverter-defibrillator (includes defibrillation threshold evaluation, induction of arrhythmia, evaluation of sensing and pacing for arrhythmia termination, and programming or reprogramming of sensing or therapeutic parameters)', rvu: 5.50, colorTheme: 'violet' },
    { code: '93642', summary: 'EP eval of ICD leads (add-on)', description: 'Electrophysiologic evaluation of single or dual chamber pacing cardioverter-defibrillator leads including defibrillation threshold evaluation (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 2.79, colorTheme: 'violet' }
  ],

  'SVT/AVNRT Ablation': [
    { code: '93650', summary: 'AV node ablation (complete heart block)', description: 'Intracardiac catheter ablation of atrioventricular node function, atrioventricular conduction for creation of complete heart block, with or without temporary pacemaker placement', rvu: 9.28, colorTheme: 'purple' },
    { code: '93653', summary: 'SVT/AVNRT/AVRT ablation', description: 'Comprehensive electrophysiologic evaluation including insertion and repositioning of multiple electrode catheters with induction or attempted induction of an arrhythmia with right atrial pacing and recording, right ventricular pacing and recording, His bundle recording, with intracardiac catheter ablation of arrhythmogenic focus; with treatment of supraventricular tachycardia by ablation of fast or slow atrioventricular pathway, accessory atrioventricular connection, cavo-tricuspid isthmus or other single atrial focus or source of atrial re-entry', rvu: 18.79, colorTheme: 'purple' },
    { code: '93655', summary: 'Additional SVT ablation (add-on)', description: 'Intracardiac catheter ablation of a discrete mechanism of arrhythmia which is distinct from the primary ablated mechanism, including repeat diagnostic maneuvers, to treat a spontaneous or induced arrhythmia (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 6.50, colorTheme: 'purple' },
    { code: '93657', summary: 'Additional linear/focal ablation (add-on)', description: 'Additional linear or focal intracardiac catheter ablation of the left or right atrium for treatment of atrial fibrillation remaining after completion of pulmonary vein isolation (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 5.00, colorTheme: 'purple' }
  ],

  'Atrial Flutter Ablation': [
    { code: '93653', summary: 'Atrial flutter ablation (CTI)', description: 'Comprehensive electrophysiologic evaluation including insertion and repositioning of multiple electrode catheters with induction or attempted induction of an arrhythmia with right atrial pacing and recording, right ventricular pacing and recording, His bundle recording, with intracardiac catheter ablation of arrhythmogenic focus; with treatment of supraventricular tachycardia by ablation of fast or slow atrioventricular pathway, accessory atrioventricular connection, cavo-tricuspid isthmus or other single atrial focus or source of atrial re-entry', rvu: 18.79, colorTheme: 'indigo' },
    { code: '93655', summary: 'Additional flutter ablation (add-on)', description: 'Intracardiac catheter ablation of a discrete mechanism of arrhythmia which is distinct from the primary ablated mechanism, including repeat diagnostic maneuvers, to treat a spontaneous or induced arrhythmia (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 6.50, colorTheme: 'indigo' },
    { code: '93657', summary: 'Additional linear ablation (add-on)', description: 'Additional linear or focal intracardiac catheter ablation of the left or right atrium for treatment of atrial fibrillation remaining after completion of pulmonary vein isolation (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 5.00, colorTheme: 'indigo' }
  ],

  'Atrial Fibrillation Ablation': [
    { code: '93656', summary: 'AF ablation (pulmonary vein isolation)', description: 'Comprehensive electrophysiologic evaluation including insertion and repositioning of multiple electrode catheters with induction or attempted induction of an arrhythmia including left or right atrial pacing/recording, right ventricular pacing/recording, and His bundle recording, with intracardiac catheter ablation of atrial fibrillation by pulmonary vein isolation', rvu: 24.25, colorTheme: 'blue' },
    { code: '93655', summary: 'Additional mechanism ablation (add-on)', description: 'Intracardiac catheter ablation of a discrete mechanism of arrhythmia which is distinct from the primary ablated mechanism, including repeat diagnostic maneuvers, to treat a spontaneous or induced arrhythmia (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 6.50, colorTheme: 'blue' },
    { code: '93657', summary: 'Additional linear/focal ablation (add-on)', description: 'Additional linear or focal intracardiac catheter ablation of the left or right atrium for treatment of atrial fibrillation remaining after completion of pulmonary vein isolation (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 5.00, colorTheme: 'blue' }
  ],

  'VT Ablation': [
    { code: '93654', summary: 'VT ablation', description: 'Comprehensive electrophysiologic evaluation with insertion and repositioning of multiple electrode catheters with induction or attempted induction of an arrhythmia including left or right ventricular pacing/recording, with intracardiac catheter ablation of ventricular tachycardia including intracardiac electrophysiologic 3D mapping, when performed, and target ablation of ventricular tachycardia', rvu: 27.32, colorTheme: 'red' },
    { code: '93655', summary: 'Additional VT ablation (add-on)', description: 'Intracardiac catheter ablation of a discrete mechanism of arrhythmia which is distinct from the primary ablated mechanism, including repeat diagnostic maneuvers, to treat a spontaneous or induced arrhythmia (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 6.50, colorTheme: 'red' },
    { code: '93657', summary: 'Additional linear/focal ablation (add-on)', description: 'Additional linear or focal intracardiac catheter ablation of the left or right atrium for treatment of atrial fibrillation remaining after completion of pulmonary vein isolation (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 5.00, colorTheme: 'red' }
  ],

  'Pacemaker Implant': [
    { code: 'HEADER-INITIAL', summary: '— Initial Implant —', description: '', isDivider: true },
    { code: '33206', summary: 'PPM implant, atrial', description: 'Insertion of new or replacement of permanent pacemaker with transvenous electrode(s); atrial', rvu: 7.91, colorTheme: 'teal' },
    { code: '33207', summary: 'PPM implant, ventricular', description: 'Insertion of new or replacement of permanent pacemaker with transvenous electrode(s); ventricular', rvu: 7.59, colorTheme: 'teal' },
    { code: '33208', summary: 'PPM implant, dual chamber', description: 'Insertion of new or replacement of permanent pacemaker with transvenous electrode(s); atrial and ventricular', rvu: 9.69, colorTheme: 'teal' },
    { code: '33212', summary: 'PPM generator only, single lead', description: 'Insertion of pacemaker pulse generator only; with existing single lead', rvu: 4.83, colorTheme: 'teal' },
    { code: '33213', summary: 'PPM generator only, dual leads', description: 'Insertion of pacemaker pulse generator only; with existing dual leads', rvu: 5.14, colorTheme: 'teal' },

    { code: 'HEADER-REPLACEMENT', summary: '— Generator Replacement —', description: '', isDivider: true },
    { code: '33227', summary: 'PPM generator replacement, single lead', description: 'Removal of permanent pacemaker pulse generator with replacement of pacemaker pulse generator; single lead system', rvu: 5.11, colorTheme: 'teal' },
    { code: '33228', summary: 'PPM generator replacement, dual lead', description: 'Removal of permanent pacemaker pulse generator with replacement of pacemaker pulse generator; dual lead system', rvu: 5.36, colorTheme: 'teal' },
    { code: '33229', summary: 'PPM generator replacement, multiple lead', description: 'Removal of permanent pacemaker pulse generator with replacement of pacemaker pulse generator; multiple lead system', rvu: 5.64, colorTheme: 'teal' }
  ],

  'ICD Implant': [
    { code: 'HEADER-INITIAL', summary: '— Initial Implant —', description: '', isDivider: true },
    { code: '33249', summary: 'ICD implant, single/dual chamber', description: 'Insertion or replacement of permanent implantable defibrillator system with transvenous lead(s), single or dual chamber', rvu: 13.81, colorTheme: 'orange' },
    { code: '33230', summary: 'ICD generator only, dual leads', description: 'Insertion of implantable defibrillator pulse generator only; with existing dual leads', rvu: 6.60, colorTheme: 'orange' },
    { code: '33231', summary: 'ICD generator only, single lead', description: 'Insertion of implantable defibrillator pulse generator only; with existing single lead', rvu: 6.28, colorTheme: 'orange' },
    { code: '33240', summary: 'ICD generator only, multiple leads', description: 'Insertion of implantable defibrillator pulse generator only; with existing multiple leads', rvu: 7.00, colorTheme: 'orange' },

    { code: 'HEADER-REPLACEMENT', summary: '— Generator Replacement —', description: '', isDivider: true },
    { code: '33262', summary: 'ICD generator replacement, single lead', description: 'Removal of implantable defibrillator pulse generator with replacement of implantable defibrillator pulse generator; single lead system', rvu: 6.81, colorTheme: 'orange' },
    { code: '33263', summary: 'ICD generator replacement, dual lead', description: 'Removal of implantable defibrillator pulse generator with replacement of implantable defibrillator pulse generator; dual lead system', rvu: 7.07, colorTheme: 'orange' },
    { code: '33264', summary: 'ICD generator replacement, multiple lead', description: 'Removal of implantable defibrillator pulse generator with replacement of implantable defibrillator pulse generator; multiple lead system', rvu: 7.35, colorTheme: 'orange' }
  ],

  'CRT (BiV) Implant': [
    { code: '33224', summary: 'LV lead insertion (upgrade to CRT)', description: 'Insertion of pacing electrode, cardiac venous system, for left ventricular pacing, with attachment to previously placed pacemaker or pacing cardioverter-defibrillator pulse generator (including revision of pocket, removal, insertion, and/or replacement of existing generator)', rvu: 8.50, colorTheme: 'amber' },
    { code: '33225', summary: 'LV lead at CRT implant (add-on)', description: 'Insertion of pacing electrode, cardiac venous system, for left ventricular pacing, at time of insertion of implantable defibrillator or pacemaker pulse generator (eg, for upgrade to dual chamber system) (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 5.00, colorTheme: 'amber' },
    { code: '33226', summary: 'LV lead repositioning', description: 'Repositioning of previously implanted cardiac venous system (left ventricular) electrode (including removal, insertion and/or replacement of existing generator)', rvu: 5.75, colorTheme: 'amber' }
  ],

  'Leadless Pacemaker': [
    { code: '33274', summary: 'Leadless PPM insertion', description: 'Transcatheter insertion or replacement of permanent leadless pacemaker, right ventricular, including imaging guidance (eg, fluoroscopy, venous ultrasound, ventriculography, femoral venography) and device evaluation (eg, interrogation or programming), when performed', rvu: 9.27, colorTheme: 'cyan' },
    { code: '33275', summary: 'Leadless PPM removal', description: 'Transcatheter removal of permanent leadless pacemaker, right ventricular', rvu: 10.50, colorTheme: 'cyan' }
  ],

  'Subcutaneous ICD': [
    { code: '33270', summary: 'S-ICD implant', description: 'Insertion or replacement of permanent subcutaneous implantable defibrillator system, with subcutaneous electrode, including defibrillation threshold evaluation, induction of arrhythmia, evaluation of sensing for arrhythmia termination, and programming or reprogramming of sensing or therapeutic parameters, when performed', rvu: 12.38, colorTheme: 'rose' },
    { code: '33271', summary: 'S-ICD electrode insertion', description: 'Insertion of subcutaneous implantable defibrillator electrode', rvu: 5.50, colorTheme: 'rose' },
    { code: '33272', summary: 'S-ICD electrode removal', description: 'Removal of subcutaneous implantable defibrillator electrode', rvu: 6.00, colorTheme: 'rose' },
    { code: '33273', summary: 'S-ICD electrode repositioning', description: 'Repositioning of previously implanted subcutaneous implantable defibrillator electrode', rvu: 5.25, colorTheme: 'rose' }
  ],

  'Device Revision/Upgrade': [
    { code: '33214', summary: 'Upgrade single to dual chamber PPM', description: 'Upgrade of implanted pacemaker system, conversion of single chamber system to dual chamber system (includes removal of previously placed pulse generator, testing of existing lead, insertion of new lead, insertion of new pulse generator)', rvu: 7.75, colorTheme: 'slate' },
    { code: '33215', summary: 'Electrode repositioning', description: 'Repositioning of previously implanted transvenous pacemaker or implantable defibrillator (right atrial or right ventricular) electrode', rvu: 4.50, colorTheme: 'slate' },
    { code: '33216', summary: 'Single transvenous electrode insertion', description: 'Insertion of a single transvenous electrode, permanent pacemaker or implantable defibrillator', rvu: 4.85, colorTheme: 'slate' },
    { code: '33217', summary: 'Dual transvenous electrode insertion', description: 'Insertion of 2 transvenous electrodes, permanent pacemaker or implantable defibrillator', rvu: 6.50, colorTheme: 'slate' },
    { code: '33218', summary: 'Single electrode repair', description: 'Repair of single transvenous electrode, permanent pacemaker or implantable defibrillator', rvu: 4.25, colorTheme: 'slate' },
    { code: '33220', summary: 'Dual electrode repair', description: 'Repair of 2 transvenous electrodes for permanent pacemaker or implantable defibrillator', rvu: 5.50, colorTheme: 'slate' },
    { code: '33221', summary: 'PPM generator with multiple leads', description: 'Insertion of pacemaker pulse generator only; with existing multiple leads', rvu: 5.50, colorTheme: 'slate' },
    { code: '33222', summary: 'PPM pocket relocation', description: 'Relocation of skin pocket for pacemaker', rvu: 4.00, colorTheme: 'slate' },
    { code: '33223', summary: 'ICD pocket relocation', description: 'Relocation of skin pocket for implantable defibrillator', rvu: 4.50, colorTheme: 'slate' }
  ],

  'Lead Extraction': [
    { code: '33234', summary: 'Lead extraction, single (atrial or ventricular)', description: 'Removal of transvenous pacemaker electrode(s); single lead system, atrial or ventricular', rvu: 8.50, colorTheme: 'fuchsia' },
    { code: '33235', summary: 'Lead extraction, dual', description: 'Removal of transvenous pacemaker electrode(s); dual lead system', rvu: 10.50, colorTheme: 'fuchsia' },
    { code: '33241', summary: 'ICD electrode removal (thoracotomy)', description: 'Removal of implantable defibrillator electrode(s); by thoracotomy', rvu: 22.00, colorTheme: 'fuchsia' },
    { code: '33244', summary: 'ICD lead extraction', description: 'Removal of single or dual chamber implantable defibrillator electrode(s); by transvenous extraction', rvu: 12.00, colorTheme: 'fuchsia' }
  ],

  'Loop Recorder': [
    { code: '33285', summary: 'ILR insertion', description: 'Insertion, subcutaneous cardiac rhythm monitor, including programming', rvu: 2.25, colorTheme: 'lime' },
    { code: '33286', summary: 'ILR removal', description: 'Removal, subcutaneous cardiac rhythm monitor', rvu: 1.50, colorTheme: 'lime' }
  ],

  'External Cardioversion': [
    { code: '92960', summary: 'External cardioversion', description: 'Cardioversion, elective, electrical conversion of arrhythmia; external', rvu: 2.72, colorTheme: 'pink' },
    { code: '92961', summary: 'Internal cardioversion', description: 'Cardioversion, elective, electrical conversion of arrhythmia; internal (separate procedure)', rvu: 5.25, colorTheme: 'pink' }
  ],

  'Tilt Table': [
    { code: '95921', summary: 'Autonomic testing, cardiovagal', description: 'Testing of autonomic nervous system function; cardiovagal innervation (parasympathetic function), including 2 or more of the following: heart rate response to deep breathing with a paced breathing rate, Valsalva ratio, and 30:15 ratio', rvu: 1.25, colorTheme: 'stone' },
    { code: '95922', summary: 'Autonomic testing, adrenergic', description: 'Testing of autonomic nervous system function; adrenergic innervation (sympathetic adrenergic function), including beat-to-beat blood pressure and R-R interval changes during Valsalva maneuver and at least 5 minutes of passive tilt', rvu: 1.50, colorTheme: 'stone' },
    { code: '95924', summary: 'Autonomic testing, comprehensive (tilt table)', description: 'Testing of autonomic nervous system function; combined parasympathetic and sympathetic adrenergic function testing with tilt table evaluation', rvu: 2.75, colorTheme: 'stone' }
  ]
};

// Color mapping for EP categories
export const epCategoryColors: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  'EP Studies (Diagnostic)': { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'SVT/AVNRT Ablation': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Atrial Flutter Ablation': { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Atrial Fibrillation Ablation': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'VT Ablation': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Pacemaker Implant': { dot: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'ICD Implant': { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'CRT (BiV) Implant': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Leadless Pacemaker': { dot: 'bg-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Subcutaneous ICD': { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Device Revision/Upgrade': { dot: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  'Lead Extraction': { dot: 'bg-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  'Loop Recorder': { dot: 'bg-lime-500', bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  'External Cardioversion': { dot: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  'Tilt Table': { dot: 'bg-stone-500', bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' }
};

// All EP codes flattened for search
export function getAllEPCodes(): EPCode[] {
  return Object.values(epCategories).flat().filter(code => !code.isDivider);
}

// Get category for a given code
export function getEPCategory(code: string): string | undefined {
  for (const [category, codes] of Object.entries(epCategories)) {
    if (codes.some(c => c.code === code)) {
      return category;
    }
  }
  return undefined;
}
