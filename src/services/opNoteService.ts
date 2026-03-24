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

  // Detect sedation from CPT codes if not explicit
  const sedationCode = cptCodes.find(c => c.code === '99152' || c.code === '99153');
  const sedation = raw.sedation || {
    included: !!sedationCode,
    units: sedationCode ? 1 : 0,
  };

  return {
    cptCodes: cptCodes.filter(c => c.code !== '99152' && c.code !== '99153'), // sedation shown separately
    icd10Codes,
    sedation,
    summary: raw.summary || 'Extraction complete',
  };
}
