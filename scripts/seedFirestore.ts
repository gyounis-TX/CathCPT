/**
 * One-time Firestore seed script for Younis Cardiology (YOCA)
 *
 * Prerequisites:
 *   1. Go to Firebase Console → Project Settings → Service Accounts → Generate New Key
 *   2. Save the JSON file as scripts/serviceAccountKey.json
 *   3. cd scripts && npm install && npx ts-node seedFirestore.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const ORG_ID = 'YOCA';
const ADMIN_EMAIL = 'gyounis@youniscardiology.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

async function seed() {
  console.log('--- Seeding Firestore for Younis Cardiology (YOCA) ---\n');

  // 1. Create Firebase Auth user
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(ADMIN_EMAIL);
    uid = existing.uid;
    console.log(`Auth user already exists: ${uid}`);
  } catch {
    const userRecord = await auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: 'Dr. George Younis',
    });
    uid = userRecord.uid;
    console.log(`Created auth user: ${uid}`);
  }

  // 2. Create organization document
  await db.doc(`organizations/${ORG_ID}`).set({
    name: 'Younis Cardiology',
    practiceCode: 'YOCA2025',
    isActive: true,
    createdAt: new Date().toISOString(),
  });
  console.log(`Created organization: ${ORG_ID}`);

  // 3. Create user document
  await db.doc(`users/${uid}`).set({
    email: ADMIN_EMAIL,
    displayName: 'Dr. George Younis',
    tier: 'pro',
    role: 'admin',
    organizationId: ORG_ID,
    organizationName: 'Younis Cardiology',
    createdAt: new Date().toISOString(),
  });
  console.log(`Created user doc: users/${uid}`);

  // 4. Create hospitals
  const hospitals = ['DHC', 'HMH', 'BSLMC'];
  const hospitalIds: Record<string, string> = {};

  for (const name of hospitals) {
    const ref = await db.collection(`organizations/${ORG_ID}/hospitals`).add({
      name,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    hospitalIds[name] = ref.id;
    console.log(`Created hospital: ${name} (${ref.id})`);
  }

  // 5. Create cath labs (one per hospital)
  const cathLabs = [
    { name: 'DHC Cath Lab', hospital: 'DHC' },
    { name: 'HMH Cath Lab', hospital: 'HMH' },
    { name: 'BSLMC Cath Lab', hospital: 'BSLMC' },
  ];

  for (const lab of cathLabs) {
    const ref = await db.collection(`organizations/${ORG_ID}/cathLabs`).add({
      name: lab.name,
      hospitalId: hospitalIds[lab.hospital],
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    console.log(`Created cath lab: ${lab.name} (${ref.id})`);
  }

  console.log('\n--- Seed complete ---');
  console.log(`\nLogin with: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log('\nTip: Set ADMIN_PASSWORD env var to use a custom password:');
  console.log('  ADMIN_PASSWORD=MySecure123 npx ts-node seedFirestore.ts');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
