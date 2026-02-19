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
