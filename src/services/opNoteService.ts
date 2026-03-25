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
  sedation: { included: boolean; units: number; minutes: number };
  summary: string;
}

export async function extractCodesFromOpNote(
  opNoteText?: string,
  image?: { data: string; type: string }
): Promise<ExtractionResult> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const idToken = await user.getIdToken(true);

  const payload: Record<string, string> = { idToken };
  if (opNoteText) payload.operativeNote = opNoteText;
  if (image) {
    payload.image = image.data;
    payload.imageType = image.type;
  }

  const response = await fetch(EXTRACT_CODES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (response.status === 401) throw new Error('Authentication failed');
    if (response.status === 403) throw new Error('Admin access required');
    throw new Error(err.error || `Extraction failed (${response.status})`);
  }

  const json = await response.json();
  const raw = json.data || json;

  // Normalize snake_case response from Lambda to camelCase
  const cptCodes: ExtractedCPTCode[] = (raw.cptCodes || raw.cpt_codes || []).map((c: any) => ({
    code: c.code,
    description: c.description || '',
    vessel: c.vessel || undefined,
    modifier: Array.isArray(c.modifiers) && c.modifiers.length > 0 ? `-${c.modifiers[0]}` : c.modifier || undefined,
    confidence: c.confidence || 'medium',
    reasoning: c.reasoning || c.rationale || '',
  }));

  const icd10Codes: ExtractedICD10Code[] = (raw.icd10Codes || raw.icd10_codes || []).map((c: any) => ({
    code: c.code,
    description: c.description || '',
    confidence: c.confidence || 'medium',
    reasoning: c.reasoning || c.rationale || '',
  }));

  // Compute sedation from sedation_minutes (preferred) or fallback to CPT code detection
  const sedationMinutes = raw.sedation_minutes || raw.sedationMinutes || 0;
  let sedation: { included: boolean; units: number; minutes: number };

  if (sedationMinutes > 0) {
    // First 15 min = 99152 (included), additional 15-min blocks = 99153 units
    const additionalUnits = Math.max(0, Math.floor((sedationMinutes - 15) / 15));
    sedation = { included: true, units: additionalUnits, minutes: sedationMinutes };
  } else {
    // Fallback: check if Claude returned 99152/99153 as CPT codes
    const has99152 = cptCodes.some(c => c.code === '99152');
    const count99153 = cptCodes.filter(c => c.code === '99153').length;
    if (has99152) {
      const mins = 15 + count99153 * 15;
      sedation = { included: true, units: count99153, minutes: mins };
    } else {
      sedation = { included: false, units: 0, minutes: 0 };
    }
  }

  return {
    cptCodes: cptCodes.filter(c => c.code !== '99152' && c.code !== '99153'),
    icd10Codes,
    sedation,
    summary: raw.summary || raw.notes || 'Extraction complete',
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatAboutExtraction(
  chatMessages: ChatMessage[],
  extractionResult: ExtractionResult,
  operativeNote?: string,
): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const idToken = await user.getIdToken(true);

  const response = await fetch(EXTRACT_CODES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'chat',
      chatMessages,
      extractionResult,
      operativeNote,
      idToken,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Chat failed (${response.status})`);
  }

  const json = await response.json();
  return json.reply || '';
}
