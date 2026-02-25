import { CPTCode } from '../types';

// 2026 CPT Codes for Interventional Cardiology (organized by category)
export const cptCategories: Record<string, CPTCode[]> = {
  'Diagnostic Cardiac': [
    { code: '93451', summary: 'Right heart cath', description: 'Right heart catheterization including oxygen saturation and cardiac output measurements' },
    { code: '93452', summary: 'Left heart cath with LV gram', description: 'Left heart catheterization including left ventriculography, imaging and interpretation' },
    { code: '93453', summary: 'Combined R+L heart cath with LV gram', description: 'Combined right and left heart catheterization including left ventriculography' },
    { code: '93454', summary: 'Coronary angiography only', description: 'Catheter placement in coronary artery(s) for coronary angiography, imaging and interpretation' },
    { code: '93455', summary: 'Coronary angio + bypass grafts', description: 'Catheter placement in coronary artery(s) for angiography with catheter placement in bypass graft(s)' },
    { code: '93456', summary: 'Coronary angio + right heart cath', description: 'Catheter placement in coronary artery(s) for angiography with right heart catheterization' },
    { code: '93457', summary: 'Coronary angio + grafts + right heart', description: 'Catheter placement in coronary artery(s) for angiography with bypass graft(s) and right heart catheterization' },
    { code: '93458', summary: 'Coronary angio + left heart/LV gram', description: 'Catheter placement in coronary artery(s) for angiography with left heart catheterization including left ventriculography' },
    { code: '93459', summary: 'Coronary angio + left heart + grafts', description: 'Catheter placement in coronary artery(s) for angiography with left heart catheterization and bypass graft(s)' },
    { code: '93460', summary: 'Coronary angio + combined R+L heart', description: 'Catheter placement in coronary artery(s) for angiography with combined right and left heart catheterization including left ventriculography' },
    { code: '93461', summary: 'Coronary angio + combined R+L + grafts', description: 'Catheter placement in coronary artery(s) for angiography with combined right and left heart catheterization and bypass graft(s)' }
  ],
  'PCI': [
    { code: '92920', description: 'Percutaneous transluminal coronary angioplasty; single major artery and/or its branches', summary: 'PTCA single artery' },
    { code: '92924', description: 'Percutaneous transluminal coronary atherectomy, with coronary angioplasty when performed; single major artery and/or its branches', summary: 'Atherectomy + PTCA' },
    { code: '92928', description: 'Percutaneous transcatheter placement of intracoronary stent(s), with coronary angioplasty when performed, single major artery and/or its branches; one lesion involving one or more coronary segment', summary: 'Stent, single lesion' },
    { code: '92930', description: 'Percutaneous transcatheter placement of intracoronary stent(s), with coronary angioplasty when performed, single major artery and/or its branches; two or more distinct coronary lesions with two or more coronary stents deployed in two or more coronary segments, or a bifurcation lesion requiring angioplasty and/or stenting in both the main artery and the side branch', summary: 'Stent, 2+ lesions/bifurcation' },
    { code: '92933', description: 'Percutaneous transluminal coronary atherectomy, with intracoronary stent, with coronary angioplasty when performed; single major coronary artery and/or its branches', summary: 'Atherectomy + stent' },
    { code: '92937', description: 'Percutaneous transluminal revascularization of or through coronary artery bypass graft (internal mammary, free arterial, venous), any combination of intracoronary stent, atherectomy and angioplasty, including distal protection when performed; single major coronary artery and/or its branches', summary: 'Bypass graft intervention' },
    { code: '92941', description: 'Percutaneous transluminal revascularization of acute total/subtotal occlusion during acute myocardial infarction, any combination of intracoronary stent, atherectomy and angioplasty, including aspiration thrombectomy when performed; single major coronary artery and/or its branches or single bypass graft and/or its subtended branches', summary: 'Acute MI revascularization' },
    { code: '92943', description: 'Percutaneous transluminal revascularization of chronic total occlusion, single coronary artery, coronary artery branch, or coronary artery bypass graft and/or subtended major coronary artery branches of the bypass graft, any combination of intracoronary stent, atherectomy and angioplasty; antegrade approach', summary: 'CTO, antegrade' },
    { code: '92945', description: 'Percutaneous transluminal revascularization of chronic total occlusion, single coronary artery, coronary artery branch, or coronary artery bypass graft and/or subtended major coronary artery branches of the bypass graft, any combination of intracoronary stent, atherectomy and angioplasty; combined antegrade and retrograde approaches', summary: 'CTO, antegrade + retrograde' },
    { code: '0913T', summary: 'DCB single vessel (standalone)', description: 'Percutaneous transcatheter therapeutic drug delivery by intracoronary drug-delivery balloon (e.g., drug-coated, drug-eluting), including mechanical dilation by nondrug delivery balloon angioplasty, endoluminal imaging using intravascular ultrasound (IVUS) or optical coherence tomography (OCT) when performed, imaging supervision, interpretation, and report, single major coronary artery or branch', isNew: true, requiresVessel: true },
    { code: '0914T', summary: 'DCB add-on for separate lesion', description: 'Percutaneous transcatheter therapeutic drug delivery by intracoronary drug-delivery balloon (e.g., drug-coated, drug-eluting) performed on a separate target lesion from the target lesion treated with balloon angioplasty, coronary stent placement or coronary atherectomy, including mechanical dilation by nondrug-delivery balloon angioplasty, endoluminal imaging using intravascular ultrasound (IVUS) or optical coherence tomography (OCT) when performed, imaging supervision, interpretation, and report, single major coronary artery or branch (List separately in addition to code for percutaneous coronary stent or atherectomy intervention)', isNew: true, isAddOn: true, requiresVessel: true }
  ],
  'PCI Add-on Procedures': [
    { code: '92972', summary: 'Coronary lithotripsy (IVL)', description: 'Percutaneous transluminal coronary lithotripsy (List separately in addition to code for primary procedure)', isAddOn: true },
    { code: '92973', summary: 'Mechanical thrombectomy', description: 'Percutaneous transluminal coronary mechanical aspiration thrombectomy (List separately in addition to code for primary procedure)', isAddOn: true },
    { code: '92974', summary: 'Brachytherapy device placement', description: 'Transcatheter placement of radiation delivery device for subsequent coronary intravascular brachytherapy (List separately in addition to code for primary procedure)', isAddOn: true }
  ],
  'Intravascular Imaging & Physiology': [
    { code: '92978', summary: 'IVUS/OCT initial vessel', description: 'Endoluminal imaging of coronary vessel or graft using intravascular ultrasound (IVUS) or optical coherence tomography (OCT) during diagnostic evaluation and/or therapeutic intervention including imaging supervision, interpretation, and report; initial vessel', isAddOn: true, requiresVessel: true },
    { code: '92979', summary: 'IVUS/OCT each additional vessel', description: 'Endoluminal imaging of coronary vessel or graft using intravascular ultrasound (IVUS) or optical coherence tomography (OCT) during diagnostic evaluation and/or therapeutic intervention including imaging supervision, interpretation, and report; each additional vessel', isAddOn: true, requiresVessel: true },
    { code: '93571', summary: 'FFR/CFR initial vessel', description: 'Intravascular Doppler velocity and/or pressure derived coronary flow reserve measurement (coronary vessel or graft) during coronary angiography including pharmacologically induced stress, when performed; initial vessel', isAddOn: true, requiresVessel: true },
    { code: '93572', summary: 'FFR/CFR each additional vessel', description: 'Intravascular Doppler velocity and/or pressure derived coronary flow reserve measurement (coronary vessel or graft) during coronary angiography including pharmacologically induced stress, when performed; each additional vessel', isAddOn: true, requiresVessel: true },
    { code: '0523T', summary: 'OCT initial vessel', description: 'Intravascular coronary optical coherence tomography (OCT), initial vessel (List separately in addition to code for primary procedure)', isAddOn: true, requiresVessel: true },
    { code: '0524T', summary: 'OCT each additional vessel', description: 'Intravascular coronary optical coherence tomography (OCT), each additional vessel (List separately in addition to code for primary procedure)', isAddOn: true, requiresVessel: true },
    { code: '93662', summary: 'Intracardiac echo (ICE) (add-on)', description: 'Intracardiac echocardiography during therapeutic/diagnostic intervention, including imaging supervision and interpretation (List separately in addition to code for primary procedure)', isAddOn: true }
  ],
  'TAVR': [
    { code: '33361', summary: 'TAVR, percutaneous femoral', description: 'TAVR, percutaneous femoral artery access' },
    { code: '33362', summary: 'TAVR, open femoral', description: 'TAVR, open femoral artery access' },
    { code: '33363', summary: 'TAVR, open axillary', description: 'TAVR, open axillary artery access' },
    { code: '33364', summary: 'TAVR, open iliac', description: 'TAVR, open iliac artery access' },
    { code: '33365', summary: 'TAVR, transaortic', description: 'TAVR, transaortic access' },
    { code: '33366', summary: 'TAVR, transapical', description: 'TAVR, transapical access' },
    { code: '33367', summary: 'TAVR, CPB support', description: 'TAVR, cardiopulmonary bypass support', isAddOn: true },
    { code: '33368', summary: 'TAVR, transcarotid', description: 'TAVR, transcarotid access' },
    { code: '33369', summary: 'TAVR, transcaval', description: 'TAVR, transcaval access' }
  ],
  'Balloon Valvuloplasty': [
    { code: '92986', summary: 'Aortic valvuloplasty (BAV)', description: 'Percutaneous balloon aortic valvuloplasty' },
    { code: '92987', summary: 'Mitral valvuloplasty (BMV)', description: 'Percutaneous balloon mitral valvuloplasty' },
    { code: '92990', summary: 'Pulmonary valvuloplasty (BPV)', description: 'Percutaneous balloon pulmonary valvuloplasty' },
  ],
  'Structural Heart Interventions': [
    { code: '33477', summary: 'TPVI (pulmonary valve)', description: 'Transcatheter pulmonary valve implantation, percutaneous approach (e.g., Melody valve)' },
    { code: '93580', summary: 'ASD closure', description: 'Percutaneous transcatheter closure of congenital atrial septal defect' },
    { code: '93581', summary: 'VSD closure', description: 'Percutaneous transcatheter closure of ventricular septal defect' },
    { code: '93582', summary: 'PFO closure', description: 'Percutaneous transcatheter closure of patent foramen ovale' },
    { code: '93583', summary: 'Septal reduction for HOCM', description: 'Percutaneous transcatheter septal reduction therapy (alcohol septal ablation) for hypertrophic obstructive cardiomyopathy (HOCM)' },
    { code: '93590', summary: 'Paravalvular leak closure, initial', description: 'Percutaneous transcatheter closure of paravalvular leak, initial occlusion device' },
    { code: '93591', summary: 'Paravalvular leak closure, add-on', description: 'Percutaneous transcatheter closure of paravalvular leak, each additional device', isAddOn: true },
    { code: '33340', summary: 'LAA closure (Watchman)', description: 'Percutaneous transcatheter closure of left atrial appendage with endocardial implant (requires Q0 modifier, dual Dx: AF + Z00.6)' },
    { code: '33418', summary: 'TMVR, initial', description: 'Transcatheter mitral valve repair, percutaneous approach, initial prosthesis' },
    { code: '33419', summary: 'TMVR, additional', description: 'Transcatheter mitral valve repair, percutaneous approach, additional prosthesis(es) during same session', isAddOn: true },
    { code: '0569T', summary: 'TTVR, percutaneous', description: 'Transcatheter tricuspid valve repair, percutaneous approach; initial prosthesis' },
    { code: '0570T', summary: 'TTVR, additional', description: 'Transcatheter tricuspid valve repair, percutaneous approach; each additional prosthesis during same session', isAddOn: true }
  ],
  'Aortoiliac/Abdominal': [
    // Catheter Placement
    { code: 'HEADER-CATH', summary: '— Catheter Placement —', description: '', isDivider: true },
    { code: '36200', summary: 'Aorta catheter placement', description: 'Introduction of catheter, aorta, translumbar or retrograde brachial/femoral artery approach, for aortography' },
    { code: '36245', summary: 'Selective 1st order abdominal/pelvic', description: 'Selective catheter placement, first order abdominal, pelvic, or lower extremity artery branch' },
    { code: '36246', summary: 'Selective 2nd order abdominal/pelvic', description: 'Selective catheter placement, second order abdominal, pelvic, or lower extremity artery branch' },
    { code: '36247', summary: 'Selective 3rd+ order abdominal/pelvic', description: 'Selective catheter placement, third order and beyond abdominal, pelvic, or lower extremity artery branch' },
    // Imaging
    { code: 'HEADER-IMG', summary: '— Imaging (S&I) —', description: '', isDivider: true },
    { code: '75625', summary: 'Abdominal aortography S&I', description: 'Aortography, abdominal, by serialography, radiological supervision and interpretation' },
    { code: '75716', summary: 'Bilateral extremity angiography S&I', description: 'Angiography, extremity, bilateral, radiological supervision and interpretation' },
    { code: '75774', summary: 'Additional vessel angiography S&I', description: 'Angiography, selective, each additional vessel studied after basic examination, radiological supervision and interpretation (add-on)', isAddOn: true }
  ],
  'Lower Extremity': [
    // Catheter Placement
    { code: 'HEADER-CATH', summary: '— Catheter Placement —', description: '', isDivider: true },
    { code: '36245', summary: 'Selective 1st order lower extremity', description: 'Selective catheter placement, first order lower extremity artery branch' },
    { code: '36246', summary: 'Selective 2nd order lower extremity', description: 'Selective catheter placement, second order lower extremity artery branch' },
    { code: '36247', summary: 'Selective 3rd+ order lower extremity', description: 'Selective catheter placement, third order and beyond lower extremity artery branch' },
    // Imaging
    { code: 'HEADER-IMG', summary: '— Imaging (S&I) —', description: '', isDivider: true },
    { code: '75710', summary: 'Unilateral extremity angiography S&I', description: 'Angiography, extremity, unilateral, radiological supervision and interpretation' },
    { code: '75716', summary: 'Bilateral extremity angiography S&I', description: 'Angiography, extremity, bilateral, radiological supervision and interpretation' },
    { code: '75774', summary: 'Additional vessel angiography S&I', description: 'Angiography, selective, each additional vessel studied after basic examination, radiological supervision and interpretation (add-on)', isAddOn: true }
  ],
  'Upper Extremity': [
    // Catheter Placement
    { code: 'HEADER-CATH', summary: '— Catheter Placement —', description: '', isDivider: true },
    { code: '36215', summary: 'Selective 1st order upper extremity', description: 'Selective catheter placement, first order arterial branch within the thoracic or brachiocephalic tree' },
    { code: '36216', summary: 'Selective 2nd order upper extremity', description: 'Selective catheter placement, second order arterial branch within the thoracic or brachiocephalic tree' },
    { code: '36217', summary: 'Selective 3rd+ order upper extremity', description: 'Selective catheter placement, third order and beyond arterial branch within the thoracic or brachiocephalic tree' },
    // Imaging
    { code: 'HEADER-IMG', summary: '— Imaging (S&I) —', description: '', isDivider: true },
    { code: '75710', summary: 'Unilateral extremity angiography S&I', description: 'Angiography, extremity, unilateral, radiological supervision and interpretation' },
    { code: '75774', summary: 'Additional vessel angiography S&I', description: 'Angiography, selective, each additional vessel studied after basic examination, radiological supervision and interpretation (add-on)', isAddOn: true }
  ],
  'Renal': [
    // Catheter Placement
    { code: 'HEADER-CATH', summary: '— Catheter Placement —', description: '', isDivider: true },
    { code: '36245', summary: 'Selective 1st order renal', description: 'Selective catheter placement, first order renal artery branch' },
    { code: '36246', summary: 'Selective 2nd order renal', description: 'Selective catheter placement, second order renal artery branch' },
    { code: '36247', summary: 'Selective 3rd+ order renal', description: 'Selective catheter placement, third order and beyond renal artery branch' },
    // Imaging
    { code: 'HEADER-IMG', summary: '— Imaging (S&I) —', description: '', isDivider: true },
    { code: '75722', summary: 'Unilateral renal angiography S&I', description: 'Angiography, renal, unilateral, selective (including flush aortography), radiological supervision and interpretation' },
    { code: '75724', summary: 'Bilateral renal angiography S&I', description: 'Angiography, renal, bilateral, selective (including flush aortography), radiological supervision and interpretation' }
  ],
  'Renal Intervention': [
    // Renal Stenting
    { code: 'HEADER-STENT', summary: '— Renal Stenting —', description: '', isDivider: true },
    { code: '37246', summary: 'Renal artery PTA, initial', description: 'Transluminal balloon angioplasty (except dialysis circuit), open or percutaneous, including all imaging and radiological supervision and interpretation necessary to perform the angioplasty within the same renal artery; initial renal artery' },
    { code: '37247', summary: 'Renal artery PTA, additional (add-on)', description: 'Transluminal balloon angioplasty (except dialysis circuit), open or percutaneous, including all imaging and radiological supervision and interpretation; each additional renal artery', isAddOn: true },
    { code: '37248', summary: 'Renal artery stent, initial', description: 'Transluminal stent placement (except dialysis circuit), open or percutaneous, including imaging guidance, renal artery; initial artery' },
    { code: '37249', summary: 'Renal artery stent, additional (add-on)', description: 'Transluminal stent placement (except dialysis circuit), open or percutaneous, including imaging guidance, renal artery; each additional renal artery', isAddOn: true },
    // Renal Denervation
    { code: 'HEADER-DENERV', summary: '— Renal Denervation —', description: '', isDivider: true },
    { code: '0338T', summary: 'Renal denervation, unilateral', description: 'Transcatheter renal sympathetic denervation, percutaneous approach including transluminal access, unilateral' },
    { code: '0339T', summary: 'Renal denervation, bilateral', description: 'Transcatheter renal sympathetic denervation, percutaneous approach including transluminal access, bilateral' }
  ],
  'Mesenteric': [
    // Catheter Placement
    { code: 'HEADER-CATH', summary: '— Catheter Placement —', description: '', isDivider: true },
    { code: '36245', summary: 'Selective 1st order mesenteric', description: 'Selective catheter placement, first order mesenteric (celiac, SMA, IMA) artery' },
    { code: '36246', summary: 'Selective 2nd order mesenteric', description: 'Selective catheter placement, second order mesenteric artery branch' },
    { code: '36247', summary: 'Selective 3rd+ order mesenteric', description: 'Selective catheter placement, third order and beyond mesenteric artery branch' },
    // Imaging
    { code: 'HEADER-IMG', summary: '— Imaging (S&I) —', description: '', isDivider: true },
    { code: '75726', summary: 'Visceral angiography S&I', description: 'Angiography, visceral, selective or supraselective (celiac, superior/inferior mesenteric), radiological supervision and interpretation' },
    { code: '75774', summary: 'Additional vessel angiography S&I', description: 'Angiography, selective, each additional vessel studied after basic examination, radiological supervision and interpretation (add-on)', isAddOn: true }
  ],
  'Mesenteric Intervention': [
    // Mesenteric PTA/Stenting
    { code: '37220', summary: 'Visceral artery PTA, initial', description: 'Revascularization, endovascular, open or percutaneous, iliac artery, unilateral, initial vessel; with transluminal angioplasty (also applies to visceral arteries)' },
    { code: '37221', summary: 'Visceral artery stent, initial', description: 'Revascularization, endovascular, open or percutaneous; with transluminal stent placement(s), includes angioplasty within the same vessel, when performed' },
    { code: '37236', summary: 'Mesenteric stent, initial', description: 'Transcatheter placement of an intravascular stent(s) (except lower extremity, cervical carotid, extracranial vertebral or intrathoracic carotid, intracranial, or coronary), open or percutaneous, including radiological supervision and interpretation and including angioplasty within the same vessel, when performed; initial artery' },
    { code: '37237', summary: 'Mesenteric stent, additional (add-on)', description: 'Transcatheter placement of an intravascular stent(s), each additional artery', isAddOn: true }
  ],
  'Pelvic': [
    // Catheter Placement
    { code: 'HEADER-CATH', summary: '— Catheter Placement —', description: '', isDivider: true },
    { code: '36245', summary: 'Selective 1st order pelvic', description: 'Selective catheter placement, first order pelvic artery branch (internal iliac)' },
    { code: '36246', summary: 'Selective 2nd order pelvic', description: 'Selective catheter placement, second order pelvic artery branch' },
    { code: '36247', summary: 'Selective 3rd+ order pelvic', description: 'Selective catheter placement, third order and beyond pelvic artery branch' },
    // Imaging
    { code: 'HEADER-IMG', summary: '— Imaging (S&I) —', description: '', isDivider: true },
    { code: '75736', summary: 'Pelvic angiography S&I', description: 'Angiography, pelvic, selective or supraselective, radiological supervision and interpretation' },
    { code: '75774', summary: 'Additional vessel angiography S&I', description: 'Angiography, selective, each additional vessel studied after basic examination, radiological supervision and interpretation (add-on)', isAddOn: true }
  ],
  'Iliac': [
    { code: '37254', summary: 'Iliac, simple, PTA', description: 'Iliac artery, straightforward lesion, angioplasty' },
    { code: '37255', summary: 'Iliac, simple, stent', description: 'Iliac artery, straightforward lesion, stent with/without angioplasty' },
    { code: '37256', summary: 'Iliac, simple, atherectomy', description: 'Iliac artery, straightforward lesion, atherectomy with/without angioplasty' },
    { code: '37257', summary: 'Iliac, simple, stent + atherectomy', description: 'Iliac artery, straightforward lesion, stent and atherectomy with/without angioplasty' },
    { code: '37258', summary: 'Iliac, complex, PTA', description: 'Iliac artery, complex lesion, angioplasty' },
    { code: '37259', summary: 'Iliac, complex, stent', description: 'Iliac artery, complex lesion, stent with/without angioplasty' },
    { code: '37260', summary: 'Iliac, complex, atherectomy', description: 'Iliac artery, complex lesion, atherectomy with/without angioplasty' },
    { code: '37261', summary: 'Iliac, complex, stent + atherectomy', description: 'Iliac artery, complex lesion, stent and atherectomy with/without angioplasty' },
    { code: '37262', summary: 'Iliac, IVL (add-on)', description: 'Iliac artery, intravascular lithotripsy (add-on)', isAddOn: true }
  ],
  'Femoral/Popliteal': [
    { code: '37263', summary: 'Fem/pop, simple, PTA', description: 'Femoral/popliteal artery, straightforward lesion, angioplasty' },
    { code: '37264', summary: 'Fem/pop, simple, stent', description: 'Femoral/popliteal artery, straightforward lesion, stent with/without angioplasty' },
    { code: '37265', summary: 'Fem/pop, simple, atherectomy', description: 'Femoral/popliteal artery, straightforward lesion, atherectomy with/without angioplasty' },
    { code: '37266', summary: 'Fem/pop, simple, stent + atherectomy', description: 'Femoral/popliteal artery, straightforward lesion, stent and atherectomy with/without angioplasty' },
    { code: '37267', summary: 'Fem/pop, complex, PTA', description: 'Femoral/popliteal artery, complex lesion, angioplasty' },
    { code: '37268', summary: 'Fem/pop, complex, stent', description: 'Femoral/popliteal artery, complex lesion, stent with/without angioplasty' },
    { code: '37269', summary: 'Fem/pop, complex, atherectomy', description: 'Femoral/popliteal artery, complex lesion, atherectomy with/without angioplasty' },
    { code: '37270', summary: 'Fem/pop, complex, stent + atherectomy', description: 'Femoral/popliteal artery, complex lesion, stent and atherectomy with/without angioplasty' },
    { code: '37271', summary: "Fem/pop, add'l vessel, simple, PTA", description: 'Femoral/popliteal artery, each additional vessel, straightforward lesion, angioplasty (add-on)', isAddOn: true },
    { code: '37272', summary: "Fem/pop, add'l vessel, simple, stent", description: 'Femoral/popliteal artery, each additional vessel, straightforward lesion, stent (add-on)', isAddOn: true },
    { code: '37273', summary: "Fem/pop, add'l vessel, simple, atherectomy", description: 'Femoral/popliteal artery, each additional vessel, straightforward lesion, atherectomy (add-on)', isAddOn: true },
    { code: '37274', summary: "Fem/pop, add'l vessel, simple, stent + atherectomy", description: 'Femoral/popliteal artery, each additional vessel, straightforward lesion, stent and atherectomy (add-on)', isAddOn: true },
    { code: '37275', summary: "Fem/pop, add'l vessel, complex, PTA", description: 'Femoral/popliteal artery, each additional vessel, complex lesion, angioplasty (add-on)', isAddOn: true },
    { code: '37276', summary: "Fem/pop, add'l vessel, complex, stent", description: 'Femoral/popliteal artery, each additional vessel, complex lesion, stent (add-on)', isAddOn: true },
    { code: '37277', summary: "Fem/pop, add'l vessel, complex, atherectomy", description: 'Femoral/popliteal artery, each additional vessel, complex lesion, atherectomy (add-on)', isAddOn: true },
    { code: '37278', summary: "Fem/pop, add'l vessel, complex, stent + atherectomy", description: 'Femoral/popliteal artery, each additional vessel, complex lesion, stent and atherectomy (add-on)', isAddOn: true },
    { code: '37279', summary: 'Fem/pop, IVL (add-on)', description: 'Femoral/popliteal artery, intravascular lithotripsy (add-on)', isAddOn: true }
  ],
  'Tibial/Peroneal': [
    { code: '37280', summary: 'Tibial/peroneal, simple, PTA', description: 'Tibial/peroneal artery, straightforward lesion, angioplasty' },
    { code: '37281', summary: 'Tibial/peroneal, simple, stent', description: 'Tibial/peroneal artery, straightforward lesion, stent with/without angioplasty' },
    { code: '37282', summary: 'Tibial/peroneal, simple, atherectomy', description: 'Tibial/peroneal artery, straightforward lesion, atherectomy with/without angioplasty' },
    { code: '37283', summary: 'Tibial/peroneal, simple, stent + atherectomy', description: 'Tibial/peroneal artery, straightforward lesion, stent and atherectomy with/without angioplasty' },
    { code: '37284', summary: 'Tibial/peroneal, complex, PTA', description: 'Tibial/peroneal artery, complex lesion, angioplasty' },
    { code: '37285', summary: 'Tibial/peroneal, complex, stent', description: 'Tibial/peroneal artery, complex lesion, stent with/without angioplasty' },
    { code: '37286', summary: 'Tibial/peroneal, complex, atherectomy', description: 'Tibial/peroneal artery, complex lesion, atherectomy with/without angioplasty' },
    { code: '37287', summary: 'Tibial/peroneal, complex, stent + atherectomy', description: 'Tibial/peroneal artery, complex lesion, stent and atherectomy with/without angioplasty' },
    { code: '37288', summary: "Tibial/peroneal, add'l, simple, PTA", description: 'Tibial/peroneal artery, each additional vessel, straightforward lesion, angioplasty (add-on)', isAddOn: true },
    { code: '37289', summary: "Tibial/peroneal, add'l, simple, stent", description: 'Tibial/peroneal artery, each additional vessel, straightforward lesion, stent (add-on)', isAddOn: true },
    { code: '37290', summary: "Tibial/peroneal, add'l, simple, atherectomy", description: 'Tibial/peroneal artery, each additional vessel, straightforward lesion, atherectomy (add-on)', isAddOn: true },
    { code: '37291', summary: "Tibial/peroneal, add'l, simple, stent + atherectomy", description: 'Tibial/peroneal artery, each additional vessel, straightforward lesion, stent and atherectomy (add-on)', isAddOn: true },
    { code: '37292', summary: "Tibial/peroneal, add'l, complex, PTA", description: 'Tibial/peroneal artery, each additional vessel, complex lesion, angioplasty (add-on)', isAddOn: true },
    { code: '37293', summary: "Tibial/peroneal, add'l, complex, stent", description: 'Tibial/peroneal artery, each additional vessel, complex lesion, stent (add-on)', isAddOn: true },
    { code: '37294', summary: "Tibial/peroneal, add'l, complex, atherectomy", description: 'Tibial/peroneal artery, each additional vessel, complex lesion, atherectomy (add-on)', isAddOn: true },
    { code: '37295', summary: "Tibial/peroneal, add'l, complex, stent + atherectomy", description: 'Tibial/peroneal artery, each additional vessel, complex lesion, stent and atherectomy (add-on)', isAddOn: true }
  ],
  'Inframalleolar': [
    { code: '37296', summary: 'Inframalleolar, simple, PTA', description: 'Inframalleolar artery (foot), straightforward lesion, angioplasty', isNew: true },
    { code: '37297', summary: 'Inframalleolar, complex, PTA', description: 'Inframalleolar artery (foot), complex lesion, angioplasty', isNew: true },
    { code: '37298', summary: "Inframalleolar, add'l, simple, PTA", description: 'Inframalleolar artery (foot), each additional vessel, straightforward lesion, angioplasty (add-on)', isNew: true, isAddOn: true },
    { code: '37299', summary: "Inframalleolar, add'l, complex, PTA", description: 'Inframalleolar artery (foot), each additional vessel, complex lesion, angioplasty (add-on)', isNew: true, isAddOn: true }
  ],
  'Venography': [
    { code: '36010', summary: 'Venous catheter, 1st order', description: 'Introduction of catheter, superior or inferior vena cava' },
    { code: '36011', summary: 'Venous catheter, 1st order selective', description: 'Selective catheter placement, venous system; first order branch (e.g., renal vein, jugular vein)' },
    { code: '36012', summary: 'Venous catheter, 2nd order selective', description: 'Selective catheter placement, venous system; second order, or more selective, branch (e.g., left adrenal vein, petrosal sinus)' },
    { code: '75820', summary: 'Venography, extremity, unilateral S&I', description: 'Venography, extremity, unilateral, radiological supervision and interpretation' },
    { code: '75822', summary: 'Venography, extremity, bilateral S&I', description: 'Venography, extremity, bilateral, radiological supervision and interpretation' },
    { code: '75825', summary: 'Venography, caval, inferior S&I', description: 'Venography, caval, inferior, with serialography, radiological supervision and interpretation' },
    { code: '75827', summary: 'Venography, caval, superior S&I', description: 'Venography, caval, superior, with serialography, radiological supervision and interpretation' }
  ],
  'IVC Filter': [
    { code: '37191', summary: 'IVC filter insertion', description: 'Insertion of intravascular vena cava filter, endovascular approach including vascular access, fluoroscopic guidance, radiological supervision and interpretation' },
    { code: '37192', summary: 'IVC filter repositioning', description: 'Repositioning of intravascular vena cava filter, endovascular approach including vascular access, fluoroscopic guidance, radiological supervision and interpretation' },
    { code: '37193', summary: 'IVC filter removal', description: 'Retrieval (removal) of intravascular vena cava filter, endovascular approach including vascular access, fluoroscopic guidance, radiological supervision and interpretation' }
  ],
  'Venous Stenting': [
    { code: '37238', summary: 'Venous stent, initial', description: 'Transcatheter placement of an intravascular stent(s), open or percutaneous, including radiological supervision and interpretation and including angioplasty within the same vessel, when performed; initial vein' },
    { code: '37239', summary: 'Venous stent, additional', description: 'Transcatheter placement of an intravascular stent(s), open or percutaneous, including radiological supervision and interpretation and including angioplasty within the same vessel, when performed; each additional vein', isAddOn: true },
    { code: '37248', summary: 'Venous angioplasty, initial', description: 'Transluminal balloon angioplasty, open or percutaneous, including all imaging and radiological supervision and interpretation necessary to perform the angioplasty; initial vein' },
    { code: '37249', summary: 'Venous angioplasty, additional', description: 'Transluminal balloon angioplasty, open or percutaneous, including all imaging and radiological supervision and interpretation necessary to perform the angioplasty; each additional vein', isAddOn: true }
  ],
  'Venous Thrombectomy': [
    { code: '37187', summary: 'Venous mechanical thrombectomy, initial', description: 'Percutaneous transluminal mechanical thrombectomy, vein(s), including intraprocedural pharmacological thrombolytic injections and fluoroscopic guidance; initial vessel' },
    { code: '37188', summary: 'Venous mechanical thrombectomy, additional', description: 'Percutaneous transluminal mechanical thrombectomy, vein(s), including intraprocedural pharmacological thrombolytic injections and fluoroscopic guidance; each additional vein treated in a different vein', isAddOn: true }
  ],
  'Adjunctive Procedures': [
    { code: '75726', summary: 'IMA angiography, bilateral', description: 'Angiography, internal mammary artery (IMA), bilateral' },
    { code: '93505', summary: 'Endomyocardial biopsy', description: 'Endomyocardial biopsy (single or multiple samples)' },
    { code: '93462', summary: 'Transseptal puncture', description: 'Transseptal left heart catheterization through intact septum' },
    { code: '93463', summary: 'Pharmacologic challenge', description: 'Pharmacologic agent administration with hemodynamic measurements' },
    { code: '93464', summary: 'Exercise hemodynamics', description: 'Physiologic exercise study with hemodynamic measurements' },
    { code: '93566', summary: 'RV/RA angiography (add-on)', description: 'Injection for selective right ventricular or right atrial angiography (add-on)', isAddOn: true },
    { code: '93567', summary: 'Supravalvular aortography (add-on)', description: 'Injection for supravalvular aortography (add-on)', isAddOn: true },
    { code: '93568', summary: 'Pulmonary angiography (add-on)', description: 'Injection for pulmonary angiography (add-on)', isAddOn: true },
    { code: '33016', summary: 'Pericardiocentesis', description: 'Pericardiocentesis, needle or catheter technique' },
    { code: '33017', summary: 'Pericardial drain placement', description: 'Pericardial drainage with catheter placement, fluoroscopy and/or ultrasound guidance' },
    { code: '92950', summary: 'CPR', description: 'Cardiopulmonary resuscitation (CPR)' },
    { code: '36000', summary: 'Venous access, separate', description: 'Introduction of needle or catheter, vein (separate venous access)' },
    { code: '36140', summary: 'Arterial access, separate', description: 'Introduction of needle or catheter, upper or lower extremity artery (separate arterial access)' },
    { code: '93503', summary: 'Swan-Ganz insertion', description: 'Swan-Ganz catheter insertion for hemodynamic monitoring' },
    { code: '33210', summary: 'Temp pacer, single chamber', description: 'Insertion of temporary transvenous single chamber pacing electrode' },
    { code: '33211', summary: 'Temp pacer, dual chamber', description: 'Insertion of temporary transvenous dual chamber pacing electrodes' },
    { code: '92998', summary: 'PCI, unsuccessful attempt', description: 'Percutaneous PCI - attempted but unsuccessful (report with modifier 52 or 53)' }
  ],
  'MCS': [
    { code: '33990', summary: 'pVAD insertion, arterial (Impella)', description: 'Insertion of percutaneous ventricular assist device (e.g., Impella), arterial access' },
    { code: '33991', summary: 'pVAD insertion, arterial + venous', description: 'Insertion of percutaneous VAD, both arterial and venous access, with transseptal puncture' },
    { code: '33995', summary: 'pVAD repositioning', description: 'Repositioning of percutaneous ventricular assist device' },
    { code: '33992', summary: 'pVAD removal, arterial', description: 'Removal of percutaneous ventricular assist device, arterial access' },
    { code: '33993', summary: 'pVAD removal, arterial + venous', description: 'Removal of percutaneous VAD, both arterial and venous access' },
    { code: '33946', summary: 'ECMO initiation, VV', description: 'Extracorporeal membrane oxygenation (ECMO)/ECLS initiation, veno-venous' },
    { code: '33947', summary: 'ECMO initiation, VA', description: 'ECMO/ECLS initiation, veno-arterial' },
    { code: '33948', summary: 'ECMO initiation, AV', description: 'ECMO/ECLS initiation, arterial-venous' },
    { code: '33949', summary: 'ECMO cannula, perc, ≤5 yrs', description: 'ECMO/ECLS insertion of peripheral cannula(e), percutaneous, birth through 5 years' },
    { code: '33951', summary: 'ECMO cannula, perc, ≥6 yrs', description: 'ECMO/ECLS insertion of peripheral cannula(e), percutaneous, 6 years and older' },
    { code: '33952', summary: 'ECMO cannula, open, ≥6 yrs', description: 'ECMO/ECLS insertion of peripheral cannula(e), open, 6 years and older' },
    { code: '33989', summary: 'IABP insertion', description: 'Insertion of intra-aortic balloon pump (IABP)' }
  ],
  'Thrombolysis': [
    { code: '37211', summary: 'Transcatheter thrombolysis, arterial, initial', description: 'Transcatheter therapy, arterial infusion for thrombolysis other than coronary, any method, including radiological supervision and interpretation, initial treatment day' },
    { code: '37212', summary: 'Transcatheter thrombolysis, venous, initial', description: 'Transcatheter therapy, venous infusion for thrombolysis, any method, including radiological supervision and interpretation, initial treatment day' },
    { code: '37213', summary: 'Transcatheter thrombolysis, arterial, continued', description: 'Transcatheter therapy, arterial or venous infusion for thrombolysis other than coronary, any method, including radiological supervision and interpretation, continued treatment on subsequent day during course of thrombolytic therapy, including follow-up catheter contrast injection, position change, or exchange, when performed' },
    { code: '37214', summary: 'Transcatheter thrombolysis, cessation', description: 'Transcatheter therapy, arterial or venous infusion for thrombolysis other than coronary, any method, including radiological supervision and interpretation, cessation of thrombolysis including removal of catheter and vessel closure by any method' }
  ],
  'Arterial Thrombectomy': [
    { code: '37184', summary: 'Arterial mechanical thrombectomy, initial', description: 'Primary percutaneous transluminal mechanical thrombectomy, noncoronary, non-intracranial, arterial or arterial bypass graft, including fluoroscopic guidance and intraprocedural pharmacological thrombolytic injection(s); initial vessel' },
    { code: '37185', summary: 'Arterial mechanical thrombectomy, add-on', description: 'Primary percutaneous transluminal mechanical thrombectomy, noncoronary, non-intracranial, arterial or arterial bypass graft, including fluoroscopic guidance and intraprocedural pharmacological thrombolytic injection(s); second and all subsequent vessel(s) within the same vascular family', isAddOn: true },
    { code: '37186', summary: 'Secondary arterial thrombectomy', description: 'Secondary percutaneous transluminal thrombectomy (e.g., nonprimary mechanical, snare basket, suction technique), noncoronary, non-intracranial, arterial or arterial bypass graft, including fluoroscopic guidance and intraprocedural pharmacological thrombolytic injections, provided in conjunction with another percutaneous intervention other than primary mechanical thrombectomy', isAddOn: true }
  ],
  'Retrieval': [
    { code: '37197', summary: 'Foreign body retrieval, vascular', description: 'Transcatheter retrieval, percutaneous, of intravascular foreign body (e.g., fractured venous or arterial catheter), includes radiological supervision and interpretation, and imaging guidance (fluoroscopy), when performed' }
  ],
  'Carotid/Cerebrovascular': [
    // Catheter Placement
    { code: 'HEADER-CATH', summary: '— Catheter Placement —', description: '', isDivider: true },
    { code: '36221', summary: 'Non-selective thoracic aorta', description: 'Non-selective catheter placement, thoracic aorta, with angiography of the extracranial carotid, vertebral, and/or intracranial vessels, unilateral or bilateral, and all associated radiological supervision and interpretation' },
    { code: '36222', summary: 'Selective common carotid/innominate', description: 'Selective catheter placement, common carotid or innominate artery, unilateral, any approach, with angiography of the ipsilateral extracranial carotid circulation and all associated radiological supervision and interpretation' },
    { code: '36223', summary: 'Selective common carotid with intracranial', description: 'Selective catheter placement, common carotid or innominate artery, unilateral, any approach, with angiography of the ipsilateral intracranial carotid circulation and all associated radiological supervision and interpretation' },
    { code: '36224', summary: 'Selective internal carotid', description: 'Selective catheter placement, internal carotid artery, unilateral, with angiography of the ipsilateral intracranial carotid circulation and all associated radiological supervision and interpretation' },
    { code: '36225', summary: 'Selective subclavian with vertebral angio', description: 'Selective catheter placement, subclavian, innominate, or vertebral artery, unilateral, with angiography of the ipsilateral vertebral circulation and all associated radiological supervision and interpretation' },
    { code: '36226', summary: 'Selective vertebral artery', description: 'Selective catheter placement, vertebral artery, unilateral, with angiography of the ipsilateral vertebral circulation and all associated radiological supervision and interpretation' },
    { code: '36227', summary: 'Selective external carotid (add-on)', description: 'Selective catheter placement, external carotid artery, unilateral, with angiography of the ipsilateral external carotid circulation and all associated radiological supervision and interpretation', isAddOn: true },
    { code: '36228', summary: 'Selective intracranial branch (add-on)', description: 'Selective catheter placement, each intracranial branch of the internal carotid or vertebral arteries, unilateral, with angiography of the selected vessel circulation and all associated radiological supervision and interpretation', isAddOn: true },
    // Imaging (S&I)
    { code: 'HEADER-IMG', summary: '— Imaging (S&I) —', description: '', isDivider: true },
    { code: '75676', summary: 'Carotid angiography, unilateral S&I', description: 'Angiography, carotid, cervical, unilateral, radiological supervision and interpretation (if separate from catheter codes)' },
    { code: '75680', summary: 'Carotid angiography, bilateral S&I', description: 'Angiography, carotid, cervical, bilateral, radiological supervision and interpretation' }
  ],
  'Carotid Stenting': [
    { code: '37215', summary: 'Carotid stent with embolic protection', description: 'Transcatheter placement of intravascular stent(s), cervical carotid artery, open or percutaneous, including angioplasty, when performed, and radiological supervision and interpretation; with distal embolic protection' },
    { code: '37216', summary: 'Carotid stent without embolic protection', description: 'Transcatheter placement of intravascular stent(s), cervical carotid artery, open or percutaneous, including angioplasty, when performed, and radiological supervision and interpretation; without distal embolic protection' },
    { code: '37217', summary: 'Intrathoracic carotid/innominate stent, retrograde', description: 'Transcatheter placement of intravascular stent(s), intrathoracic common carotid artery or innominate artery by retrograde treatment, open ipsilateral cervical carotid artery exposure, including angioplasty, when performed, and radiological supervision and interpretation' },
    { code: '37218', summary: 'Intrathoracic carotid/innominate stent, antegrade', description: 'Transcatheter placement of intravascular stent(s), intrathoracic common carotid artery or innominate artery, open or percutaneous antegrade approach, including angioplasty, when performed, and radiological supervision and interpretation' }
  ],
  'Thoracic Aortography': [
    { code: '36200', summary: 'Aorta catheter placement', description: 'Introduction of catheter, aorta, translumbar or retrograde brachial/femoral artery approach, for aortography' },
    { code: '75600', summary: 'Thoracic aortography S&I', description: 'Aortography, thoracic, without serialography, radiological supervision and interpretation' },
    { code: '75605', summary: 'Thoracic aortography with arch S&I', description: 'Aortography, thoracic, by serialography, radiological supervision and interpretation' },
    { code: '75625', summary: 'Abdominal aortography S&I', description: 'Aortography, abdominal, by serialography, radiological supervision and interpretation' },
    { code: '75630', summary: 'Aortography with runoff S&I', description: 'Aortography, abdominal plus bilateral iliofemoral lower extremity, catheter, by serialography, radiological supervision and interpretation' }
  ],
  'EVAR': [
    // EVAR Main Body
    { code: 'HEADER-MAIN', summary: '— EVAR Main Body —', description: '', isDivider: true },
    { code: '34701', summary: 'EVAR, aorto-aortic tube', description: 'Endovascular repair of infrarenal aorta by deployment of an aorto-aortic tube endograft including pre-procedure sizing and device selection, all nonselective catheterization(s), all associated radiological supervision and interpretation, all endograft extension(s) placed in the aorta from the level of the renal arteries to the aortic bifurcation, and all angioplasty/stenting performed from the level of the renal arteries to the aortic bifurcation' },
    { code: '34702', summary: 'EVAR, aorto-uni-iliac', description: 'Endovascular repair of infrarenal aorta and/or iliac artery(ies) by deployment of an aorto-uni-iliac endograft including pre-procedure sizing and device selection, all nonselective catheterization(s), all associated radiological supervision and interpretation, all endograft extension(s) placed in the aorta from the level of the renal arteries to the iliac bifurcation, and all angioplasty/stenting performed from the level of the renal arteries to the iliac bifurcation' },
    { code: '34703', summary: 'EVAR, aorto-bi-iliac', description: 'Endovascular repair of infrarenal aorta and/or iliac artery(ies) by deployment of an aorto-bi-iliac endograft including pre-procedure sizing and device selection, all nonselective catheterization(s), all associated radiological supervision and interpretation, all endograft extension(s) placed in the aorta from the level of the renal arteries to the iliac bifurcation, and all angioplasty/stenting performed from the level of the renal arteries to the iliac bifurcation' },
    { code: '34704', summary: 'EVAR, iliac tube endograft', description: 'Endovascular repair of iliac artery by deployment of ilio-iliac tube endograft including pre-procedure sizing and device selection, all nonselective catheterization(s), all associated radiological supervision and interpretation, and all endograft extension(s) proximally to the aortic bifurcation or distally to the iliac bifurcation, and treatment zone angioplasty/stenting, when performed, unilateral' },
    { code: '34705', summary: 'EVAR, iliac bifurcation endograft, initial', description: 'Endovascular repair of iliac artery bifurcation by deployment of iliac branched endograft including pre-procedure sizing and device selection, all ipsilateral selective catheterization(s), all associated radiological supervision and interpretation, and all endograft extension(s) proximally to the aortic bifurcation and distally in the internal iliac, external iliac, and common femoral artery(ies), and treatment zone angioplasty/stenting when performed; initial iliac artery' },
    { code: '34706', summary: 'EVAR, iliac bifurcation, add-on', description: 'Endovascular repair of iliac artery bifurcation by deployment of iliac branched endograft; each additional iliac artery', isAddOn: true },
    { code: '34707', summary: 'Extension prosthesis, renal/mesenteric, initial (add-on)', description: 'Placement of extension prosthesis(es), renal or mesenteric artery, initial vessel', isAddOn: true },
    { code: '34708', summary: 'Extension prosthesis, renal/mesenteric, add-on', description: 'Placement of extension prosthesis(es), renal or mesenteric artery; each additional renal or mesenteric artery', isAddOn: true },
    // Extension Devices
    { code: 'HEADER-EXT', summary: '— Extension Devices —', description: '', isDivider: true },
    { code: '34709', summary: 'EVAR extension, aorta (add-on)', description: 'Placement of extension prosthesis(es) distal to the common iliac artery(ies) or proximal to the renal artery(ies) for endovascular repair of infrarenal abdominal aortic or iliac aneurysm, false aneurysm, dissection, penetrating ulcer, including pre-procedure sizing and device selection, all nonselective catheterization(s), all associated radiological supervision and interpretation, and treatment zone angioplasty/stenting, when performed, per vessel treated', isAddOn: true },
    { code: '34710', summary: 'Endograft extension, delayed, initial', description: 'Delayed placement of distal or proximal extension prosthesis for endovascular repair of infrarenal abdominal aortic or iliac aneurysm, false aneurysm, dissection, endoleak, or endograft migration, including pre-procedure sizing and device selection, all nonselective catheterization(s), all associated radiological supervision and interpretation, and treatment zone angioplasty/stenting, when performed; initial vessel' },
    { code: '34711', summary: 'Endograft extension, delayed, add-on', description: 'Delayed placement of distal or proximal extension prosthesis for endovascular repair of infrarenal abdominal aortic or iliac aneurysm, false aneurysm, dissection, endoleak, or endograft migration; each additional vessel', isAddOn: true },
    { code: '34712', summary: 'Endograft fixation device (add-on)', description: 'Transcatheter delivery of enhanced fixation device(s) to the endograft', isAddOn: true },
    { code: '34713', summary: 'Percutaneous femoral access/closure', description: 'Percutaneous access and closure of femoral artery for delivery of endovascular prosthesis, unilateral' },
    { code: '34714', summary: 'Open femoral conduit', description: 'Open femoral artery exposure with creation of conduit for delivery of aortic or iliac endovascular prosthesis' },
    // Endoleak Repair & Coiling
    { code: 'HEADER-ENDO', summary: '— Endoleak Repair & Coiling —', description: '', isDivider: true },
    { code: '34808', summary: 'Iliac artery occlusion device', description: 'Endovascular placement of iliac artery occlusion device (for treatment of endoleak, one or more)' },
    { code: '34812', summary: 'Open femoral exposure, unilateral', description: 'Open femoral artery exposure for delivery of endovascular prosthesis, unilateral' },
    { code: '34820', summary: 'Open iliac exposure, unilateral', description: 'Open iliac artery exposure for delivery of endovascular prosthesis or iliac occlusion during endovascular therapy, unilateral' },
    { code: '34833', summary: 'Open iliac conduit creation', description: 'Open iliac artery exposure with creation of conduit for delivery of aortic endovascular prosthesis' },
    { code: '34834', summary: 'Open brachial exposure, unilateral', description: 'Open brachial artery exposure for delivery of endovascular prosthesis, unilateral' },
    { code: '36010', summary: 'IVC catheter placement', description: 'Introduction of catheter, superior or inferior vena cava' },
    { code: '37241', summary: 'Venous embolization (sac)', description: 'Vascular embolization or occlusion, inclusive of all radiological supervision and interpretation, intraprocedural roadmapping, and imaging guidance necessary to complete the intervention; venous, other than hemorrhage (for sac embolization)' },
    { code: '37242', summary: 'Arterial embolization (endoleak)', description: 'Vascular embolization or occlusion, arterial, other than hemorrhage or tumor (for endoleak coiling)' },
    // Fenestrated/Branched EVAR
    { code: 'HEADER-FEVAR', summary: '— Fenestrated/Branched EVAR —', description: '', isDivider: true },
    { code: '34717', summary: 'Juxta-renal AAA repair', description: 'Endovascular repair of juxta-renal abdominal aortic aneurysm and/or dissection, including visceral artery endoprostheses, when performed' },
    { code: '34718', summary: 'Iliac artery endoprosthesis', description: 'Endovascular repair of iliac artery, with placement of endoprosthesis' },
    { code: '0254T', summary: 'Iliac bifurcation endograft, initial', description: 'Endovascular repair of iliac artery bifurcation using bifurcated endoprosthesis from aortic or iliac artery' },
    { code: '0255T', summary: 'Iliac bifurcation endograft, add-on', description: 'Endovascular repair of iliac artery bifurcation using bifurcated endoprosthesis; each additional ipsilateral iliac artery bifurcation', isAddOn: true }
  ],
  'TEVAR': [
    { code: '33880', summary: 'TEVAR, with left subclavian coverage', description: 'Endovascular repair of descending thoracic aorta; involving coverage of left subclavian artery origin, initial endoprosthesis plus descending thoracic aortic extension(s), if required, to level of celiac artery origin' },
    { code: '33881', summary: 'TEVAR, without left subclavian coverage', description: 'Endovascular repair of descending thoracic aorta; not involving coverage of left subclavian artery origin, initial endoprosthesis plus descending thoracic aortic extension(s), if required, to level of celiac artery origin' },
    { code: '33883', summary: 'TEVAR proximal extension (add-on)', description: 'Placement of proximal extension prosthesis for endovascular repair of descending thoracic aorta; initial extension', isAddOn: true },
    { code: '33884', summary: 'TEVAR proximal extension, each add-on', description: 'Placement of proximal extension prosthesis for endovascular repair of descending thoracic aorta; each additional proximal extension', isAddOn: true },
    { code: '33886', summary: 'TEVAR distal extension (add-on)', description: 'Placement of distal extension prosthesis(s) (delayed) after endovascular repair of descending thoracic aorta', isAddOn: true },
    { code: '33889', summary: 'Subclavian transposition/bypass (add-on)', description: 'Open subclavian to carotid artery transposition performed in conjunction with endovascular repair of descending thoracic aorta, by neck incision, unilateral', isAddOn: true },
    { code: '33891', summary: 'Carotid-carotid bypass (add-on)', description: 'Bypass graft, with other than vein, transcervical retropharyngeal carotid-carotid, performed in conjunction with endovascular repair of descending thoracic aorta, by neck incision', isAddOn: true }
  ],
  'Subclavian/Innominate': [
    { code: '37226', summary: 'Brachiocephalic angioplasty, initial', description: 'Revascularization, endovascular, open or percutaneous, tibial, peroneal artery, unilateral, initial vessel; with transluminal angioplasty' },
    { code: '37227', summary: 'Brachiocephalic stent, initial', description: 'Revascularization, endovascular, open or percutaneous, femoral, popliteal artery(s), unilateral; with transluminal stent placement(s), includes angioplasty within the same vessel, when performed' },
    { code: '37236', summary: 'Arterial stent, initial vessel', description: 'Transcatheter placement of an intravascular stent(s) (except lower extremity, cervical carotid, extracranial vertebral or intrathoracic carotid, intracranial, or coronary), open or percutaneous, including radiological supervision and interpretation and including angioplasty within the same vessel, when performed; initial artery' },
    { code: '37237', summary: 'Arterial stent, each additional (add-on)', description: 'Transcatheter placement of an intravascular stent(s) (except lower extremity, cervical carotid, extracranial vertebral or intrathoracic carotid, intracranial, or coronary), open or percutaneous, including radiological supervision and interpretation and including angioplasty within the same vessel, when performed; each additional artery', isAddOn: true },
    { code: '37246', summary: 'Arterial angioplasty, initial vessel', description: 'Transluminal balloon angioplasty (except dialysis circuit), open or percutaneous, including all imaging and radiological supervision and interpretation necessary to perform the angioplasty within the same artery; initial artery' },
    { code: '37247', summary: 'Arterial angioplasty, each additional (add-on)', description: 'Transluminal balloon angioplasty (except dialysis circuit), open or percutaneous, including all imaging and radiological supervision and interpretation necessary to perform the angioplasty within the same artery; each additional artery', isAddOn: true }
  ]
};
