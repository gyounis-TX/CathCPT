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
    { code: '0524T', summary: 'OCT each additional vessel', description: 'Intravascular coronary optical coherence tomography (OCT), each additional vessel (List separately in addition to code for primary procedure)', isAddOn: true, requiresVessel: true }
  ],
  'Structural Heart Interventions': [
    { code: '33274', summary: 'TPVI (pulmonary valve)', description: 'Transcatheter pulmonary valve implantation (TPVI)' },
    { code: '93580', summary: 'ASD closure', description: 'Percutaneous transcatheter closure of congenital atrial septal defect' },
    { code: '93581', summary: 'VSD closure', description: 'Percutaneous transcatheter closure of ventricular septal defect' },
    { code: '93582', summary: 'PFO closure', description: 'Percutaneous transcatheter closure of patent foramen ovale' },
    { code: '93583', summary: 'Septal reduction (alcohol ablation)', description: 'Percutaneous transcatheter septal reduction therapy' },
    { code: '93590', summary: 'Paravalvular leak closure, initial', description: 'Percutaneous transcatheter closure of paravalvular leak, initial occlusion device' },
    { code: '93591', summary: 'Paravalvular leak closure, add-on', description: 'Percutaneous transcatheter closure of paravalvular leak, each additional device', isAddOn: true },
    { code: '93592', summary: 'LAA closure (Watchman)', description: 'Percutaneous transcatheter closure of left atrial appendage' }
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
  'IVC Filter Procedures': [
    { code: '37191', summary: 'IVC filter insertion', description: 'Insertion of intravascular vena cava filter, endovascular approach including vascular access, fluoroscopic guidance, radiological supervision and interpretation' },
    { code: '37192', summary: 'IVC filter repositioning', description: 'Repositioning of intravascular vena cava filter, endovascular approach including vascular access, fluoroscopic guidance, radiological supervision and interpretation' },
    { code: '37193', summary: 'IVC filter removal', description: 'Retrieval (removal) of intravascular vena cava filter, endovascular approach including vascular access, fluoroscopic guidance, radiological supervision and interpretation' }
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
  ]
};
