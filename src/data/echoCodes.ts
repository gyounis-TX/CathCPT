import { CPTCode } from '../types';

// Echocardiography CPT Codes organized by subcategory
// All RVU values are 2026 CMS Physician Fee Schedule

export interface EchoCode extends CPTCode {
  rvu?: number;
  colorTheme?: string;
}

export const echoCategories: Record<string, EchoCode[]> = {
  'TTE Complete': [
    { code: '93306', summary: 'TTE complete with Doppler', description: 'Echocardiography, transthoracic, real-time with image documentation (2D), includes M-mode recording, when performed, complete, with spectral Doppler echocardiography, and with color flow Doppler echocardiography', rvu: 1.30, colorTheme: 'sky' },
    { code: '93307', summary: 'TTE complete without Doppler', description: 'Echocardiography, transthoracic, real-time with image documentation (2D), includes M-mode recording, when performed, complete, without spectral or color flow Doppler echocardiography', rvu: 0.92, colorTheme: 'sky' }
  ],

  'TTE Limited': [
    { code: '93308', summary: 'TTE limited/follow-up', description: 'Echocardiography, transthoracic, real-time with image documentation (2D), includes M-mode recording, when performed, follow-up or limited study', rvu: 0.53, colorTheme: 'sky' }
  ],

  'TTE with Doppler': [
    { code: '93320', summary: 'Doppler echo, complete', description: 'Doppler echocardiography, pulsed wave and/or continuous wave with spectral display (List separately in addition to codes for echocardiographic imaging); complete', isAddOn: true, rvu: 0.38, colorTheme: 'cyan' },
    { code: '93321', summary: 'Doppler echo, limited', description: 'Doppler echocardiography, pulsed wave and/or continuous wave with spectral display (List separately in addition to codes for echocardiographic imaging); follow-up or limited study (List separately in addition to codes for echocardiographic imaging)', isAddOn: true, rvu: 0.21, colorTheme: 'cyan' },
    { code: '93325', summary: 'Color flow Doppler (add-on)', description: 'Doppler echocardiography color flow velocity mapping (List separately in addition to codes for echocardiography)', isAddOn: true, rvu: 0.17, colorTheme: 'cyan' }
  ],

  'TEE': [
    { code: '93312', summary: 'TEE complete', description: 'Echocardiography, transesophageal, real-time with image documentation (2D) (with or without M-mode recording); including probe placement, image acquisition, interpretation and report', rvu: 2.13, colorTheme: 'rose' },
    { code: '93313', summary: 'TEE probe placement only', description: 'Echocardiography, transesophageal, real-time with image documentation (2D) (with or without M-mode recording); placement of transesophageal probe only', rvu: 0.96, colorTheme: 'rose' },
    { code: '93314', summary: 'TEE image acquisition only', description: 'Echocardiography, transesophageal, real-time with image documentation (2D) (with or without M-mode recording); image acquisition, interpretation and report only', rvu: 1.17, colorTheme: 'rose' },
    { code: '93315', summary: 'TEE congenital, complete', description: 'Transesophageal echocardiography for congenital cardiac anomalies; including probe placement, image acquisition, interpretation and report', rvu: 2.50, colorTheme: 'rose' },
    { code: '93316', summary: 'TEE congenital, probe only', description: 'Transesophageal echocardiography for congenital cardiac anomalies; placement of transesophageal probe only', rvu: 1.10, colorTheme: 'rose' },
    { code: '93317', summary: 'TEE congenital, image only', description: 'Transesophageal echocardiography for congenital cardiac anomalies; image acquisition, interpretation and report only', rvu: 1.40, colorTheme: 'rose' },
    { code: '93318', summary: 'TEE intraoperative monitoring', description: 'Echocardiography, transesophageal (TEE) for monitoring purposes, including probe placement, real time 2-dimensional image acquisition and interpretation leading to ongoing (continuous) assessment of (dynamically changing) cardiac pumping function and target ablation of ventricular tachycardia', rvu: 2.75, colorTheme: 'rose' }
  ],

  'Stress Echo': [
    { code: '93350', summary: 'Stress echo, complete', description: 'Echocardiography, transthoracic, real-time with image documentation (2D), includes M-mode recording, when performed, during rest and cardiovascular stress test using treadmill, bicycle exercise and/or pharmacologically induced stress, with interpretation and report', rvu: 1.10, colorTheme: 'lime' },
    { code: '93351', summary: 'Stress echo with ECG monitoring', description: 'Echocardiography, transthoracic, real-time with image documentation (2D), includes M-mode recording, when performed, during rest and cardiovascular stress test using treadmill, bicycle exercise and/or pharmacologically induced stress, with interpretation and report; including performance of continuous electrocardiographic monitoring, with supervision by a physician or other qualified health care professional', rvu: 1.50, colorTheme: 'lime' }
  ],

  'Congenital Echo': [
    { code: '93303', summary: 'TTE congenital, complete', description: 'Transthoracic echocardiography for congenital cardiac anomalies; complete', rvu: 1.75, colorTheme: 'violet' },
    { code: '93304', summary: 'TTE congenital, limited', description: 'Transthoracic echocardiography for congenital cardiac anomalies; follow-up or limited study', rvu: 0.85, colorTheme: 'violet' }
  ],

  'Contrast Echo': [
    { code: '93352', summary: 'Contrast agent for echo (add-on)', description: 'Use of echocardiographic contrast agent during stress echocardiography (List separately in addition to codes for primary procedure)', isAddOn: true, rvu: 0.15, colorTheme: 'amber' }
  ],

  'Strain Imaging': [
    { code: '93356', summary: 'Myocardial strain imaging (add-on)', description: 'Myocardial strain imaging using speckle tracking-derived assessment of myocardial mechanics (List separately in addition to codes for echocardiography imaging)', isAddOn: true, rvu: 0.25, colorTheme: 'indigo' }
  ],

  '3D Echo': [
    { code: '93355', summary: '3D TEE for structural intervention', description: 'Echocardiography, transesophageal (TEE) for guidance of a transcatheter intracardiac or great vessel(s) structural intervention(s) (eg, TAVR, transcatheter pulmonary valve replacement, mitral valve repair, paravalvular regurgitation repair, left atrial appendage occlusion/closure, ventricular septal defect closure) (peri- and intra-procedural), real-time image acquisition and documentation, guidance with quantitative measurements, probe manipulation, interpretation, and report, including diagnostic transesophageal echocardiography and target ablation of ventricular tachycardia', rvu: 4.50, colorTheme: 'purple' },
    { code: '76376', summary: '3D rendering, concurrent', description: '3D rendering with interpretation and reporting of computed tomography, magnetic resonance imaging, ultrasound, or other tomographic modality with image postprocessing under concurrent supervision; not requiring image postprocessing on an independent workstation', rvu: 0.20, colorTheme: 'purple' },
    { code: '76377', summary: '3D rendering, workstation', description: '3D rendering with interpretation and reporting of computed tomography, magnetic resonance imaging, ultrasound, or other tomographic modality with image postprocessing under concurrent supervision; requiring image postprocessing on an independent workstation', rvu: 0.50, colorTheme: 'purple' }
  ],

  'Intracardiac Echo (ICE)': [
    { code: '93662', summary: 'Intracardiac echo (ICE) (add-on)', description: 'Intracardiac echocardiography during therapeutic/diagnostic intervention, including imaging supervision and interpretation (List separately in addition to code for primary procedure)', isAddOn: true, rvu: 2.00, colorTheme: 'fuchsia' }
  ]
};

// Color mapping for Echo categories
export const echoCategoryColors: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  'TTE Complete': { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'TTE Limited': { dot: 'bg-sky-400', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
  'TTE with Doppler': { dot: 'bg-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'TEE': { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Stress Echo': { dot: 'bg-lime-500', bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  'Congenital Echo': { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'Contrast Echo': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Strain Imaging': { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  '3D Echo': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Intracardiac Echo (ICE)': { dot: 'bg-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' }
};

// All Echo codes flattened for search
export function getAllEchoCodes(): EchoCode[] {
  return Object.values(echoCategories).flat().filter(code => !code.isDivider);
}

// Get category for a given code
export function getEchoCategory(code: string): string | undefined {
  for (const [category, codes] of Object.entries(echoCategories)) {
    if (codes.some(c => c.code === code)) {
      return category;
    }
  }
  return undefined;
}
