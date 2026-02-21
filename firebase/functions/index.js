// Cloud Functions for CathCPT
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
      subject: `You've been invited to join ${invite.organizationName} on CathCPT`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; color: #1e40af; margin: 0;">CathCPT</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Cath Lab Billing</p>
          </div>

          <p style="font-size: 16px; color: #111827;">
            Hi Dr. ${invite.lastName},
          </p>

          <p style="font-size: 15px; color: #374151; line-height: 1.6;">
            <strong>${invite.createdByName}</strong> has invited you to join
            <strong>${invite.organizationName}</strong> on CathCPT as a
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
              <li>Download CathCPT from the App Store</li>
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
