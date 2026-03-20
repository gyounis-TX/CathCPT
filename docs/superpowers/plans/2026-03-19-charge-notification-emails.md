# Charge Notification Emails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email admin users when physicians submit cath lab charges, configurable per organization via Settings.

**Architecture:** A Firestore `onDocumentCreated` Cloud Function triggers on new charges, checks org notification settings, and writes to the existing `mail` collection to send emails via the Firestore Send Email extension. Admin UI in SettingsScreen manages the toggle and recipient list.

**Tech Stack:** Firebase Cloud Functions (Node.js), Firestore, Firestore Send Email extension (Zoho SMTP), React/TypeScript frontend

**Spec:** `docs/superpowers/specs/2026-03-19-charge-notification-emails-design.md`

---

### Task 1: Update Organization Type

**Files:**
- Modify: `src/types/index.ts:379-385`

- [ ] **Step 1: Add chargeNotifications field to Organization interface**

In `src/types/index.ts`, add the optional field to the `Organization` interface:

```typescript
// FROM:
export interface Organization {
  id: string;
  name: string;
  practiceCode: string;
  isActive: boolean;
  createdAt: string;
}

// TO:
export interface Organization {
  id: string;
  name: string;
  practiceCode: string;
  isActive: boolean;
  createdAt: string;
  chargeNotifications?: {
    enabled: boolean;
    recipientUserIds: string[];
  };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add chargeNotifications field to Organization type"
```

---

### Task 2: Add Firestore Security Rules

**Files:**
- Modify: `firebase/firestore.rules`

- [ ] **Step 1: Add mail collection deny rule**

At the end of `firebase/firestore.rules`, before the final closing braces, add:

```
    // ── Mail (Cloud Functions only) ─────────────────────────
    match /mail/{docId} {
      allow read, write: if false;
    }
```

Place it after the `organizations` block (after line 177), before the final two closing braces.

- [ ] **Step 2: Commit**

```bash
git add firebase/firestore.rules
git commit -m "feat: add Firestore rule blocking client access to mail collection"
```

---

### Task 3: Cloud Function — `onChargeCreated`

**Files:**
- Modify: `firebase/functions/index.js`

- [ ] **Step 1: Add the onChargeCreated function**

Append this function to the end of `firebase/functions/index.js`:

```javascript
// Send email notification to admins when a physician submits a cath charge
exports.onChargeCreated = onDocumentCreated("organizations/{orgId}/charges/{chargeId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const charge = snap.data();
  const orgId = event.params.orgId;
  const chargeId = event.params.chargeId;
  const db = getFirestore();
  const auth = getAuth();

  // 1. Check if org has charge notifications enabled
  const orgDoc = await db.collection("organizations").doc(orgId).get();
  if (!orgDoc.exists) return;

  const orgData = orgDoc.data();
  const notifications = orgData.chargeNotifications;
  if (!notifications || !notifications.enabled) return;

  const recipientUserIds = notifications.recipientUserIds || [];
  if (recipientUserIds.length === 0) return;

  // 2. Filter out the submitting physician
  const submitterId = charge.submittedByUserId || null;
  const filtered = submitterId
    ? recipientUserIds.filter(uid => uid !== submitterId)
    : recipientUserIds;

  if (filtered.length === 0) return;

  // 3. Resolve email addresses via Admin SDK
  const submitterName = charge.submittedByUserName || "a physician";
  const cptCode = charge.cptCode || "N/A";
  const chargeDate = charge.chargeDate || "N/A";
  const caseId = charge.inpatientId || "N/A";

  for (const uid of filtered) {
    try {
      const userRecord = await auth.getUser(uid);
      if (!userRecord.email) continue;

      // 4. Write to mail collection (idempotent document ID)
      await db.collection("mail").doc(`${chargeId}-${uid}`).set({
        to: userRecord.email,
        message: {
          subject: `New charge submitted by Dr. ${submitterName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="font-size: 24px; color: #1e40af; margin: 0;">CathDoc</h1>
                <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Charge Notification</p>
              </div>

              <p style="font-size: 16px; color: #111827;">
                Dr. <strong>${submitterName}</strong> submitted a new charge.
              </p>

              <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <table style="width: 100%; font-size: 14px; color: #374151;">
                  <tr><td style="padding: 4px 0; color: #6b7280;">Case ID</td><td style="padding: 4px 0; font-weight: 600;">${caseId}</td></tr>
                  <tr><td style="padding: 4px 0; color: #6b7280;">CPT Codes</td><td style="padding: 4px 0; font-weight: 600;">${cptCode}</td></tr>
                  <tr><td style="padding: 4px 0; color: #6b7280;">Procedure Date</td><td style="padding: 4px 0; font-weight: 600;">${chargeDate}</td></tr>
                </table>
              </div>

              <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 24px;">
                This is an automated notification from CathDoc.
              </p>
            </div>
          `,
        },
      });
    } catch (err) {
      console.error(`Failed to send charge notification to ${uid}:`, err);
      // Skip this recipient, continue to others
    }
  }
});
```

- [ ] **Step 2: Verify function syntax**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc/firebase/functions && node -c index.js`
Expected: No output (no syntax errors).

- [ ] **Step 3: Commit**

```bash
git add firebase/functions/index.js
git commit -m "feat: add onChargeCreated Cloud Function for admin email notifications"
```

---

### Task 4: Notification Service (Frontend)

**Files:**
- Create: `src/services/notificationSettingsService.ts`

- [ ] **Step 1: Create the service file**

Create `src/services/notificationSettingsService.ts`:

```typescript
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from './firebaseConfig';

interface ChargeNotificationSettings {
  enabled: boolean;
  recipientUserIds: string[];
}

interface OrgMember {
  id: string;
  displayName: string;
  email: string;
}

export async function getChargeNotificationSettings(orgId: string): Promise<ChargeNotificationSettings> {
  const db = getFirebaseDb();
  const orgDoc = await getDoc(doc(db, 'organizations', orgId));
  const data = orgDoc.data();
  return data?.chargeNotifications || { enabled: false, recipientUserIds: [] };
}

export async function updateChargeNotificationSettings(
  orgId: string,
  settings: ChargeNotificationSettings
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'organizations', orgId), {
    chargeNotifications: settings,
  });
}

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    displayName: d.data().displayName || d.data().email || 'Unknown',
    email: d.data().email || '',
  }));
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -3`

- [ ] **Step 3: Commit**

```bash
git add src/services/notificationSettingsService.ts
git commit -m "feat: add notification settings service for charge email config"
```

---

### Task 5: Settings UI — Charge Notifications Section

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Add imports and state**

At the top of `SettingsScreen.tsx`, add the import:

```typescript
import { getChargeNotificationSettings, updateChargeNotificationSettings, getOrgMembers } from '../services/notificationSettingsService';
```

Add new state variables inside the component (after existing notification state around line 64):

```typescript
  // Charge notification state (admin only)
  const [chargeNotifEnabled, setChargeNotifEnabled] = useState(false);
  const [chargeNotifRecipients, setChargeNotifRecipients] = useState<string[]>([]);
  const [orgMembers, setOrgMembers] = useState<{id: string; displayName: string; email: string}[]>([]);
  const [chargeNotifLoading, setChargeNotifLoading] = useState(false);
```

- [ ] **Step 2: Add useEffect to load settings**

Add a useEffect after the existing settings load effect:

```typescript
  // Load charge notification settings (admin only)
  useEffect(() => {
    if (!isProMode || userRole !== 'admin' || !orgId) return;
    const load = async () => {
      setChargeNotifLoading(true);
      try {
        const [settings, members] = await Promise.all([
          getChargeNotificationSettings(orgId),
          getOrgMembers(orgId),
        ]);
        setChargeNotifEnabled(settings.enabled);
        setChargeNotifRecipients(settings.recipientUserIds);
        setOrgMembers(members);
      } catch (err) {
        console.error('Failed to load charge notification settings', err);
      } finally {
        setChargeNotifLoading(false);
      }
    };
    load();
  }, [isProMode, userRole, orgId]);
```

- [ ] **Step 3: Add save handler**

```typescript
  const saveChargeNotifSettings = async (enabled: boolean, recipients: string[]) => {
    if (!orgId) return;
    try {
      await updateChargeNotificationSettings(orgId, { enabled, recipientUserIds: recipients });
    } catch (err) {
      console.error('Failed to save charge notification settings', err);
    }
  };
```

- [ ] **Step 4: Add UI section**

After the existing Notifications section (after line 682's closing `)}` and before the PHI Auto-Scrub section), add:

```tsx
        {/* Charge Notifications — admin only */}
        {isProMode && userRole === 'admin' && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Charge Notifications</span>
              </div>
              <button
                onClick={() => {
                  const next = !chargeNotifEnabled;
                  setChargeNotifEnabled(next);
                  saveChargeNotifSettings(next, chargeNotifRecipients);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  chargeNotifEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  chargeNotifEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mb-2 pl-7">Email selected team members when a physician submits a charge</p>
            {chargeNotifEnabled && (
              <div className="mt-3 pl-7 space-y-2">
                {chargeNotifLoading ? (
                  <p className="text-xs text-gray-400">Loading team members...</p>
                ) : orgMembers.length === 0 ? (
                  <p className="text-xs text-gray-400">No team members found</p>
                ) : (
                  orgMembers.map(member => (
                    <label key={member.id} className="flex items-center gap-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={chargeNotifRecipients.includes(member.id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...chargeNotifRecipients, member.id]
                            : chargeNotifRecipients.filter(id => id !== member.id);
                          setChargeNotifRecipients(next);
                          saveChargeNotifSettings(chargeNotifEnabled, next);
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm text-gray-700">{member.displayName}</p>
                        <p className="text-[11px] text-gray-400">{member.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 5: Add Mail icon import**

At the top of SettingsScreen.tsx, add `Mail` to the lucide-react import:

Find the existing lucide import line and add `Mail` to it.

- [ ] **Step 6: Verify build**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -3`

- [ ] **Step 7: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: add charge notification settings UI for admin users"
```

---

### Task 6: Deploy Cloud Function and Rules

- [ ] **Step 1: Deploy Firestore rules**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && firebase deploy --only firestore:rules`

- [ ] **Step 2: Deploy Cloud Functions**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && firebase deploy --only functions`

- [ ] **Step 3: Verify deployment**

Run: `firebase functions:log --only onChargeCreated`
Expected: Function listed with no errors.

- [ ] **Step 4: Commit and push**

```bash
git push origin main
```
