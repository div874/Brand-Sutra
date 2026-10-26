'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/lib/store';
import { 
  CheckCircle2, 
  Info, 
  Upload, 
  FileText, 
  Plus, 
  X, 
  Check, 
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  Trash2,
  Edit2,
  FileWarning,
  Database
} from 'lucide-react';
import { TrustedFact, ProhibitedTerm, ApprovedTerm, ToneGuideline } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function RulesPage() {
  const { brand, approvedEdits, importRules } = useApp();
  const [tab, setTab] = useState<'facts' | 'terms' | 'tone' | 'edits'>('facts');

  // Ingestion Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ingestMode, setIngestMode] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);

  // Extracted preview state (fully editable before import)
  const [extractedFacts, setExtractedFacts] = useState<TrustedFact[]>([]);
  const [extractedProhibited, setExtractedProhibited] = useState<ProhibitedTerm[]>([]);
  const [extractedApproved, setExtractedApproved] = useState<ApprovedTerm[]>([]);
  const [extractedTone, setExtractedTone] = useState<ToneGuideline[]>([]);
  const [hasExtractedPreview, setHasExtractedPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setHasExtractedPreview(false);
      setErrorMessage(null);
      setOcrWarning(null);
    }
  };

  const processInput = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setOcrWarning(null);

    try {
      let response: Response;

      if (ingestMode === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a file (.pdf, .docx, .txt, .json)');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        response = await fetch('/api/parse-rules', {
          method: 'POST',
          body: formData
        });
      } else {
        if (!pastedText.trim()) {
          throw new Error('Please enter or paste your brand guidelines text or JSON.');
        }
        response = await fetch('/api/parse-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: pastedText,
            format: pastedText.trim().startsWith('{') ? 'json' : 'text'
          })
        });
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.ocrRequired) {
          setOcrWarning(data.error);
          return;
        }
        throw new Error(data.error || 'Failed to parse rules from input.');
      }

      if (data.extracted) {
        setExtractedFacts(data.extracted.trustedFacts || []);
        setExtractedProhibited(data.extracted.prohibitedTerms || []);
        setExtractedApproved(data.extracted.approvedTerms || []);
        setExtractedTone(data.extracted.toneGuidelines || []);
        setHasExtractedPreview(true);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error processing rules.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    const totalCount =
      extractedFacts.length +
      extractedProhibited.length +
      extractedApproved.length +
      extractedTone.length;

    if (totalCount === 0) {
      setErrorMessage('No rules remaining to import.');
      return;
    }

    importRules({
      trustedFacts: extractedFacts,
      prohibitedTerms: extractedProhibited,
      approvedTerms: extractedApproved,
      toneGuidelines: extractedTone
    });

    setImportStatusMessage(`Successfully verified and imported ${totalCount} rules to the brand knowledge base.`);
    setHasExtractedPreview(false);
    setSelectedFile(null);
    setPastedText('');
    setIsModalOpen(false);

    setTimeout(() => {
      setImportStatusMessage(null);
    }, 4500);
  };

  const removeFact = (idx: number) => {
    setExtractedFacts(prev => prev.filter((_, i) => i !== idx));
  };

  const removeProhibited = (idx: number) => {
    setExtractedProhibited(prev => prev.filter((_, i) => i !== idx));
  };

  const updateFactField = (idx: number, field: keyof TrustedFact, value: string) => {
    setExtractedFacts(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const updateProhibitedField = (idx: number, field: keyof ProhibitedTerm, value: string) => {
    setExtractedProhibited(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const loadSamplePreset = (presetType: 'json' | 'text' | 'fact') => {
    setIngestMode('text');
    setHasExtractedPreview(false);
    setErrorMessage(null);
    setOcrWarning(null);

    if (presetType === 'json') {
      setPastedText(JSON.stringify({
        trustedFacts: [
          {
            topic: "Carbon Neutral Shipping",
            claimOrStat: "100% carbon-neutral worldwide shipping offset via Gold Standard certified credits.",
            source: "Logistics ESG Audit 2025",
            pageNumber: 4
          }
        ],
        prohibitedTerms: [
          {
            term: "completely green",
            reason: "Misleading absolute sustainability claim prohibited by UK CMA green claims code.",
            suggestedAlternative: "low-carbon logistics",
            pageNumber: 2
          }
        ]
      }, null, 2));
    } else if (presetType === 'fact') {
      setPastedText(`BRAND AUDIT SPECIFICATION (Page 3):
- Trusted specification: Water-resistance certified to IPX8 depth of 3 meters for 60 minutes under IEC 60529 standard.
- Avoid the term "waterproof" because it implies total indefinite submersion without limits. Use "water-resistant up to 3m" instead.
- Approved term: HydroSeal Gasket Technology.`);
    } else {
      setPastedText(`Voice & Tone Update:
- Voice attribute: Direct & Unadorned
- Do: Explain the real materials and exact metrics.
- Don't: Hide behind marketing buzzwords.
- Prohibited term: "world's best" -> use "rigorously tested" instead.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {importStatusMessage && (
        <div className="p-3 rounded-lg bg-[#171717] border border-[#333333] text-xs text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-white" />
            {importStatusMessage}
          </span>
          <button 
            type="button" 
            onClick={() => setImportStatusMessage(null)}
            className="text-[#737373] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="pb-4 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Brand Rules & Trusted Facts
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border border-[#262626] bg-[#121212] text-[#a3a3a3]">
              <Database className="w-3 h-3 text-[#737373]" />
              <span>{isSupabaseConfigured ? 'Supabase Sync Active' : 'Supabase Ready (sb_publishable_OP50...) '}</span>
            </span>
          </div>
          <p className="text-xs text-[#8a8a8a] mt-1">
            {brand.name}: &ldquo;{brand.voiceSummary}&rdquo;
          </p>
        </div>

        {/* Add Rules Button */}
        <button
          id="btn-open-ingest-modal"
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setHasExtractedPreview(false);
            setErrorMessage(null);
            setOcrWarning(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add / Ingest Rules</span>
        </button>
      </div>

      {/* Minimal Tab Switcher */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          id="tab-trusted-facts"
          type="button"
          onClick={() => setTab('facts')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            tab === 'facts' ? 'bg-[#262626] text-white' : 'text-[#8a8a8a] hover:text-white'
          }`}
        >
          Trusted Facts ({brand.trustedFacts.length})
        </button>
        <button
          id="tab-terminology-rules"
          type="button"
          onClick={() => setTab('terms')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            tab === 'terms' ? 'bg-[#262626] text-white' : 'text-[#8a8a8a] hover:text-white'
          }`}
        >
          Terminology Rules ({brand.prohibitedTerms.length + brand.approvedTerms.length})
        </button>
        <button
          id="tab-tone-pillars"
          type="button"
          onClick={() => setTab('tone')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            tab === 'tone' ? 'bg-[#262626] text-white' : 'text-[#8a8a8a] hover:text-white'
          }`}
        >
          Tone Pillars ({brand.toneGuidelines.length})
        </button>
        <button
          id="tab-approved-edits"
          type="button"
          onClick={() => setTab('edits')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
            tab === 'edits' ? 'bg-[#262626] text-white' : 'text-[#8a8a8a] hover:text-white'
          }`}
        >
          <span>Approved Edits ({approvedEdits.length})</span>
        </button>
      </div>

      {/* Tab 1: Facts */}
      {tab === 'facts' && (
        <div className="space-y-3">
          {brand.trustedFacts.map((fact) => (
            <div key={fact.id} className="p-4 rounded-lg bg-[#121212] border border-[#262626]">
              <div className="flex items-center justify-between text-xs text-[#8a8a8a] mb-1.5">
                <span className="font-medium text-[#ededed]">{fact.topic}</span>
                <div className="flex items-center gap-2">
                  {fact.sourceDoc && (
                    <span className="text-[11px] text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#262626]">
                      {fact.sourceDoc} {fact.pageNumber ? `(p.${fact.pageNumber})` : ''}
                    </span>
                  )}
                  <span>Verified: {fact.verifiedDate}</span>
                </div>
              </div>
              <p className="text-sm text-[#ededed] mb-2">{fact.claimOrStat}</p>
              <div className="text-xs text-[#737373]">Source: {fact.source}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Terms */}
      {tab === 'terms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
              Prohibited Terms
            </h2>
            {brand.prohibitedTerms.map((term) => (
              <div key={term.id} className="p-3 rounded-lg bg-[#121212] border border-[#262626] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white line-through">&ldquo;{term.term}&rdquo;</span>
                  {term.sourceDoc && (
                    <span className="text-[10px] text-[#737373]">
                      {term.sourceDoc} {term.pageNumber ? `p.${term.pageNumber}` : ''}
                    </span>
                  )}
                </div>
                <div className="text-[#8a8a8a] mb-1.5">{term.reason}</div>
                <div className="text-[#ededed]">Use instead: &ldquo;{term.suggestedAlternative}&rdquo;</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
              Approved Terms
            </h2>
            {brand.approvedTerms.map((term) => (
              <div key={term.id} className="p-3 rounded-lg bg-[#121212] border border-[#262626] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">&ldquo;{term.term}&rdquo;</span>
                  {term.sourceDoc && (
                    <span className="text-[10px] text-[#737373]">
                      {term.sourceDoc}
                    </span>
                  )}
                </div>
                <div className="text-[#8a8a8a]">{term.preferredUsage}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Tone */}
      {tab === 'tone' && (
        <div className="space-y-3">
          {brand.toneGuidelines.map((g, i) => (
            <div key={i} className="p-4 rounded-lg bg-[#121212] border border-[#262626] text-xs">
              <div className="text-sm font-semibold text-white mb-1">{g.attribute}</div>
              <p className="text-[#a3a3a3] mb-3">{g.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-[#171717] border border-[#262626]">
                  <span className="text-[#8a8a8a] block mb-0.5">Do:</span>
                  <span className="text-[#ededed]">&ldquo;{g.doExample}&rdquo;</span>
                </div>
                <div className="p-2 rounded bg-[#171717] border border-[#262626]">
                  <span className="text-[#8a8a8a] block mb-0.5">Don&apos;t:</span>
                  <span className="text-[#8a8a8a] line-through">&ldquo;{g.dontExample}&rdquo;</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Approved Edits */}
      {tab === 'edits' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[#121212] border border-[#262626] text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-medium text-white">
              <Info className="w-4 h-4 text-[#a3a3a3]" />
              <span>How Brand Sutra Uses Approved Edits</span>
            </div>
            <p className="text-[#8a8a8a] leading-relaxed">
              Approved edits record historical corrections made during reviews. They help Brand Sutra learn and provide precedence for future drafts, without automatically becoming permanent brand rules.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1f1f1f] text-[11px]">
              <div>
                <span className="font-semibold text-white block">1. Brand Rules</span>
                <span className="text-[#737373]">Official guidelines and approved facts.</span>
              </div>
              <div>
                <span className="font-semibold text-white block">2. Approved Edits</span>
                <span className="text-[#737373]">Historical examples of reviewer fixes.</span>
              </div>
              <div>
                <span className="font-semibold text-white block">3. Learned Precedence</span>
                <span className="text-[#737373]">Patterns surfaced during future reviews.</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {approvedEdits.length === 0 ? (
              <div className="p-8 text-center rounded-lg bg-[#121212] border border-[#262626] text-xs text-[#737373]">
                No approved edits recorded yet.
              </div>
            ) : (
              approvedEdits.map((edit) => (
                <div
                  key={edit.id}
                  className="p-4 rounded-lg bg-[#121212] border border-[#262626] text-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-[#8a8a8a] flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="border border-[#333333] bg-[#1a1a1a] text-white px-2 py-0.5 rounded font-medium text-[11px]">
                        {edit.category || 'Reviewer Edit'}
                      </span>
                      <span className="text-[11px] text-[#737373]">
                        Approved by {edit.approvedBy}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#e5e5e5]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Reviewer approved</span>
                      <span className="text-[#525252]">•</span>
                      <span className="text-[#737373]">
                        {new Date(edit.approvedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded bg-[#0a0a0a] border border-[#262626]">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#737373] block mb-1">
                        ORIGINAL TEXT
                      </span>
                      <p className="text-xs font-mono text-[#a3a3a3] line-through">
                        &ldquo;{edit.originalText}&rdquo;
                      </p>
                    </div>

                    <div className="p-3 rounded bg-[#171717] border border-[#333333]">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#d4d4d4] block mb-1">
                        APPROVED CHANGE
                      </span>
                      <p className="text-xs font-mono text-white font-medium">
                        &ldquo;{edit.approvedChange}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1f1f1f] space-y-1">
                    <p className="text-[#a3a3a3]">
                      <strong className="text-white">Reason:</strong> {edit.reason}
                    </p>
                    {edit.relatedRuleOrFact && (
                      <p className="text-[#737373] text-[11px]">
                        <strong className="text-[#8a8a8a]">Rule / Reference:</strong> {edit.relatedRuleOrFact}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Ingestion & Rule Verification Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-xl bg-[#121212] border border-[#262626] p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Ingest & Verify Brand Rules
                </h3>
                <p className="text-xs text-[#8a8a8a] mt-0.5">
                  Import guidelines from text, PDF, DOCX, TXT, or JSON. Every rule is editable before saving.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setHasExtractedPreview(false);
                  setErrorMessage(null);
                  setOcrWarning(null);
                }}
                className="text-[#737373] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ingestion Mode Switcher */}
            {!hasExtractedPreview && (
              <div className="flex items-center gap-2 border-b border-[#262626] pb-3 text-xs">
                <button
                  id="btn-mode-file"
                  type="button"
                  onClick={() => { setIngestMode('file'); setHasExtractedPreview(false); setOcrWarning(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                    ingestMode === 'file' ? 'bg-[#262626] text-white font-medium' : 'text-[#8a8a8a] hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload File (.pdf, .docx, .txt, .json)
                </button>

                <button
                  id="btn-mode-text"
                  type="button"
                  onClick={() => { setIngestMode('text'); setHasExtractedPreview(false); setOcrWarning(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                    ingestMode === 'text' ? 'bg-[#262626] text-white font-medium' : 'text-[#8a8a8a] hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Paste Raw Text / JSON
                </button>
              </div>
            )}

            {/* OCR Required Warning Banner */}
            {ocrWarning && (
              <div className="p-4 rounded-lg bg-[#201515] border border-rose-900/60 text-xs text-rose-200 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-rose-300">
                  <FileWarning className="w-4 h-4 text-rose-400" />
                  <span>OCR Required: Scanned PDF Detected</span>
                </div>
                <p className="text-[#a3a3a3] leading-relaxed">
                  {ocrWarning}
                </p>
                <p className="text-[11px] text-[#737373] pt-1">
                  Tip: Use the &ldquo;Paste Raw Text&rdquo; tab to paste the document text directly or upload a text-searchable digital PDF.
                </p>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded bg-[#1f1212] border border-[#522] text-xs text-[#fca5a5] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* File Upload Mode */}
            {ingestMode === 'file' && !hasExtractedPreview && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border border-dashed border-[#333333] hover:border-[#525252] rounded-xl text-center cursor-pointer bg-[#0a0a0a] transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    id="rule-file-input"
                    type="file"
                    accept=".pdf,.docx,.txt,.json,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-7 h-7 text-[#737373] mx-auto mb-2" />
                  <p className="text-xs text-white font-medium mb-1">
                    {selectedFile ? selectedFile.name : 'Click to select or drop document'}
                  </p>
                  <p className="text-[11px] text-[#737373]">
                    Supports PDF, DOCX, TXT, JSON (up to 10MB)
                  </p>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between p-3 rounded bg-[#0a0a0a] border border-[#262626] text-xs">
                    <span className="text-[#ededed] truncate max-w-sm font-mono">{selectedFile.name}</span>
                    <span className="text-[#737373]">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                )}
              </div>
            )}

            {/* Raw Text / JSON Mode */}
            {ingestMode === 'text' && !hasExtractedPreview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#8a8a8a]">
                  <span>Paste brand policy, guidelines, or structured JSON:</span>
                  <div className="flex items-center gap-1.5">
                    <span>Try Preset:</span>
                    <button
                      type="button"
                      onClick={() => loadSamplePreset('json')}
                      className="text-white hover:underline"
                    >
                      JSON
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => loadSamplePreset('fact')}
                      className="text-white hover:underline"
                    >
                      PDF Excerpt
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => loadSamplePreset('text')}
                      className="text-white hover:underline"
                    >
                      Tone/Terms
                    </button>
                  </div>
                </div>

                <textarea
                  id="rule-raw-textarea"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={8}
                  placeholder={`Paste brand rules, facts, or JSON here...\nExample:\n- Trusted fact: Outer casing is 80% recycled post-consumer plastic.\n- Prohibited: "100% green" -> use "sustainably engineered" instead.`}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded p-3 text-xs font-mono text-[#ededed] placeholder:text-[#525252] focus:border-[#525252]"
                />
              </div>
            )}

            {/* Process / Extract Button */}
            {!hasExtractedPreview && (
              <div className="flex justify-end gap-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#8a8a8a] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="btn-process-rules"
                  type="button"
                  onClick={processInput}
                  disabled={isProcessing || (ingestMode === 'file' && !selectedFile) || (ingestMode === 'text' && !pastedText.trim())}
                  className="px-3.5 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] disabled:opacity-40 rounded transition-colors"
                >
                  {isProcessing ? 'Parsing Document...' : 'Extract & Preview Rules'}
                </button>
              </div>
            )}

            {/* Editable Extracted Preview (Requirement 1: Trustworthy Rule Extraction) */}
            {hasExtractedPreview && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                      Review & Edit Extracted Rules Before Import
                    </h4>
                    <p className="text-[11px] text-[#8a8a8a]">
                      Every extracted item is fully editable. Delete or adjust claims before saving.
                    </p>
                  </div>
                  <span className="text-xs text-[#a3a3a3] font-mono">
                    {extractedFacts.length + extractedProhibited.length + extractedApproved.length + extractedTone.length} items found
                  </span>
                </div>

                {/* Editable Facts Section */}
                {extractedFacts.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#a3a3a3]">
                      Extracted Facts ({extractedFacts.length})
                    </div>
                    {extractedFacts.map((fact, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#0a0a0a] border border-[#262626] space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={fact.topic}
                            onChange={(e) => updateFactField(idx, 'topic', e.target.value)}
                            placeholder="Topic (e.g. Recycled Content)"
                            className="bg-[#171717] border border-[#262626] rounded px-2 py-1 text-xs text-white w-48"
                          />
                          <div className="flex items-center gap-2">
                            {fact.sourceDoc && (
                              <span className="text-[10px] text-[#737373] bg-[#121212] px-2 py-0.5 rounded border border-[#262626]">
                                {fact.sourceDoc} {fact.pageNumber ? `(p.${fact.pageNumber})` : ''}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFact(idx)}
                              title="Delete this fact"
                              className="text-[#737373] hover:text-white p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <textarea
                          value={fact.claimOrStat}
                          onChange={(e) => updateFactField(idx, 'claimOrStat', e.target.value)}
                          rows={2}
                          className="w-full bg-[#171717] border border-[#262626] rounded p-2 text-xs text-[#ededed]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Editable Prohibited Terms Section */}
                {extractedProhibited.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#a3a3a3]">
                      Prohibited Terms ({extractedProhibited.length})
                    </div>
                    {extractedProhibited.map((term, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#0a0a0a] border border-[#262626] space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[#737373] text-[11px]">Banned:</span>
                            <input
                              type="text"
                              value={term.term}
                              onChange={(e) => updateProhibitedField(idx, 'term', e.target.value)}
                              className="bg-[#171717] border border-[#262626] rounded px-2 py-1 text-xs text-white font-mono flex-1"
                            />
                            <span className="text-[#737373] text-[11px]">Use instead:</span>
                            <input
                              type="text"
                              value={term.suggestedAlternative}
                              onChange={(e) => updateProhibitedField(idx, 'suggestedAlternative', e.target.value)}
                              className="bg-[#171717] border border-[#262626] rounded px-2 py-1 text-xs text-[#ededed] flex-1"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProhibited(idx)}
                            title="Delete this rule"
                            className="text-[#737373] hover:text-white p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={term.reason}
                          onChange={(e) => updateProhibitedField(idx, 'reason', e.target.value)}
                          placeholder="Reason why prohibited"
                          className="w-full bg-[#171717] border border-[#262626] rounded px-2 py-1 text-[11px] text-[#a3a3a3]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setHasExtractedPreview(false)}
                    className="px-3 py-1.5 text-xs text-[#8a8a8a] hover:text-white"
                  >
                    Re-extract / Back
                  </button>
                  <button
                    id="btn-confirm-import"
                    type="button"
                    onClick={handleConfirmImport}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Import ({extractedFacts.length + extractedProhibited.length + extractedApproved.length + extractedTone.length}) Rules</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
