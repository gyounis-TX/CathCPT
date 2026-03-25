import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileText, Sparkles, Check, AlertTriangle, Loader2, ImagePlus, X, MessageCircle, ChevronDown, Send } from 'lucide-react';
import { extractCodesFromOpNote, ExtractionResult, chatAboutExtraction, ChatMessage } from '../services/opNoteService';
import { saveCharge } from '../services/chargesService';
import { logAuditEvent } from '../services/auditService';
import { rvuData } from '../data/rvuData';
import { Inpatient } from '../types';

interface OpNoteExtractorScreenProps {
  onClose: () => void;
  orgId: string;
  userId: string;
  userName: string;
  patients: Inpatient[];
  onChargeCreated?: () => void;
  onOpenInEditor?: (result: ExtractionResult) => void;
}

export const OpNoteExtractorScreen: React.FC<OpNoteExtractorScreenProps> = ({
  onClose,
  orgId,
  userId,
  userName,
  patients,
  onChargeCreated,
  onOpenInEditor,
}) => {
  const [opNoteText, setOpNoteText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState('');
  const [checkedCpts, setCheckedCpts] = useState<Set<string>>(new Set());
  const [checkedIcds, setCheckedIcds] = useState<Set<string>>(new Set());
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [imageData, setImageData] = useState<{ data: string; type: string; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB. For multi-page PDFs, upload just the procedure note page as a screenshot.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setImageData({ data: base64, type: file.type, preview: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        return;
      }
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  // Reset chat when new extraction happens
  useEffect(() => {
    setChatMessages([]);
    setChatOpen(true);
    setChatInput('');
  }, [result]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || !result) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const reply = await chatAboutExtraction(updatedMessages, result, opNoteText || undefined);
      setChatMessages([...updatedMessages, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setChatMessages([...updatedMessages, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!opNoteText.trim() && !imageData) return;
    setIsExtracting(true);
    setError('');
    setResult(null);
    setSubmitSuccess(false);

    try {
      const raw = await extractCodesFromOpNote(
        opNoteText.trim() || undefined,
        imageData ? { data: imageData.data, type: imageData.type } : undefined
      );
      console.log('Extraction result:', JSON.stringify(raw, null, 2));
      const extracted: ExtractionResult = {
        cptCodes: raw.cptCodes || [],
        icd10Codes: raw.icd10Codes || raw.icd10codes || [],
        sedation: raw.sedation || { included: false, units: 0 },
        summary: raw.summary || 'Extraction complete',
      };
      setResult(extracted);
      setCheckedCpts(new Set(extracted.cptCodes.map(c => c.code)));
      setCheckedIcds(new Set(extracted.icd10Codes.map(c => c.code)));
    } catch (err: any) {
      setError(err.message || 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleCpt = (code: string) => {
    setCheckedCpts(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleIcd = (code: string) => {
    setCheckedIcds(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const getConfidenceColor = (c: string) => {
    if (c === 'high') return 'bg-green-100 text-green-700';
    if (c === 'medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const handleSubmitCharge = async () => {
    if (!result) return;
    const resolvedPatientId = selectedPatientId || `cath-${patientName.trim()}-${patientDob}`;
    if (!resolvedPatientId || resolvedPatientId === 'cath--') {
      setError('Please select or enter a patient');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const selectedCpts = result.cptCodes.filter(c => checkedCpts.has(c.code));
      const selectedIcds = result.icd10Codes.filter(c => checkedIcds.has(c.code));

      const cptCode = selectedCpts.map(c => c.modifier ? `${c.code}${c.modifier}` : c.code).join(' + ');
      const cptDescription = selectedCpts.map(c => c.description).join(' + ');
      const diagnoses = selectedIcds.map(c => c.code);

      let totalRvu = 0;
      selectedCpts.forEach(c => {
        const r = rvuData[c.code];
        if (r) totalRvu += r.workRVU;
      });

      await saveCharge({
        inpatientId: resolvedPatientId,
        chargeDate,
        cptCode,
        cptDescription,
        diagnoses,
        submittedByUserId: userId,
        submittedByUserName: userName,
        rvu: totalRvu,
      }, orgId);

      logAuditEvent(orgId, {
        action: 'op_note_charge_submitted',
        userId,
        userName,
        targetPatientId: resolvedPatientId,
        targetPatientName: patientName || selectedPatientId,
        details: `Op note extraction: ${selectedCpts.length} CPT codes, ${selectedIcds.length} ICD-10 codes`,
        listContext: null,
        metadata: { summary: result.summary, cptCount: selectedCpts.length },
      });

      setSubmitSuccess(true);
      onChargeCreated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit charge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Close">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-600" />
          <h1 className="text-lg font-semibold text-gray-800">Op Note Extractor</h1>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Input */}
        <div className="bg-white rounded-xl p-4 border border-gray-200" onPaste={handlePaste}>
          {/* Image Preview */}
          {imageData && (
            <div className="mb-3 relative inline-block">
              {imageData.type === 'application/pdf' ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText size={20} className="text-red-500" />
                  <span className="text-sm text-gray-700">PDF uploaded</span>
                </div>
              ) : (
                <img src={imageData.preview} alt="Op note" className="max-h-48 rounded-lg border border-gray-200" />
              )}
              <button
                onClick={() => setImageData(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText size={16} className="inline mr-1.5" />
            Paste Text or Image
          </label>
          <textarea
            value={opNoteText}
            onChange={(e) => setOpNoteText(e.target.value)}
            placeholder="Paste operative note text here, or paste/upload a screenshot..."
            className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleExtract}
              disabled={(!opNoteText.trim() && !imageData) || isExtracting}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
            {isExtracting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing op note...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Extract Codes
              </>
            )}
          </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              <ImagePlus size={16} />
              Upload Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success */}
        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-2">
            <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">Charge submitted successfully! It will appear in the Charge Queue.</p>
          </div>
        )}

        {/* Results */}
        {result && !submitSuccess && (
          <>
            {/* Summary + RVU */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm font-medium text-indigo-800 mb-3">{result.summary}</p>
              {(() => {
                const checkedCodes = result.cptCodes.filter(c => checkedCpts.has(c.code));
                let totalWorkRVU = 0;
                checkedCodes.forEach(c => {
                  const rvu = rvuData[c.code];
                  if (rvu) { totalWorkRVU += rvu.workRVU; }
                });
                if (result.sedation.included) {
                  const sedRvu = rvuData['99152'];
                  if (sedRvu) { totalWorkRVU += sedRvu.workRVU; }
                  if (result.sedation.units > 0) {
                    const addSed = rvuData['99153'];
                    if (addSed) { totalWorkRVU += addSed.workRVU * result.sedation.units; }
                  }
                }
                const totalPayment = totalWorkRVU * 36.04;
                return (
                  <div className="flex gap-4">
                    <div className="bg-white/60 rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-indigo-700">{totalWorkRVU.toFixed(2)}</p>
                      <p className="text-[10px] text-indigo-500 font-medium">Total Work RVU</p>
                    </div>
                    <div className="bg-white/60 rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-green-700">${totalPayment.toFixed(2)}</p>
                      <p className="text-[10px] text-green-600 font-medium">Est. Medicare (CF $36.04)</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* CPT Codes */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">CPT Codes ({result.cptCodes.length})</h3>
              <div className="space-y-2">
                {result.cptCodes.map((c) => (
                  <label key={c.code} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={checkedCpts.has(c.code)}
                      onChange={() => toggleCpt(c.code)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-gray-800">
                          {c.code}{c.modifier || ''}
                        </span>
                        {c.vessel && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-medium rounded-full">{c.vessel}</span>
                        )}
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${getConfidenceColor(c.confidence)}`}>{c.confidence}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{c.description}</p>
                      <p className="text-[11px] text-gray-400 mt-1 italic">{c.reasoning}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Moderate Sedation */}
            {result.sedation.included && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Moderate Sedation</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-mono font-semibold text-gray-800">99152</span> — Initial 15 minutes</p>
                  {result.sedation.units > 0 && (
                    <p><span className="font-mono font-semibold text-gray-800">99153</span> — Additional {result.sedation.units} × 15 min ({result.sedation.units * 15} min)</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Total sedation time: {(result.sedation as any).minutes || (15 + result.sedation.units * 15)} minutes</p>
                </div>
              </div>
            )}

            {/* ICD-10 Codes */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">ICD-10 Diagnoses ({result.icd10Codes.length})</h3>
              <div className="space-y-2">
                {result.icd10Codes.map((c) => (
                  <label key={c.code} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={checkedIcds.has(c.code)}
                      onChange={() => toggleIcd(c.code)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-800">{c.code}</span>
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${getConfidenceColor(c.confidence)}`}>{c.confidence}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{c.description}</p>
                      <p className="text-[11px] text-gray-400 mt-1 italic">{c.reasoning}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Patient & Date */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Charge Details</h3>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">— Select from roster or enter below —</option>
                  {patients.filter(p => p.isActive).map(p => (
                    <option key={p.id} value={p.id}>{p.patientName} (DOB: {p.dob || 'N/A'})</option>
                  ))}
                </select>
              </div>

              {!selectedPatientId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Patient Name</label>
                    <input
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Last, First"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">DOB (optional)</label>
                    <input
                      value={patientDob}
                      onChange={(e) => setPatientDob(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Procedure Date</label>
                <input
                  type="date"
                  value={chargeDate}
                  onChange={(e) => setChargeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmitCharge}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Submit as Charge
              </button>
              {onOpenInEditor && (
                <button
                  onClick={() => onOpenInEditor(result)}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Open in Code Editor
                </button>
              )}
            </div>

            {/* Chat about extraction */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} className="text-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">Ask about this analysis</span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${chatOpen ? 'rotate-180' : ''}`} />
              </button>

              {chatOpen && (
                <div className="border-t border-gray-200">
                  {/* Messages */}
                  <div ref={chatScrollRef} className="max-h-64 overflow-y-auto p-4 space-y-3">
                    {chatMessages.length === 0 && (
                      <p className="text-xs text-gray-400 text-center">Ask a question — e.g., "Why wasn't 92929 used for the second vessel?" or "What would change if IVUS was done on both vessels?"</p>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-2 rounded-xl rounded-bl-sm flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="border-t border-gray-200 p-3 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                      placeholder="Ask about the coding..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleChatSend}
                      disabled={!chatInput.trim() || chatLoading}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
