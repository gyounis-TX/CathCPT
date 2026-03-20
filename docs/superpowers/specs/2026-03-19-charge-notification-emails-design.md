# Charge Notification Emails Design Spec

**Date:** 2026-03-19
**Scope:** Email admins when physicians submit cath lab charges

---

## Overview

When a physician submits a cath lab charge, selected admin users in the organization receive an email notification. The feature is opt-in, configurable per organization, and sends only non-PHI data.

---

## 1. Firestore Data Model

New field on `organizations/{orgId}` document:

```typescript
chargeNotifications: {
  enabled: boolean;           // master toggle, default false
  recipientUserIds: string[]; // user IDs of org members to notify
}
```

Recipients are resolved to email addresses at send time by reading `users/{uid}.email`.

---

## 2. Cloud Function — `onChargeCreated`

**File:** `firebase/functions/index.js`
**Trigger:** `onDocumentCreated("organizations/{orgId}/charges/{chargeId}")`

**Logic:**
1. Read the new charge document fields: `cptCode`, `chargeDate`, `submittedByUserName`, `inpatientId`
2. Fetch `organizations/{orgId}` document
3. Check `chargeNotifications.enabled` — if `false` or missing, return early
4. Read `chargeNotifications.recipientUserIds` — if empty, return early
5. Fetch each `users/{uid}` document to get `email` and `displayName`
6. Validate each recipient has `organizationId` matching the charge's org
7. Write to `mail` collection (one document per email) to trigger the Firestore Send Email extension

**Email format:**
- **From:** `CathDoc <admin@systolicbp.com>` (existing default)
- **Subject:** `New charge submitted by Dr. {submittedByUserName}`
- **Body (HTML):**
  - Case ID: `{inpatientId}`
  - CPT Codes: `{cptCode}`
  - Procedure Date: `{chargeDate}`
  - Submitted By: `{submittedByUserName}`
  - Footer: "This is an automated notification from CathDoc."

**No PHI:** No patient name, DOB, or MRN included in the email. Only the opaque case ID.

**Only fires on charge creation**, not on updates (status changes, edits).

---

## 3. Settings UI — Admin Notification Config

**File:** `src/screens/SettingsScreen.tsx`
**Visibility:** Admin users only (`userMode.role === 'admin'`)
**Placement:** After existing "Notifications" section in pro-mode settings

**UI elements:**
- Section header: "Charge Notifications"
- Toggle: "Email when physicians submit charges" — controls `chargeNotifications.enabled`
- When enabled, shows a list of org members with checkboxes
  - Org members fetched from Firestore `users` collection where `organizationId` matches
  - Each row: checkbox + display name + email
  - Pre-checked if already in `recipientUserIds`
- Save writes `chargeNotifications` to `organizations/{orgId}` document

**New service function needed:**
- `getOrgMembers(orgId: string): Promise<{id, displayName, email}[]>` — fetches all users in the org
- `updateChargeNotificationSettings(orgId, settings)` — writes to org document

---

## 4. PHI & Security

- **No PHI in emails** — case ID, CPT codes, procedure date, submitter name only
- **Firestore rules** — only admins can write `chargeNotifications` field on org document (existing admin rules enforce this)
- **Mail collection** — only Cloud Function writes to `mail`, not frontend
- **Recipient validation** — Cloud Function verifies each recipient's `organizationId` matches before sending
- **Email credentials** — managed by existing Firestore Send Email extension via SMTP config

---

## Out of Scope

- Push notifications (email only for now)
- Notification on charge edits or status changes (only new charge creation)
- Batching/digest emails (one email per charge)
- External email recipients (org members only)
- Individual-mode users (pro-mode organizations only)
