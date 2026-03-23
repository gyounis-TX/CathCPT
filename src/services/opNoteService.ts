import { getFirebaseAuth } from './firebaseConfig';

const EXTRACT_CODES_URL = import.meta.env.VITE_EXTRACT_CODES_URL || '';

export interface ExtractedCPTCode {
  code: string;
  description: string;
  vessel?: string;
  modifier?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ExtractedICD10Code {
  code: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ExtractionResult {
  cptCodes: ExtractedCPTCode[];
  icd10Codes: ExtractedICD10Code[];
  sedation: { included: boolean; units: number };
  summary: string;
}

export async function extractCodesFromOpNote(opNoteText: string): Promise<ExtractionResult> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const idToken = await user.getIdToken(true);

  const response = await fetch(EXTRACT_CODES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opNoteText, idToken }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (response.status === 401) throw new Error('Authentication failed');
    if (response.status === 403) throw new Error('Admin access required');
    throw new Error(err.error || `Extraction failed (${response.status})`);
  }

  return response.json();
}
