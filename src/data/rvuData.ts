// 2026 RVU Data for Cardiology CPT Codes
export const rvuData: Record<string, { workRVU: number; totalRVU: number; fee: number }> = {
    // Diagnostic Cath - Right Heart
    '93451': { workRVU: 2.54, totalRVU: 6.83, fee: 246 },
    '93452': { workRVU: 3.30, totalRVU: 8.39, fee: 302 },
    '93453': { workRVU: 4.00, totalRVU: 10.05, fee: 362 },
    
    // Diagnostic Cath - Coronary
    '93454': { workRVU: 4.50, totalRVU: 12.85, fee: 424 },
    '93455': { workRVU: 5.20, totalRVU: 14.20, fee: 469 },
    '93456': { workRVU: 5.80, totalRVU: 15.50, fee: 512 },
    '93457': { workRVU: 6.50, totalRVU: 17.00, fee: 561 },
    '93458': { workRVU: 6.20, totalRVU: 16.50, fee: 545 },
    '93459': { workRVU: 7.00, totalRVU: 18.20, fee: 601 },
    '93460': { workRVU: 7.50, totalRVU: 19.50, fee: 644 },
    '93461': { workRVU: 8.20, totalRVU: 21.00, fee: 693 },
    
    // PCI Base Codes
    '92920': { workRVU: 11.69, totalRVU: 28.44, fee: 939 },
    '92924': { workRVU: 13.50, totalRVU: 31.75, fee: 1048 },
    '92928': { workRVU: 13.17, totalRVU: 30.89, fee: 1019 },
    '92930': { workRVU: 16.28, totalRVU: 36.75, fee: 1213 },
    '92933': { workRVU: 14.87, totalRVU: 34.20, fee: 1129 },
    '92937': { workRVU: 13.17, totalRVU: 30.89, fee: 1019 },
    '92941': { workRVU: 13.17, totalRVU: 30.89, fee: 1019 },
    '92943': { workRVU: 17.50, totalRVU: 38.90, fee: 1284 },
    '92945': { workRVU: 21.00, totalRVU: 44.50, fee: 1469 },
    
    // Drug-Coated Balloon
    '0913T': { workRVU: 12.00, totalRVU: 29.50, fee: 974 },
    '0914T': { workRVU: 3.50, totalRVU: 8.20, fee: 271 },
    
    // PCI Add-ons
    '92972': { workRVU: 2.50, totalRVU: 6.15, fee: 203 },
    '92973': { workRVU: 2.20, totalRVU: 5.50, fee: 182 },
    '92974': { workRVU: 1.80, totalRVU: 4.50, fee: 149 },
    
    // Intravascular Imaging & Physiology
    '92978': { workRVU: 1.69, totalRVU: 4.18, fee: 138 },
    '92979': { workRVU: 1.69, totalRVU: 4.18, fee: 138 },
    '93571': { workRVU: 1.50, totalRVU: 3.75, fee: 124 },
    '93572': { workRVU: 1.50, totalRVU: 3.75, fee: 124 },
    '0523T': { workRVU: 1.85, totalRVU: 4.60, fee: 152 },
    '0524T': { workRVU: 1.40, totalRVU: 3.50, fee: 116 },
    
    // Sedation
    '99152': { workRVU: 1.42, totalRVU: 3.15, fee: 104 },
    '99153': { workRVU: 0.98, totalRVU: 2.18, fee: 72 },
    
    // Structural Heart
    '33274': { workRVU: 22.00, totalRVU: 48.00, fee: 1585 },
    '93580': { workRVU: 18.00, totalRVU: 40.00, fee: 1320 },
    '93581': { workRVU: 20.50, totalRVU: 45.00, fee: 1485 },
    '93582': { workRVU: 16.50, totalRVU: 37.00, fee: 1221 },
    '93583': { workRVU: 19.00, totalRVU: 42.00, fee: 1386 },
    '93590': { workRVU: 17.00, totalRVU: 38.00, fee: 1254 },
    '93591': { workRVU: 5.00, totalRVU: 11.00, fee: 363 },
    '33340': { workRVU: 17.50, totalRVU: 39.00, fee: 1287 },
    '33418': { workRVU: 20.00, totalRVU: 44.00, fee: 1452 },
    '33419': { workRVU: 6.50, totalRVU: 14.50, fee: 479 },
    '0569T': { workRVU: 19.00, totalRVU: 42.00, fee: 1386 },
    '0570T': { workRVU: 5.50, totalRVU: 12.50, fee: 413 },
    
    // TAVR
    '33361': { workRVU: 35.00, totalRVU: 75.00, fee: 2475 },
    '33362': { workRVU: 36.50, totalRVU: 78.00, fee: 2574 },
    '33363': { workRVU: 37.00, totalRVU: 79.50, fee: 2624 },
    '33364': { workRVU: 36.80, totalRVU: 79.00, fee: 2607 },
    '33365': { workRVU: 38.50, totalRVU: 82.00, fee: 2706 },
    '33366': { workRVU: 39.00, totalRVU: 83.00, fee: 2739 },
    '33367': { workRVU: 8.00, totalRVU: 17.00, fee: 561 },
    '33368': { workRVU: 37.50, totalRVU: 80.00, fee: 2640 },
    '33369': { workRVU: 38.00, totalRVU: 81.00, fee: 2673 },
    
    // Peripheral Diagnostic Codes
    '36200': { workRVU: 1.50, totalRVU: 4.00, fee: 144 },
    '36215': { workRVU: 2.00, totalRVU: 5.50, fee: 198 },
    '36216': { workRVU: 2.50, totalRVU: 6.50, fee: 234 },
    '36217': { workRVU: 3.00, totalRVU: 7.50, fee: 270 },
    '36245': { workRVU: 2.00, totalRVU: 5.50, fee: 198 },
    '36246': { workRVU: 2.50, totalRVU: 6.50, fee: 234 },
    '36247': { workRVU: 3.00, totalRVU: 7.50, fee: 270 },
    '75625': { workRVU: 1.50, totalRVU: 4.00, fee: 144 },
    '75710': { workRVU: 1.10, totalRVU: 3.00, fee: 108 },
    '75716': { workRVU: 1.50, totalRVU: 4.00, fee: 144 },
    '75722': { workRVU: 0.80, totalRVU: 2.20, fee: 79 },
    '75724': { workRVU: 1.20, totalRVU: 3.20, fee: 115 },
    '75736': { workRVU: 0.80, totalRVU: 2.20, fee: 79 },
    '75774': { workRVU: 0.50, totalRVU: 1.50, fee: 54 },

    // Peripheral Intervention - Iliac
    '37254': { workRVU: 8.50, totalRVU: 20.00, fee: 660 },
    '37255': { workRVU: 10.00, totalRVU: 24.00, fee: 792 },
    '37256': { workRVU: 11.50, totalRVU: 27.00, fee: 891 },
    '37257': { workRVU: 13.00, totalRVU: 31.00, fee: 1023 },
    '37258': { workRVU: 10.50, totalRVU: 25.00, fee: 825 },
    '37259': { workRVU: 12.00, totalRVU: 29.00, fee: 957 },
    '37260': { workRVU: 13.50, totalRVU: 32.00, fee: 1056 },
    '37261': { workRVU: 15.00, totalRVU: 36.00, fee: 1188 },
    '37262': { workRVU: 3.00, totalRVU: 7.00, fee: 231 },
    
    // Peripheral Intervention - Femoral/Popliteal
    '37263': { workRVU: 9.00, totalRVU: 21.00, fee: 693 },
    '37264': { workRVU: 10.50, totalRVU: 25.00, fee: 825 },
    '37265': { workRVU: 12.00, totalRVU: 28.00, fee: 924 },
    '37266': { workRVU: 13.50, totalRVU: 32.00, fee: 1056 },
    '37267': { workRVU: 11.00, totalRVU: 26.00, fee: 858 },
    '37268': { workRVU: 12.50, totalRVU: 30.00, fee: 990 },
    '37269': { workRVU: 14.00, totalRVU: 33.00, fee: 1089 },
    '37270': { workRVU: 15.50, totalRVU: 37.00, fee: 1221 },
    '37271': { workRVU: 4.00, totalRVU: 9.50, fee: 314 },
    '37272': { workRVU: 4.50, totalRVU: 10.50, fee: 347 },
    '37273': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37274': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },
    '37275': { workRVU: 4.50, totalRVU: 10.50, fee: 347 },
    '37276': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37277': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },
    '37278': { workRVU: 6.00, totalRVU: 14.00, fee: 462 },
    '37279': { workRVU: 3.00, totalRVU: 7.00, fee: 231 },
    
    // Peripheral Intervention - Tibial/Peroneal
    '37280': { workRVU: 10.00, totalRVU: 23.00, fee: 759 },
    '37281': { workRVU: 11.50, totalRVU: 27.00, fee: 891 },
    '37282': { workRVU: 13.00, totalRVU: 30.00, fee: 990 },
    '37283': { workRVU: 14.50, totalRVU: 34.00, fee: 1122 },
    '37284': { workRVU: 12.00, totalRVU: 28.00, fee: 924 },
    '37285': { workRVU: 13.50, totalRVU: 32.00, fee: 1056 },
    '37286': { workRVU: 15.00, totalRVU: 35.00, fee: 1155 },
    '37287': { workRVU: 16.50, totalRVU: 39.00, fee: 1287 },
    '37288': { workRVU: 4.50, totalRVU: 10.50, fee: 347 },
    '37289': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37290': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },
    '37291': { workRVU: 6.00, totalRVU: 14.00, fee: 462 },
    '37292': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37293': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },
    '37294': { workRVU: 6.00, totalRVU: 14.00, fee: 462 },
    '37295': { workRVU: 6.50, totalRVU: 15.00, fee: 495 },
    
    // Peripheral Intervention - Inframalleolar (NEW 2026)
    '37296': { workRVU: 11.00, totalRVU: 26.00, fee: 858 },
    '37297': { workRVU: 13.00, totalRVU: 31.00, fee: 1023 },
    '37298': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37299': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },

    // Venography
    '36010': { workRVU: 1.20, totalRVU: 3.20, fee: 115 },
    '36011': { workRVU: 1.80, totalRVU: 4.50, fee: 162 },
    '36012': { workRVU: 2.20, totalRVU: 5.50, fee: 198 },
    '75820': { workRVU: 0.70, totalRVU: 1.80, fee: 65 },
    '75822': { workRVU: 0.90, totalRVU: 2.30, fee: 83 },
    '75825': { workRVU: 0.80, totalRVU: 2.00, fee: 72 },
    '75827': { workRVU: 0.80, totalRVU: 2.00, fee: 72 },

    // IVC Filter Procedures
    '37191': { workRVU: 4.00, totalRVU: 10.00, fee: 360 },
    '37192': { workRVU: 5.00, totalRVU: 12.50, fee: 450 },
    '37193': { workRVU: 6.50, totalRVU: 16.00, fee: 576 },

    // Venous Stenting/Angioplasty
    '37238': { workRVU: 8.00, totalRVU: 19.00, fee: 685 },
    '37239': { workRVU: 4.00, totalRVU: 9.50, fee: 342 },
    '37248': { workRVU: 6.50, totalRVU: 15.50, fee: 559 },
    '37249': { workRVU: 3.25, totalRVU: 7.75, fee: 279 },

    // Venous Thrombectomy
    '37187': { workRVU: 10.00, totalRVU: 24.00, fee: 865 },
    '37188': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },

    // Thrombolysis
    '37211': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },
    '37212': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },
    '37213': { workRVU: 3.00, totalRVU: 7.00, fee: 252 },
    '37214': { workRVU: 3.50, totalRVU: 8.50, fee: 306 },

    // Arterial Thrombectomy
    '37184': { workRVU: 11.00, totalRVU: 26.00, fee: 937 },
    '37185': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },
    '37186': { workRVU: 4.00, totalRVU: 9.50, fee: 342 },

    // Retrieval
    '37197': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },

    // Adjunctive Procedures
    '75630': { workRVU: 1.20, totalRVU: 3.00, fee: 99 },
    '75726': { workRVU: 0.80, totalRVU: 2.00, fee: 66 },
    '93505': { workRVU: 3.00, totalRVU: 7.50, fee: 248 },
    '93462': { workRVU: 4.00, totalRVU: 9.50, fee: 314 },
    '93463': { workRVU: 2.50, totalRVU: 6.00, fee: 198 },
    '93464': { workRVU: 3.50, totalRVU: 8.50, fee: 281 },
    '93566': { workRVU: 1.00, totalRVU: 2.50, fee: 83 },
    '93567': { workRVU: 0.80, totalRVU: 2.00, fee: 66 },
    '93568': { workRVU: 1.20, totalRVU: 3.00, fee: 99 },
    
    // MCS (Mechanical Circulatory Support)
    '33990': { workRVU: 9.00, totalRVU: 21.00, fee: 693 },
    '33991': { workRVU: 11.00, totalRVU: 26.00, fee: 858 },
    '33989': { workRVU: 6.00, totalRVU: 14.00, fee: 462 },
    '33992': { workRVU: 7.50, totalRVU: 18.00, fee: 594 },
    '33993': { workRVU: 9.00, totalRVU: 21.00, fee: 756 },
    '33995': { workRVU: 13.00, totalRVU: 31.00, fee: 1023 },
    '33997': { workRVU: 15.00, totalRVU: 36.00, fee: 1188 },

    // ECMO
    '33946': { workRVU: 12.00, totalRVU: 28.00, fee: 1009 },
    '33947': { workRVU: 14.00, totalRVU: 33.00, fee: 1189 },
    '33948': { workRVU: 13.00, totalRVU: 30.00, fee: 1081 },
    '33949': { workRVU: 8.00, totalRVU: 19.00, fee: 685 },
    '33951': { workRVU: 8.50, totalRVU: 20.00, fee: 721 },
    '33952': { workRVU: 10.00, totalRVU: 24.00, fee: 865 },

    // Pericardiocentesis
    '33016': { workRVU: 4.50, totalRVU: 10.50, fee: 378 },
    '33017': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },

    // Temporary Pacing
    '33210': { workRVU: 3.50, totalRVU: 8.50, fee: 306 },
    '33211': { workRVU: 4.50, totalRVU: 11.00, fee: 396 },

    // Vascular Access
    '36000': { workRVU: 0.50, totalRVU: 1.20, fee: 43 },
    '36140': { workRVU: 0.80, totalRVU: 2.00, fee: 72 },

    // Miscellaneous
    '92950': { workRVU: 4.00, totalRVU: 9.50, fee: 342 },
    '92998': { workRVU: 6.00, totalRVU: 14.00, fee: 504 },
    '93503': { workRVU: 2.00, totalRVU: 5.00, fee: 180 },

    // Carotid/Cerebrovascular Catheter Placement
    '36221': { workRVU: 3.50, totalRVU: 8.50, fee: 306 },
    '36222': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },
    '36223': { workRVU: 6.00, totalRVU: 14.50, fee: 522 },
    '36224': { workRVU: 7.00, totalRVU: 17.00, fee: 612 },
    '36225': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },
    '36226': { workRVU: 6.50, totalRVU: 15.50, fee: 559 },
    '36227': { workRVU: 2.50, totalRVU: 6.00, fee: 216 },
    '36228': { workRVU: 3.00, totalRVU: 7.00, fee: 252 },

    // Carotid Angiography S&I
    '75676': { workRVU: 1.07, totalRVU: 2.80, fee: 101 },
    '75680': { workRVU: 1.30, totalRVU: 3.40, fee: 122 },

    // Carotid Stenting
    '37215': { workRVU: 18.00, totalRVU: 42.00, fee: 1512 },
    '37216': { workRVU: 16.00, totalRVU: 38.00, fee: 1369 },
    '37217': { workRVU: 20.00, totalRVU: 47.00, fee: 1693 },
    '37218': { workRVU: 19.00, totalRVU: 45.00, fee: 1621 },

    // Thoracic Aortography
    '75600': { workRVU: 1.00, totalRVU: 2.50, fee: 90 },
    '75605': { workRVU: 1.20, totalRVU: 3.00, fee: 108 },

    // EVAR
    '34701': { workRVU: 25.00, totalRVU: 58.00, fee: 2089 },
    '34702': { workRVU: 28.00, totalRVU: 65.00, fee: 2341 },
    '34703': { workRVU: 30.00, totalRVU: 70.00, fee: 2522 },
    '34704': { workRVU: 22.00, totalRVU: 51.00, fee: 1837 },
    '34705': { workRVU: 32.00, totalRVU: 75.00, fee: 2702 },
    '34706': { workRVU: 12.00, totalRVU: 28.00, fee: 1009 },
    '34707': { workRVU: 4.00, totalRVU: 9.50, fee: 342 },
    '34708': { workRVU: 6.00, totalRVU: 14.00, fee: 504 },
    '34709': { workRVU: 8.00, totalRVU: 19.00, fee: 685 },
    '34710': { workRVU: 10.00, totalRVU: 24.00, fee: 865 },
    '34711': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },
    '34712': { workRVU: 3.50, totalRVU: 8.50, fee: 306 },
    '34713': { workRVU: 3.03, totalRVU: 7.12, fee: 256 },
    '34714': { workRVU: 6.19, totalRVU: 14.78, fee: 532 },
    '34717': { workRVU: 40.77, totalRVU: 92.50, fee: 3330 },
    '34718': { workRVU: 20.00, totalRVU: 46.00, fee: 1656 },
    '34808': { workRVU: 3.57, totalRVU: 8.50, fee: 306 },
    '34812': { workRVU: 4.41, totalRVU: 10.50, fee: 378 },
    '34820': { workRVU: 7.82, totalRVU: 18.50, fee: 666 },
    '34833': { workRVU: 10.24, totalRVU: 24.50, fee: 882 },
    '34834': { workRVU: 3.83, totalRVU: 9.00, fee: 324 },
    '0254T': { workRVU: 28.00, totalRVU: 65.00, fee: 2340 },
    '0255T': { workRVU: 10.00, totalRVU: 24.00, fee: 864 },

    // Vascular Embolization
    '37241': { workRVU: 4.62, totalRVU: 10.75, fee: 387 },
    '37242': { workRVU: 5.25, totalRVU: 12.50, fee: 450 },

    // TEVAR
    '33880': { workRVU: 35.00, totalRVU: 82.00, fee: 2954 },
    '33881': { workRVU: 33.00, totalRVU: 77.00, fee: 2774 },
    '33883': { workRVU: 10.00, totalRVU: 24.00, fee: 865 },
    '33884': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },
    '33886': { workRVU: 8.00, totalRVU: 19.00, fee: 685 },
    '33889': { workRVU: 15.00, totalRVU: 35.00, fee: 1261 },
    '33891': { workRVU: 18.00, totalRVU: 42.00, fee: 1512 },

    // Renal/Visceral Intervention
    '37220': { workRVU: 6.37, totalRVU: 15.25, fee: 549 },
    '37221': { workRVU: 7.44, totalRVU: 17.50, fee: 630 },

    // Renal Denervation
    '0338T': { workRVU: 8.00, totalRVU: 19.00, fee: 684 },
    '0339T': { workRVU: 10.00, totalRVU: 24.00, fee: 864 },

    // Subclavian/Innominate Interventions
    '37226': { workRVU: 9.00, totalRVU: 21.00, fee: 756 },
    '37227': { workRVU: 11.00, totalRVU: 26.00, fee: 937 },
    '37236': { workRVU: 8.50, totalRVU: 20.00, fee: 720 },
    '37237': { workRVU: 4.25, totalRVU: 10.00, fee: 360 },
    '37246': { workRVU: 6.00, totalRVU: 14.00, fee: 504 },
    '37247': { workRVU: 3.00, totalRVU: 7.00, fee: 252 },

    // Echocardiography - TTE
    '93306': { workRVU: 1.30, totalRVU: 3.22, fee: 116 },
    '93307': { workRVU: 0.92, totalRVU: 2.28, fee: 82 },
    '93308': { workRVU: 0.53, totalRVU: 1.31, fee: 47 },

    // Echocardiography - Doppler Add-ons
    '93320': { workRVU: 0.38, totalRVU: 0.94, fee: 34 },
    '93321': { workRVU: 0.21, totalRVU: 0.52, fee: 19 },
    '93325': { workRVU: 0.17, totalRVU: 0.42, fee: 15 },

    // Echocardiography - TEE
    '93312': { workRVU: 2.13, totalRVU: 5.28, fee: 190 },
    '93313': { workRVU: 0.96, totalRVU: 2.38, fee: 86 },
    '93314': { workRVU: 1.17, totalRVU: 2.90, fee: 104 },
    '93315': { workRVU: 2.50, totalRVU: 6.20, fee: 223 },
    '93316': { workRVU: 1.10, totalRVU: 2.73, fee: 98 },
    '93317': { workRVU: 1.40, totalRVU: 3.47, fee: 125 },
    '93318': { workRVU: 2.75, totalRVU: 6.82, fee: 246 },

    // Echocardiography - Stress Echo
    '93350': { workRVU: 1.10, totalRVU: 2.73, fee: 98 },
    '93351': { workRVU: 1.50, totalRVU: 3.72, fee: 134 },

    // Echocardiography - Congenital
    '93303': { workRVU: 1.75, totalRVU: 4.34, fee: 156 },
    '93304': { workRVU: 0.85, totalRVU: 2.11, fee: 76 },

    // Echocardiography - Contrast & Strain (Add-ons)
    '93352': { workRVU: 0.15, totalRVU: 0.37, fee: 13 },
    '93356': { workRVU: 0.25, totalRVU: 0.62, fee: 22 },

    // Echocardiography - 3D Echo
    '93355': { workRVU: 4.50, totalRVU: 11.16, fee: 402 },
    '76376': { workRVU: 0.20, totalRVU: 0.50, fee: 18 },
    '76377': { workRVU: 0.50, totalRVU: 1.24, fee: 45 },

    // Echocardiography - Intracardiac Echo
    '93662': { workRVU: 2.00, totalRVU: 4.96, fee: 179 },

    // Electrophysiology - EP Studies (Diagnostic)
    '93600': { workRVU: 3.75, totalRVU: 9.30, fee: 335 },
    '93602': { workRVU: 3.24, totalRVU: 8.03, fee: 289 },
    '93603': { workRVU: 3.24, totalRVU: 8.03, fee: 289 },
    '93609': { workRVU: 3.84, totalRVU: 9.52, fee: 343 },
    '93610': { workRVU: 3.35, totalRVU: 8.31, fee: 299 },
    '93612': { workRVU: 3.24, totalRVU: 8.03, fee: 289 },
    '93613': { workRVU: 4.50, totalRVU: 11.16, fee: 402 },
    '93618': { workRVU: 4.11, totalRVU: 10.19, fee: 367 },
    '93619': { workRVU: 10.23, totalRVU: 25.37, fee: 914 },
    '93620': { workRVU: 3.82, totalRVU: 9.47, fee: 341 },
    '93621': { workRVU: 2.14, totalRVU: 5.31, fee: 191 },
    '93622': { workRVU: 2.50, totalRVU: 6.20, fee: 223 },
    '93623': { workRVU: 1.76, totalRVU: 4.36, fee: 157 },
    '93624': { workRVU: 6.86, totalRVU: 17.01, fee: 613 },
    '93631': { workRVU: 9.88, totalRVU: 24.50, fee: 883 },
    '93640': { workRVU: 4.55, totalRVU: 11.28, fee: 406 },
    '93641': { workRVU: 5.50, totalRVU: 13.64, fee: 491 },
    '93642': { workRVU: 2.79, totalRVU: 6.92, fee: 249 },

    // Electrophysiology - Ablation
    '93650': { workRVU: 9.28, totalRVU: 23.01, fee: 829 },
    '93653': { workRVU: 18.79, totalRVU: 46.60, fee: 1680 },
    '93654': { workRVU: 27.32, totalRVU: 67.75, fee: 2442 },
    '93655': { workRVU: 6.50, totalRVU: 16.12, fee: 581 },
    '93656': { workRVU: 24.25, totalRVU: 60.14, fee: 2167 },
    '93657': { workRVU: 5.00, totalRVU: 12.40, fee: 447 },

    // Electrophysiology - Pacemaker Implant
    '33206': { workRVU: 7.91, totalRVU: 19.62, fee: 707 },
    '33207': { workRVU: 7.59, totalRVU: 18.82, fee: 678 },
    '33208': { workRVU: 9.69, totalRVU: 24.03, fee: 866 },
    '33212': { workRVU: 4.83, totalRVU: 11.98, fee: 432 },
    '33213': { workRVU: 5.14, totalRVU: 12.75, fee: 460 },
    '33227': { workRVU: 5.11, totalRVU: 12.67, fee: 457 },
    '33228': { workRVU: 5.36, totalRVU: 13.29, fee: 479 },
    '33229': { workRVU: 5.64, totalRVU: 13.99, fee: 504 },

    // Electrophysiology - ICD Implant
    '33249': { workRVU: 13.81, totalRVU: 34.25, fee: 1234 },
    '33230': { workRVU: 6.60, totalRVU: 16.37, fee: 590 },
    '33231': { workRVU: 6.28, totalRVU: 15.57, fee: 561 },
    '33240': { workRVU: 7.00, totalRVU: 17.36, fee: 626 },
    '33262': { workRVU: 6.81, totalRVU: 16.89, fee: 609 },
    '33263': { workRVU: 7.07, totalRVU: 17.53, fee: 632 },
    '33264': { workRVU: 7.35, totalRVU: 18.23, fee: 657 },

    // Electrophysiology - CRT (BiV) Implant
    '33224': { workRVU: 8.50, totalRVU: 21.08, fee: 760 },
    '33225': { workRVU: 5.00, totalRVU: 12.40, fee: 447 },
    '33226': { workRVU: 5.75, totalRVU: 14.26, fee: 514 },

    // Electrophysiology - Leadless Pacemaker (33274 already in Structural)
    '33275': { workRVU: 10.50, totalRVU: 26.03, fee: 938 },

    // Electrophysiology - Subcutaneous ICD
    '33270': { workRVU: 12.38, totalRVU: 30.70, fee: 1106 },
    '33271': { workRVU: 5.50, totalRVU: 13.64, fee: 491 },
    '33272': { workRVU: 6.00, totalRVU: 14.88, fee: 536 },
    '33273': { workRVU: 5.25, totalRVU: 13.02, fee: 469 },

    // Electrophysiology - Device Revision/Upgrade
    '33214': { workRVU: 7.75, totalRVU: 19.22, fee: 693 },
    '33215': { workRVU: 4.50, totalRVU: 11.16, fee: 402 },
    '33216': { workRVU: 4.85, totalRVU: 12.03, fee: 433 },
    '33217': { workRVU: 6.50, totalRVU: 16.12, fee: 581 },
    '33218': { workRVU: 4.25, totalRVU: 10.54, fee: 380 },
    '33220': { workRVU: 5.50, totalRVU: 13.64, fee: 491 },
    '33221': { workRVU: 5.50, totalRVU: 13.64, fee: 491 },
    '33222': { workRVU: 4.00, totalRVU: 9.92, fee: 357 },
    '33223': { workRVU: 4.50, totalRVU: 11.16, fee: 402 },

    // Electrophysiology - Lead Extraction
    '33234': { workRVU: 8.50, totalRVU: 21.08, fee: 760 },
    '33235': { workRVU: 10.50, totalRVU: 26.03, fee: 938 },
    '33241': { workRVU: 22.00, totalRVU: 54.56, fee: 1966 },
    '33244': { workRVU: 12.00, totalRVU: 29.76, fee: 1072 },

    // Electrophysiology - Loop Recorder
    '33285': { workRVU: 2.25, totalRVU: 5.58, fee: 201 },
    '33286': { workRVU: 1.50, totalRVU: 3.72, fee: 134 },

    // Electrophysiology - External Cardioversion
    '92960': { workRVU: 2.72, totalRVU: 6.75, fee: 243 },
    '92961': { workRVU: 5.25, totalRVU: 13.02, fee: 469 },

    // Electrophysiology - Tilt Table / Autonomic Testing
    '95921': { workRVU: 1.25, totalRVU: 3.10, fee: 112 },
    '95922': { workRVU: 1.50, totalRVU: 3.72, fee: 134 },
    '95924': { workRVU: 2.75, totalRVU: 6.82, fee: 246 }
  };
