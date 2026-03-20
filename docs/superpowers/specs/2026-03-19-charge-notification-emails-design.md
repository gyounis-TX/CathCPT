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

Update `Organization` interface in `src/types/index.ts` to include this field as optional.

Recipients are resolved to email addresses at send time via Firebase Admin SDK (`getAuth().getUser(uid).email`) to ensure current addresses.

---

## 2. Cloud Function — `onChargeCreated`

**File:** `firebase/functions/index.js`
**Trigger:** `onDocumentCreated("organizations/{orgId}/charges/{chargeId}")`

`onDocumentCreated` fires only on new document creation, not on `setDoc` overwrites of existing documents. This means status changes, edits, and relinks will not trigger the notification.

**Logic:**
1. Read the new charge document fields: `cptCode`, `chargeDate`, `submittedByUserName`, `submittedByUserId`, `inpatientId`
2. Fetch `organizations/{orgId}` document
3. Check `chargeNotifications.enabled` — if `false` or missing, return early
4. Read `chargeNotifications.recipientUserIds` — if empty, return early
5. Filter out the submitting physician (`submittedByUserId`) from recipients — don't email someone about their own charge
6. For each remaining recipient, use Firebase Admin SDK `getAuth().getUser(uid)` to get current email. Skip recipients where lookup fails (log and continue).
7. Write to `mail` collection using charge ID as the document ID for idempotency (`mail/{chargeId}-{recipientUid}`)

**Null handling:** If `submittedByUserName` is missing, fall back to `"a physician"`.

**Email format:**
- **From:** `CathDoc <admin@systolicbp.com>` (existing default)
- **Subject:** `New charge submitted by Dr. {submittedByUserName}`
- **Body (HTML):**
  - Case ID: `{inpatientId}`
  - CPT Codes: `{cptCode}` (this is a joined string of all codes, e.g., `"92928 + 92929-59"`)
  - Procedure Date: `{chargeDate}`
  - Submitted By: `{submittedByUserName}`
  - Footer: "This is an automated notification from CathDoc."

**No PHI:** No patient name, DOB, or MRN included in the email. Only the opaque case ID.

**Error handling:** Skip-and-continue per recipient. If one recipient's email lookup fails, log the error and send to the remaining recipients.

---

## 3. Settings UI — Admin Notification Config

**File:** `src/screens/SettingsScreen.tsx`
**Visibility:** Admin users only (`userMode.role === 'admin'`)
**Placement:** After existing "Notifications" section in pro-mode settings

**UI elements:**
- Section header: "Charge Notifications"
- Toggle: "Email when physicians submit charges" — writes to Firestore immediately on change (no separate save button, matches pro-mode auto-save pattern)
- When enabled, shows a list of org members with checkboxes
  - Org members fetched from Firestore `users` collection where `organizationId` matches
  - Each row: checkbox + display name + email
  - Pre-checked if already in `recipientUserIds`
  - Checkbox changes write to Firestore immediately

**New service function needed:**
- `getOrgMembers(orgId: string): Promise<{id, displayName, email}[]>` — queries `users` collection where `organizationId == orgId`
- `updateChargeNotificationSettings(orgId, settings)` — writes `chargeNotifications` field to `organizations/{orgId}` document

**Firestore index:** Ensure composite index exists on `users` collection for `organizationId` field.

---

## 4. PHI & Security

- **No PHI in emails** — case ID, CPT codes, procedure date, submitter name only
- **Firestore rules** — only admins can write `chargeNotifications` field on org document (existing admin rules enforce this)
- **Mail collection** — add Firestore rule to block client access:
  ```
  match /mail/{docId} {
    allow read, write: if false; // Only Cloud Functions and extensions
  }
  ```
- **Recipient validation** — Cloud Function uses Admin SDK to verify each recipient exists and belongs to the org
- **Email credentials** — managed by existing Firestore Send Email extension via SMTP config

---

## Out of Scope

- Push notifications (email only for now)
- Notification on charge edits or status changes (only new charge creation)
- Batching/digest emails (one email per charge)
- External email recipients (org members only)
- Individual-mode users (pro-mode organizations only)
