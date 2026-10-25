'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { 
  BookOpen, 
  ShieldAlert, 
  CheckCircle, 
  Sparkles, 
  BookmarkCheck, 
  Calendar, 
  ExternalLink,
  Plus,
  Trash2
} from 'lucide-react';
import { TrustedFact, ProhibitedTerm, ApprovedTerm } from '@/types';

export default function RulesPage() {
  const { brand, updateBrand, userRole } = useApp();
  const [activeTab, setActiveTab] = useState<'facts' | 'terms' | 'tone'>('facts');

  return (
    <div className="space-y-6">
      {/* Brand Header Card */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Brand Knowledge Base
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                Official Guidelines
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {brand.name}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {brand.description}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 max-w-sm text-xs">
            <span className="font-semibold text-slate-300 block mb-1">Core Voice Doctrine:</span>
            <p className="text-slate-400 italic">
              &ldquo;{brand.voiceSummary}&rdquo;
            </p>
          </div>
        </div>

        {/* Navigation Tabs for Rules */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('facts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'facts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Trusted Facts ({brand.trustedFacts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'terms'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Terminology Rules ({brand.prohibitedTerms.length + brand.approvedTerms.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tone')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tone'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Tone Pillars ({brand.toneGuidelines.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Trusted Facts Repository */}
      {activeTab === 'facts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Verified Facts & Claims</h2>
              <p className="text-xs text-slate-400">
                Approved product statistics and scientific citations. The AI checker flags any draft contradicting these.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brand.trustedFacts.map((fact) => (
              <div
                key={fact.id}
                className="p-4 rounded-xl glass-panel border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-md">
                      {fact.topic}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Verified {fact.verifiedDate}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-200 mb-3 leading-relaxed">
                    {fact.claimOrStat}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate max-w-[240px] text-slate-300 font-medium">
                      {fact.source}
                    </span>
                  </div>

                  {fact.sourceUrl && (
                    <a
                      href={fact.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      Audit Ref <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Terminology Rules */}
      {activeTab === 'terms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prohibited Terms Column */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Prohibited & Deprecated Terms
              </h2>
              <p className="text-xs text-slate-400">
                Words and claims that trigger immediate flags in the checker.
              </p>
            </div>

            <div className="space-y-3">
              {brand.prohibitedTerms.map((term) => (
                <div
                  key={term.id}
                  className="p-4 rounded-xl glass-panel border border-rose-900/30 bg-rose-950/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-rose-400 line-through">
                      &ldquo;{term.term}&rdquo;
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300">
                      {term.severity} severity
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-2.5">
                    <strong className="text-slate-400">Reason:</strong> {term.reason}
                  </p>

                  <div className="text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center gap-2">
                    <span className="text-emerald-400 font-semibold shrink-0">Use instead:</span>
                    <span className="text-emerald-200 font-medium">&ldquo;{term.suggestedAlternative}&rdquo;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Approved Terms Column */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Approved Brand Terminology
              </h2>
              <p className="text-xs text-slate-400">
                Preferred technical and marketing terms.
              </p>
            </div>

            <div className="space-y-3">
              {brand.approvedTerms.map((term) => (
                <div
                  key={term.id}
                  className="p-4 rounded-xl glass-panel border border-emerald-900/30 bg-emerald-950/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-emerald-300">
                      &ldquo;{term.term}&rdquo;
                    </span>
                    {term.category && (
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {term.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    {term.preferredUsage}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tone Guidelines */}
      {activeTab === 'tone' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Tone & Voice Pillars</h2>
            <p className="text-xs text-slate-400">
              Editorial principles for how the brand communicates across channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {brand.toneGuidelines.map((g, i) => (
              <div
                key={i}
                className="p-5 rounded-xl glass-panel border border-slate-800 space-y-3"
              >
                <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {g.attribute}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {g.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-xs">
                    <span className="font-semibold text-emerald-400 block mb-0.5">Do:</span>
                    <p className="text-emerald-200/90">&ldquo;{g.doExample}&rdquo;</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/30 text-xs">
                    <span className="font-semibold text-rose-400 block mb-0.5">Don&apos;t:</span>
                    <p className="text-rose-200/90">&ldquo;{g.dontExample}&rdquo;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
