'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { StatusBadge } from '@/components/StatusBadge';
import { FindingCard } from '@/components/FindingCard';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  MessageSquare, 
  ArrowRight, 
  Info, 
  Check, 
  ShieldAlert,
  Clock,
  User,
  Plus
} from 'lucide-react';

export default function Home() {
  const {
    drafts,
    currentDraftId,
    currentDraft,
    setCurrentDraftId,
    updateDraftContent,
    updateDraftStatus,
    applyFindingFix,
    ignoreFinding,
    userRole,
    comments,
    addComment,
    activeFindingId,
    setActiveFindingId,
    brand
  } = useApp();

  const [newCommentText, setNewCommentText] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [showStatusModal, setShowStatusModal] = useState<string | null>(null);

  if (!currentDraft) {
    return (
      <div className="text-center py-20 text-slate-400">
        No draft loaded. Click Reset in the header to load demo content.
      </div>
    );
  }

  const activeFindings = currentDraft.findings.filter(f => f.status === 'Pending');
  const resolvedFindings = currentDraft.findings.filter(f => f.status !== 'Pending');

  const draftComments = comments.filter(c => c.draftId === currentDraft.id);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addComment(currentDraft.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleStatusChangeWithNote = (status: 'Approved' | 'Changes Requested') => {
    updateDraftStatus(currentDraft.id, status, reviewNote.trim() || undefined);
    setReviewNote('');
    setShowStatusModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Context Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl glass-panel">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-white tracking-tight">
                {currentDraft.title}
              </h1>
              <StatusBadge status={currentDraft.reviewStatus} />
              <span className="text-xs text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-slate-800">
                v{currentDraft.version}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Channel: <span className="text-slate-300 font-medium">{currentDraft.channel}</span> • Target: <span className="text-slate-300 font-medium">{currentDraft.targetAudience}</span> • Author: <span className="text-slate-300 font-medium">{currentDraft.creatorName}</span>
            </p>
          </div>
        </div>

        {/* Draft Selector & Workflow Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch Draft Dropdown */}
          <select
            value={currentDraftId}
            onChange={(e) => setCurrentDraftId(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500"
          >
            {drafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.reviewStatus})
              </option>
            ))}
          </select>

          {/* Workflow Action Buttons depending on role */}
          {userRole === 'creator' && currentDraft.reviewStatus !== 'In Review' && currentDraft.reviewStatus !== 'Approved' && (
            <button
              type="button"
              onClick={() => updateDraftStatus(currentDraft.id, 'In Review', 'Submitted draft for brand compliance review')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Submit for Review
            </button>
          )}

          {userRole === 'reviewer' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStatusModal('Changes Requested')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/60 rounded-lg transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Request Changes
              </button>
              <button
                type="button"
                onClick={() => setShowStatusModal('Approved')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm shadow-emerald-600/30 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve Draft
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reviewer Note Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl glass-panel p-6 border border-slate-700 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              {showStatusModal === 'Approved' ? 'Approve Draft' : 'Request Changes'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {showStatusModal === 'Approved'
                ? 'Confirm that this draft satisfies all brand guidelines and verified facts. Leave an optional approval note.'
                : 'Provide actionable feedback for the creator explaining why changes are requested.'}
            </p>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add your note or review comments..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusChangeWithNote(showStatusModal as 'Approved' | 'Changes Requested')}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all ${
                  showStatusModal === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm {showStatusModal}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Draft Editor & Right Findings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Draft Editor & Comments */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Editor Card */}
          <div className="rounded-2xl glass-panel p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Draft Content
                </span>
                <span className="text-[11px] text-slate-500">
                  ({currentDraft.content.length} characters • {currentDraft.content.split(/\s+/).filter(Boolean).length} words)
                </span>
              </div>

              {activeFindings.length > 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-full">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{activeFindings.length} open {activeFindings.length === 1 ? 'issue' : 'issues'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  <span>All brand checks passed</span>
                </div>
              )}
            </div>

            {/* Editable Content Area */}
            <div className="relative">
              <textarea
                value={currentDraft.content}
                onChange={(e) => updateDraftContent(currentDraft.id, e.target.value)}
                rows={12}
                className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-sm leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans resize-y"
                placeholder="Paste or write your marketing draft here..."
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Edits save automatically and re-evaluate findings.
              </span>
              <span className="text-[11px] text-slate-500">
                Last modified: {new Date(currentDraft.updatedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Inline Comments & Feedback Thread */}
          <div className="rounded-2xl glass-panel p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Reviewer Notes & Feedback
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {draftComments.length} {draftComments.length === 1 ? 'comment' : 'comments'}
              </span>
            </div>

            {/* Comments List */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
              {draftComments.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No review comments yet. Reviewers and creators can exchange notes here.
                </div>
              ) : (
                draftComments.map((comm) => (
                  <div
                    key={comm.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        {comm.authorName}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-5">
                      {comm.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={`Leave a note as ${userRole === 'reviewer' ? 'Brand Reviewer' : 'Creator'}...`}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-colors"
              >
                Send
              </button>
            </form>
          </div>

        </div>

        {/* Right Column (5 cols): Findings & Rule Citations */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Findings & Rule Matches
              </h2>
              <p className="text-xs text-slate-400">
                Actionable checks linked to {brand.name} guidelines
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              {activeFindings.length} active
            </span>
          </div>

          {/* Active Findings Stack */}
          <div className="space-y-3">
            {activeFindings.length === 0 ? (
              <div className="p-8 text-center rounded-2xl glass-panel border border-emerald-800/40 bg-emerald-950/10">
                <div className="w-12 h-12 rounded-full bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Ready for Review!
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  No active brand violations or fact conflicts detected in this draft.
                </p>
              </div>
            ) : (
              activeFindings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  isActive={activeFindingId === finding.id}
                  onSelect={() => setActiveFindingId(finding.id)}
                  onAccept={() => applyFindingFix(currentDraft.id, finding.id)}
                  onIgnore={() => ignoreFinding(currentDraft.id, finding.id)}
                />
              ))
            )}
          </div>

          {/* Resolved Findings Toggle / History */}
          {resolvedFindings.length > 0 && (
            <div className="pt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Resolved Issues ({resolvedFindings.length})</span>
              </div>
              <div className="space-y-2">
                {resolvedFindings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    isActive={false}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
