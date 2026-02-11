# CathCPT iOS Deployment Guide

## 🔄 Updating Your Existing App on the App Store

Since you already have CathCPT published on the App Store, this guide covers how to **replace** the existing version with this updated React Native/Expo version.

---

## ⚠️ CRITICAL: Before You Start

### Get Your Existing App Information

1. **Log into App Store Connect:** https://appstoreconnect.apple.com
2. **Find your existing CathCPT app** and note:
   - **Bundle ID:** (e.g., `com.yourname.cathcpt` or `com.cathcpt.app`)
   - **Current Version:** (e.g., `1.0.0`)
   - **Current Build Number:** (e.g., `1`)
   - **SKU:** (your app's unique identifier)

3. **Update `app.json`** in this package to match your existing app:

```json
{
  "expo": {
    "name": "CathCPT",
    "slug": "cathcpt",
    "version": "2.0.0",  // ← INCREMENT this (e.g., 1.0 → 2.0)
    "ios": {
      "bundleIdentifier": "YOUR.EXISTING.BUNDLE.ID",  // ← MUST MATCH exactly
      "buildNumber": "2"  // ← INCREMENT this
    }
  }
}
```

---

## 🗑️ Step 1: Remove Old Xcode Project (If Applicable)

If your existing app was built with Xcode/Swift:

### Option A: Keep Old Project as Backup
```bash
# Rename your old project folder
mv ~/path/to/old/CathCPT ~/path/to/old/CathCPT-OLD-BACKUP
```

### Option B: Archive Old Project
```bash
# Create a zip backup
cd ~/path/to/old/
zip -r CathCPT-v1-backup.zip CathCPT/

# Then remove the old folder
rm -rf CathCPT/
```

### What You DON'T Need to Delete:
- ❌ Don't delete the app from App Store Connect
- ❌ Don't revoke your certificates in Apple Developer portal
- ❌ Don't delete your provisioning profiles

The new Expo app will use your **same Bundle ID** and submit as a **new version** of your existing app.

---

## Step 2: Prepare Your Icon

Your beautiful CathCPT icon needs to be added to the `assets/` folder.

**Replace the placeholder files with your actual icon:**

1. Save your icon image as `original-icon.png` in this folder
2. Run the asset generator:
   ```bash
   python3 generate-assets.py
   ```
   
   This creates all required sizes automatically.

**OR manually replace these files with your icon:**
- `assets/icon.png` - 1024x1024 pixels
- `assets/adaptive-icon.png` - 1024x1024 pixels  
- `assets/splash.png` - 1284x2778 pixels (icon centered on gold background)
- `assets/favicon.png` - 48x48 pixels

---

## Step 3: Set Up Development Environment

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Expo CLI and EAS CLI
npm install -g expo-cli eas-cli
```

---

## Step 4: Create Your Expo Project

```bash
# Create new project
npx create-expo-app CathCPT
cd CathCPT

# Install all dependencies
npx expo install @react-native-async-storage/async-storage expo-clipboard react-native-svg @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context react-native-gesture-handler
```

---

## Step 5: Copy CathCPT Source Files

Copy ALL files from this CathCPT-iOS folder to your new project:

```
CathCPT/
├── App.tsx                    ← REPLACE existing
├── app.json                   ← REPLACE (with your Bundle ID!)
├── tsconfig.json              ← Copy
├── assets/                    ← REPLACE entire folder (with YOUR icon)
│   ├── icon.png
│   ├── adaptive-icon.png
│   ├── splash.png
│   └── favicon.png
└── src/                       ← Copy entire folder
    ├── data/
    │   └── cptData.ts
    ├── screens/
    │   ├── MainScreen.tsx
    │   ├── SettingsScreen.tsx
    │   ├── ReportScreen.tsx
    │   └── ModifierGuideScreen.tsx
    └── components/
        └── AppLogo.tsx
```

---

## Step 6: ⚠️ UPDATE app.json WITH YOUR BUNDLE ID

**This is the most important step!** Edit `app.json`:

```json
{
  "expo": {
    "name": "CathCPT",
    "slug": "cathcpt",
    "version": "2.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#C49A3D"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "YOUR.EXISTING.BUNDLE.ID",
      "buildNumber": "2"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#C49A3D"
      },
      "package": "com.cathcpt.app"
    }
  }
}
```

**Replace `YOUR.EXISTING.BUNDLE.ID` with your actual Bundle ID from App Store Connect!**

---

## Step 7: Test Locally

```bash
# Start development server
npx expo start

# Press 'i' to open iOS Simulator
# Or scan QR code with Expo Go app on your iPhone
```

Make sure everything works before building!

---

## Step 8: Configure EAS Build

```bash
# Login to Expo (use same email as your Apple Developer account)
eas login

# Configure EAS for your project
eas build:configure
```

This creates an `eas.json` file. Update it:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID_EMAIL",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
      }
    }
  }
}
```

---

## Step 9: Build for iOS

```bash
# Build production iOS app
eas build --platform ios

# When prompted:
# - Log in with your Apple Developer account
# - Select "Yes" to let EAS manage credentials
# - Wait for build (~15-20 minutes)
```

You'll get a URL to download the `.ipa` file when complete.

---

## Step 10: Submit Update to App Store

### Option A: Automatic Submission (Recommended)
```bash
eas submit --platform ios
```

### Option B: Manual Submission
1. Download the `.ipa` from the EAS build URL
2. Open **Transporter** app (free from Mac App Store)
3. Sign in with your Apple ID
4. Drag the `.ipa` file into Transporter
5. Click "Deliver"

---

## Step 11: Update App Store Listing

Go to **App Store Connect** → Your App → New Version:

1. **Version:** 2.0.0 (or your incremented version)
2. **What's New:**
   ```
   Version 2.0 - Complete Redesign!
   
   • Updated to 2026 CPT codes
   • New vessel/modifier selection for all PCI and imaging codes
   • Improved RVU calculator with Medicare estimates
   • Enhanced HIPAA-compliant reporting
   • Multi-vessel PCI support (up to 3 vessels)
   • ICD-10 indication categories
   • Modern, faster interface
   ```

3. **Screenshots:** Take new screenshots showing the updated UI
4. Click **Submit for Review**

---

## 📱 Future Updates (The Easy Part!)

After your Expo app is live, updates are MUCH easier:

### Minor Updates (No App Store Review!)
```bash
# Push instant over-the-air updates
eas update --branch production --message "Bug fixes"
```

### Major Updates
```bash
# Increment version in app.json, then:
eas build --platform ios
eas submit --platform ios
```

---

## Quick Commands Reference

```bash
# Development
npx expo start              # Start dev server
npx expo start --ios        # Open iOS simulator

# Building
eas build --platform ios                    # Production build
eas build --platform ios --profile preview  # TestFlight build

# Submitting
eas submit --platform ios   # Submit to App Store

# OTA Updates (no review needed!)
eas update                  # Push update to all users
```

---

## Troubleshooting

### "Bundle ID doesn't match"
Your `app.json` bundleIdentifier MUST exactly match your existing app's Bundle ID in App Store Connect.

### "Build number must be higher"
Increment the `buildNumber` in `app.json` to be higher than your current live version.

### "Module not found" errors
```bash
rm -rf node_modules
npm install
npx expo start --clear
```

### "Signing certificate issues"
```bash
# Let EAS regenerate certificates
eas credentials
# Select iOS → Remove and regenerate
```

### Build fails
```bash
eas build --platform ios --clear-cache
```

---

## Timeline for Update

| Step | Time |
|------|------|
| Setup & configure | 30 minutes |
| Copy files & test locally | 30 minutes |
| Build with EAS | 15-20 minutes |
| Submit to App Store | 5 minutes |
| **App Store Review** | **1-3 days** |

**Your update will replace the existing app for all users once approved!**

---

## Checklist Before Submitting

- [ ] Bundle ID in `app.json` matches your existing app
- [ ] Version number is incremented (e.g., 1.0 → 2.0)
- [ ] Build number is incremented
- [ ] Your icon is in the assets folder
- [ ] App tested locally and works correctly
- [ ] "What's New" text prepared for App Store

---

Good luck with your update! 🚀

Once on Expo, future updates will be much faster - you can even push bug fixes instantly without waiting for App Store review!
