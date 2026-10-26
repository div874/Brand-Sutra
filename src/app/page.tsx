'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { StatusBadge } from '@/components/StatusBadge';
import { FindingCard } from '@/components/FindingCard';
import { Send, CheckCircle2, RotateCcw, Sparkles, Database } from 'lucide-react';
import { analyzeDraftContent } from '@/lib/retrieval-engine';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function Home() {
  const {
    brand,
    drafts,
    currentDraftId,
    currentDraft,
    setCurrentDraftId,
    updateDraftContent,
    updateDraftStatus,
    applyFindingFix,
    ignoreFinding,
    setDraftFindings,
    userRole,
    comments,
    addComment,
    approvedEdits,
    activeFindingId,
    setActiveFindingId,
  } = useApp();

  const [commentText, setCommentText] = useState('');

  if (!currentDraft) {
    return (
      <div className="text-center py-20 text-[#737373] text-sm">
        No draft loaded. Click Reset in the top right to load the default template.
      </div>
    );
  }

  const activeFindings = currentDraft.findings.filter(f => f.status === 'Pending');
  const draftComments = comments.filter(c => c.draftId === currentDraft.id);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(currentDraft.id, commentText.trim());
    setCommentText('');
  };

  return (
    <div className="space-y-6">
      {/* Basic Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              {currentDraft.title}
            </h1>
            <StatusBadge status={currentDraft.reviewStatus} />
          </div>
          <p className="text-xs text-[#8a8a8a] mt-1">
            Author: {currentDraft.creatorName} • Channel: {currentDraft.channel}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Draft switch */}
          <select
            value={currentDraftId}
            onChange={(e) => setCurrentDraftId(e.target.value)}
            className="text-xs bg-[#121212] border border-[#262626] rounded px-2.5 py-1.5 text-[#ededed] focus:border-[#525252]"
          >
            {drafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.reviewStatus})
              </option>
            ))}
          </select>

          {/* Role-based status action */}
          {userRole === 'creator' && currentDraft.reviewStatus !== 'In Review' && currentDraft.reviewStatus !== 'Approved' && (
            <button
              id="btn-submit-review"
              type="button"
              onClick={() => updateDraftStatus(currentDraft.id, 'In Review')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors"
            >
              <Send className="w-3 h-3" />
              Submit
            </button>
          )}

          {userRole === 'reviewer' && (
            <div className="flex items-center gap-1.5">
              <button
                id="btn-request-changes"
                type="button"
                onClick={() => updateDraftStatus(currentDraft.id, 'Changes Requested')}
                className="px-2.5 py-1.5 text-xs font-medium text-[#d4d4d4] bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] rounded transition-colors"
              >
                Request Changes
              </button>
              <button
                id="btn-approve"
                type="button"
                onClick={() => updateDraftStatus(currentDraft.id, 'Approved')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                Approve
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Text Editor & Notes (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-lg bg-[#121212] border border-[#262626] p-4">
            <div className="flex items-center justify-between mb-2 text-xs text-[#8a8a8a]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Draft Content</span>
                <span>•</span>
                <span>{currentDraft.content.split(/\s+/).filter(Boolean).length} words</span>
              </div>

              <button
                id="btn-recheck-draft"
                type="button"
                onClick={() => {
                  const freshFindings = analyzeDraftContent(currentDraft.id, currentDraft.content, brand, approvedEdits);
                  setDraftFindings(currentDraft.id, freshFindings);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#ededed] bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] rounded transition-colors"
                title="Evaluate draft against official evidence and retrieve learned precedents"
              >
                <Sparkles className="w-3 h-3 text-[#a3a3a3]" />
                <span>Re-check Rules & Facts</span>
              </button>
            </div>

            <textarea
              id="draft-content-textarea"
              value={currentDraft.content}
              onChange={(e) => updateDraftContent(currentDraft.id, e.target.value)}
              rows={11}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded p-3 text-sm leading-relaxed text-[#ededed] placeholder:text-[#525252] focus:border-[#525252] font-mono resize-y"
              placeholder="Paste or write your draft here..."
            />
          </div>

          {/* Simple Review Notes */}
          <div className="rounded-lg bg-[#121212] border border-[#262626] p-4">
            <div className="text-xs font-medium text-white mb-3">
              Review Notes & Feedback ({draftComments.length})
            </div>

            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {draftComments.length === 0 ? (
                <div className="text-xs text-[#737373] py-2">
                  No review notes yet.
                </div>
              ) : (
                draftComments.map((comm) => (
                  <div key={comm.id} className="text-xs p-2 rounded bg-[#0a0a0a] border border-[#262626]">
                    <div className="flex items-center justify-between text-[#8a8a8a] mb-1 text-[11px]">
                      <span>{comm.authorName}</span>
                      <span>{new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[#d4d4d4]">{comm.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a brief note..."
                className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded px-3 py-1.5 text-xs text-[#ededed] placeholder:text-[#525252] focus:border-[#525252]"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] disabled:opacity-40 rounded transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right: Findings Stack (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
              Detected Issues
            </h2>
            <span className="text-xs text-[#737373]">
              {activeFindings.length} open
            </span>
          </div>

          {activeFindings.length === 0 ? (
            <div className="rounded-lg bg-[#121212] border border-[#262626] p-6 text-center text-xs text-[#8a8a8a]">
              No open brand issues. Content is clean.
            </div>
          ) : (
            activeFindings.map((finding) => {
              const matchingPrecedent = approvedEdits.find(e => 
                e.originalText.toLowerCase().trim() === finding.quote.toLowerCase().trim() ||
                e.findingId === finding.id ||
                finding.quote.toLowerCase().includes(e.originalText.toLowerCase()) ||
                e.originalText.toLowerCase().includes(finding.quote.toLowerCase())
              );

              return (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  isActive={activeFindingId === finding.id}
                  historicalPrecedent={matchingPrecedent}
                  onSelect={() => setActiveFindingId(finding.id)}
                  onAccept={() => applyFindingFix(currentDraft.id, finding.id)}
                  onIgnore={() => ignoreFinding(currentDraft.id, finding.id)}
                />
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
