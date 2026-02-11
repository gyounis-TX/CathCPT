# CathCPT - Interventional Cardiology CPT Code Manager (iOS)

A comprehensive React Native/Expo app for interventional cardiologists to manage CPT codes, track RVUs, and generate HIPAA-compliant procedure reports.

## Features

- **2026 CPT Codes**: Full coverage of diagnostic cath, PCI, structural heart, TAVR, and more
- **Vessel/Modifier Selection**: All PCI codes, add-on procedures, and imaging codes include coronary vessel documentation
- **Auto -59 Modifier**: Automatic modifier application for diagnostic cath + PCI same day
- **RVU Calculator**: Real-time work RVU and Medicare reimbursement estimates
- **ICD-10 Indications**: Cardiac, peripheral, and structural heart indication support
- **Multi-vessel PCI**: Support for up to 3 vessels with individual code selection
- **HIPAA Compliant**: Uses case IDs instead of patient names, no PHI stored
- **Report Generation**: Share-ready reports via clipboard or native share

## Quick Start

```bash
npx create-expo-app CathCPT-App
cd CathCPT-App

npx expo install @react-native-async-storage/async-storage expo-clipboard react-native-svg
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler

# Copy source files from this package
npx expo start
```

## Vessel/Modifier Documentation

These codes require coronary vessel selection:
- All base PCI codes (92920-92945)
- Drug-coated balloon codes (0913T, 0914T)
- PCI add-on procedures (92972, 92973, 92974)
- Intravascular imaging (92978, 92979, 0523T, 0524T)
- FFR/CFR measurements (93571, 93572)

Available modifiers: LD (LAD), LC (LCx), RC (RCA), LM (Left Main), RI (Ramus)

## HIPAA Compliance

This app is designed to be HIPAA-exempt by using case IDs instead of patient names and not storing PHI.

CPT® codes © American Medical Association. CathCPT 2026.
