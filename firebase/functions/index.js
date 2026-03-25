// Cloud Functions for CathDoc
// onUserCreated: auto-create /users/{uid} doc when a new user signs up

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

// Alternative: use Auth trigger to create user doc
const { beforeUserCreated } = require("firebase-functions/v2/identity");

exports.onUserCreated = beforeUserCreated(async (event) => {
  const user = event.data;
  const db = getFirestore();

  await db.collection("users").doc(user.uid).set({
    email: user.email || "",
    tier: "individual",
    role: null,
    organizationId: null,
    organizationName: null,
    displayName: user.displayName || null,
    createdAt: new Date().toISOString(),
  });
});

// Send invite email when a new invite code is created
// Requires Firebase "Trigger Email from Firestore" extension (mail collection)
exports.onInviteCreated = onDocumentCreated("inviteCodes/{code}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const invite = snap.data();
  const code = event.params.code;
  const db = getFirestore();

  await db.collection("mail").add({
    to: invite.email,
    message: {
      subject: `You've been invited to join ${invite.organizationName} on CathDoc`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; color: #1e40af; margin: 0;">CathDoc</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Cath Lab Billing</p>
          </div>

          <p style="font-size: 16px; color: #111827;">
            Hi Dr. ${invite.lastName},
          </p>

          <p style="font-size: 15px; color: #374151; line-height: 1.6;">
            <strong>${invite.createdByName}</strong> has invited you to join
            <strong>${invite.organizationName}</strong> on CathDoc as a
            <strong>${invite.role === "admin" ? "Practice Admin" : "Physician"}</strong>.
          </p>

          <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">Your Invite Code</p>
            <p style="font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 4px; color: #111827; margin: 0;">
              ${code}
            </p>
          </div>

          <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #1e40af; font-weight: 600; margin: 0 0 8px;">How to get started:</p>
            <ol style="font-size: 14px; color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Download CathDoc from the App Store</li>
              <li>Create your account</li>
              <li>Enter the invite code above when prompted</li>
            </ol>
          </div>

          <p style="font-size: 13px; color: #9ca3af; text-align: center;">
            This invite was sent by ${invite.createdByName} from ${invite.organizationName}.
            If you weren't expecting this email, you can safely ignore it.
          </p>
        </div>
      `,
    },
  });
});

// Send email notification to admins when a physician submits a cath charge
exports.onChargeCreated = onDocumentCreated("organizations/{orgId}/charges/{chargeId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const charge = snap.data();
  const orgId = event.params.orgId;
  const chargeId = event.params.chargeId;
  const db = getFirestore();
  const auth = getAuth();

  console.log(`Charge created: ${chargeId} in org ${orgId}`);

  // 1. Check if org has charge notifications enabled
  const orgDoc = await db.collection("organizations").doc(orgId).get();
  if (!orgDoc.exists) { console.log("Org not found, skipping notification"); return; }

  const orgData = orgDoc.data();
  const notifications = orgData.chargeNotifications;
  if (!notifications || !notifications.enabled) { console.log("Notifications disabled for org, skipping"); return; }

  const recipientUserIds = notifications.recipientUserIds || [];
  if (recipientUserIds.length === 0) { console.log("No recipients configured, skipping"); return; }
  console.log(`Sending notifications to ${recipientUserIds.length} recipients`);

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
          subject: `New charge submitted by ${submitterName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="font-size: 24px; color: #1e40af; margin: 0;">CathDoc</h1>
                <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Charge Notification</p>
              </div>

              <p style="font-size: 16px; color: #111827;">
                <strong>${submitterName}</strong> submitted a new charge.
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
