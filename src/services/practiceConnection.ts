// Practice Connection Service
// Handles practice code connection for linking Pro users to organizations
// Uses Firestore for data queries

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { getFirebaseAuth } from './firebaseConfig';
import { getDevModeSettings, mockHospitals, mockCathLabs, mockPracticeMembers } from './devMode';
import { logger } from './logger';

const PRACTICE_CONNECTION_KEY = 'practice_connection';

export interface PracticeConnection {
  practiceCode: string;
  organizationId: string;
  organizationName: string;
  connectedAt: string;
  isActive: boolean;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface Hospital {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CathLab {
  id: string;
  organizationId: string;
  hospitalId?: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

// Get current practice connection
export async function getPracticeConnection(): Promise<PracticeConnection | null> {
  try {
    const { value } = await window.storage.get(PRACTICE_CONNECTION_KEY);
    if (value) {
      const connection = JSON.parse(value) as PracticeConnection;
      if (connection.isActive) {
        return connection;
      }
    }
    return null;
  } catch (error) {
    logger.error('Error loading practice connection', error);
    return null;
  }
}

// Save practice connection
async function savePracticeConnection(connection: PracticeConnection | null): Promise<void> {
  try {
    if (connection) {
      await window.storage.set(PRACTICE_CONNECTION_KEY, JSON.stringify(connection));
    } else {
      await window.storage.remove(PRACTICE_CONNECTION_KEY);
    }
  } catch (error) {
    logger.error('Error saving practice connection', error);
    throw error;
  }
}

// Validate practice code and connect to organization
export async function connectToPractice(practiceCode: string): Promise<PracticeConnection> {
  const code = practiceCode.trim().toUpperCase();

  if (!code) {
    throw new Error('Practice code is required.');
  }

  if (code.length < 6) {
    throw new Error('Invalid practice code format.');
  }

  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  const db = getFirebaseDb();

  // Look up organization by practice code
  const orgsRef = collection(db, 'organizations');
  const q = query(orgsRef, where('practiceCode', '==', code), where('isActive', '==', true));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Invalid practice code. Please check the code and try again.');
  }

  const orgDoc = snapshot.docs[0];
  const orgData = orgDoc.data();

  // Create connection
  const connection: PracticeConnection = {
    practiceCode: code,
    organizationId: orgDoc.id,
    organizationName: orgData.name,
    connectedAt: new Date().toISOString(),
    isActive: true
  };

  // Update user's organization in Firestore
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (user) {
    await updateDoc(doc(db, 'users', user.uid), {
      organizationId: orgDoc.id,
      organizationName: orgData.name,
      tier: 'pro'
    });
  }

  // Save locally
  await savePracticeConnection(connection);

  return connection;
}

// Create connection from a redeemed invite (called after invite registration)
export async function createConnectionFromInvite(invite: {
  organizationId: string;
  organizationName: string;
  code: string;
}): Promise<PracticeConnection> {
  const connection: PracticeConnection = {
    practiceCode: invite.code,
    organizationId: invite.organizationId,
    organizationName: invite.organizationName,
    connectedAt: new Date().toISOString(),
    isActive: true
  };

  await savePracticeConnection(connection);
  return connection;
}

// Disconnect from practice
export async function disconnectFromPractice(): Promise<void> {
  const connection = await getPracticeConnection();

  if (connection && isFirebaseConfigured()) {
    const db = getFirebaseDb();
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (user) {
      await updateDoc(doc(db, 'users', user.uid), {
        organizationId: null,
        organizationName: null
      });
    }
  }

  await savePracticeConnection(null);
}

// Check if connected to a practice
export async function isConnectedToPractice(): Promise<boolean> {
  const connection = await getPracticeConnection();
  return connection !== null && connection.isActive;
}

// Get hospitals for connected practice
export async function getHospitals(): Promise<Hospital[]> {
  // Check for dev mode first
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled && devSettings.useMockServer) {
    return mockHospitals
      .filter(h => h.organizationId === devSettings.mockOrganizationId)
      .map(h => ({
        id: h.id,
        organizationId: h.organizationId,
        name: h.name,
        isActive: true,
        createdAt: new Date().toISOString()
      }));
  }

  const connection = await getPracticeConnection();
  if (!connection || !isFirebaseConfigured()) {
    return [];
  }

  const db = getFirebaseDb();
  const hospitalsRef = collection(db, 'organizations', connection.organizationId, 'hospitals');
  const q = query(hospitalsRef, where('isActive', '==', true), orderBy('name'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => ({
    id: d.id,
    organizationId: connection.organizationId,
    name: d.data().name,
    isActive: true,
    createdAt: d.data().createdAt || new Date().toISOString()
  }));
}

// Get cath labs for connected practice
export async function getCathLabs(hospitalId?: string): Promise<CathLab[]> {
  // Check for dev mode first
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled && devSettings.useMockServer) {
    let labs = mockCathLabs.map(lab => ({
      id: lab.id,
      organizationId: devSettings.mockOrganizationId || '',
      hospitalId: lab.hospitalId,
      name: lab.name,
      isActive: true,
      createdAt: new Date().toISOString()
    }));

    if (hospitalId) {
      labs = labs.filter(lab => lab.hospitalId === hospitalId);
    }

    return labs;
  }

  const connection = await getPracticeConnection();
  if (!connection || !isFirebaseConfigured()) {
    return [];
  }

  const db = getFirebaseDb();
  const cathLabsRef = collection(db, 'organizations', connection.organizationId, 'cathLabs');

  const constraints = [where('isActive', '==', true), orderBy('name')];
  if (hospitalId) {
    constraints.unshift(where('hospitalId', '==', hospitalId));
  }

  const q = query(cathLabsRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => ({
    id: d.id,
    organizationId: connection.organizationId,
    hospitalId: d.data().hospitalId,
    name: d.data().name,
    isActive: true,
    createdAt: d.data().createdAt || new Date().toISOString()
  }));
}

// Get all physicians in connected practice
export async function getPracticePhysicians(): Promise<{
  id: string;
  email: string;
  displayName: string | null;
}[]> {
  const connection = await getPracticeConnection();
  if (!connection || !isFirebaseConfigured()) {
    return [];
  }

  const db = getFirebaseDb();
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('organizationId', '==', connection.organizationId),
    where('role', '==', 'physician'),
    orderBy('displayName')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => ({
    id: d.id,
    email: d.data().email,
    displayName: d.data().displayName || null
  }));
}

// Verify practice code format (6+ alphanumeric characters)
export function isValidPracticeCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{6,12}$/i.test(code.trim());
}

// Generate practice code (for admin use)
export function generatePracticeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get connection status details
export async function getConnectionStatus(): Promise<{
  isConnected: boolean;
  organizationName: string | null;
  connectedAt: string | null;
  hospitalsCount: number;
  cathLabsCount: number;
}> {
  const connection = await getPracticeConnection();

  if (!connection) {
    return {
      isConnected: false,
      organizationName: null,
      connectedAt: null,
      hospitalsCount: 0,
      cathLabsCount: 0
    };
  }

  const hospitals = await getHospitals();
  const cathLabs = await getCathLabs();

  return {
    isConnected: true,
    organizationName: connection.organizationName,
    connectedAt: connection.connectedAt,
    hospitalsCount: hospitals.length,
    cathLabsCount: cathLabs.length
  };
}

// ==================== Admin Management Functions ====================

import { PracticeMember, UserRole } from '../types';

// Get all practice members
export async function getPracticeMembers(orgId: string): Promise<PracticeMember[]> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    return mockPracticeMembers.map(m => ({
      ...m,
      role: m.role as UserRole
    }));
  }

  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('organizationId', '==', orgId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => ({
    id: d.id,
    email: d.data().email || '',
    displayName: d.data().displayName || null,
    role: d.data().role as UserRole,
    joinedAt: d.data().createdAt || new Date().toISOString(),
    isActive: true,
    chargeCount: 0
  }));
}

// Remove a member from the practice
export async function removePracticeMember(orgId: string, userId: string): Promise<void> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    logger.info('[Dev] Removed member');
    return;
  }

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  await updateDoc(doc(db, 'users', userId), {
    organizationId: null,
    organizationName: null,
    role: null
  });
}

// Change a member's role
export async function changeMemberRole(orgId: string, userId: string, newRole: UserRole): Promise<void> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    logger.info('[Dev] Changed member role');
    return;
  }

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  await updateDoc(doc(db, 'users', userId), { role: newRole });
}

// Regenerate practice invite code
export async function regeneratePracticeCode(orgId: string): Promise<string> {
  const newCode = generatePracticeCode();

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    logger.info('[Dev] Regenerated practice code');
    return newCode;
  }

  if (!isFirebaseConfigured()) return newCode;

  const db = getFirebaseDb();
  await updateDoc(doc(db, 'organizations', orgId), { practiceCode: newCode });

  return newCode;
}

// Get practice details
export async function getPracticeDetails(orgId: string): Promise<{
  name: string;
  practiceCode: string;
  memberCount: number;
  hospitalCount: number;
  cathLabCount: number;
}> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    return {
      name: devSettings.mockOrganizationName || 'Memorial Cardiology Associates',
      practiceCode: 'CATH2024',
      memberCount: mockPracticeMembers.length,
      hospitalCount: mockHospitals.filter(h => h.organizationId === orgId || orgId === 'YOCA').length,
      cathLabCount: mockCathLabs.length
    };
  }

  const members = await getPracticeMembers(orgId);
  const hospitals = await getHospitals();
  const cathLabs = await getCathLabs();

  const db = getFirebaseDb();
  const orgDoc = await getDoc(doc(db, 'organizations', orgId));
  const orgData = orgDoc.exists() ? orgDoc.data() : {};

  return {
    name: orgData?.name || 'Practice',
    practiceCode: orgData?.practiceCode || '',
    memberCount: members.length,
    hospitalCount: hospitals.length,
    cathLabCount: cathLabs.length
  };
}

// Add a hospital
export async function addHospital(orgId: string, name: string): Promise<Hospital> {
  const newHospital: Hospital = {
    id: `hosp-${Date.now()}`,
    organizationId: orgId,
    name,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    logger.info('[Dev] Added hospital');
    mockHospitals.push({ id: newHospital.id, name: newHospital.name, organizationId: orgId });
    return newHospital;
  }

  if (!isFirebaseConfigured()) return newHospital;

  const db = getFirebaseDb();
  const hospitalsRef = collection(db, `organizations/${orgId}/hospitals`);
  const docRef = await addDoc(hospitalsRef, {
    name,
    isActive: true,
    createdAt: new Date().toISOString()
  });
  return { ...newHospital, id: docRef.id };
}

// Deactivate a hospital
export async function deactivateHospital(orgId: string, hospitalId: string): Promise<void> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    logger.info('[Dev] Deactivated hospital');
    const idx = mockHospitals.findIndex(h => h.id === hospitalId);
    if (idx !== -1) mockHospitals.splice(idx, 1);
    return;
  }

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  await updateDoc(doc(db, `organizations/${orgId}/hospitals`, hospitalId), { isActive: false });
}

// Add a cath lab
export async function addCathLab(orgId: string, name: string, hospitalId?: string): Promise<CathLab> {
  const newLab: CathLab = {
    id: `lab-${Date.now()}`,
    organizationId: orgId,
    hospitalId,
    name,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    logger.info('[Dev] Added cath lab');
    mockCathLabs.push({ id: newLab.id, name: newLab.name, hospitalId: hospitalId });
    return newLab;
  }

  if (!isFirebaseConfigured()) return newLab;

  const db = getFirebaseDb();
  const cathLabsRef = collection(db, `organizations/${orgId}/cathLabs`);
  const docRef = await addDoc(cathLabsRef, {
    name,
    hospitalId: hospitalId || null,
    isActive: true,
    createdAt: new Date().toISOString()
  });
  return { ...newLab, id: docRef.id };
}

// Deactivate a cath lab
export async function deactivateCathLab(orgId: string, cathLabId: string): Promise<void> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    logger.info('[Dev] Deactivated cath lab');
    const idx = mockCathLabs.findIndex(l => l.id === cathLabId);
    if (idx !== -1) mockCathLabs.splice(idx, 1);
    return;
  }

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  await updateDoc(doc(db, `organizations/${orgId}/cathLabs`, cathLabId), { isActive: false });
}
