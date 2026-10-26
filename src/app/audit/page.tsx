'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { 
  History, 
  Check, 
  X, 
  MessageSquare, 
  FileEdit, 
  ArrowRight,
  ShieldCheck,
  User,
  Clock
} from 'lucide-react';
import { AuditLogEntry } from '@/types';

export default function AuditPage() {
  const { auditLogs, currentDraft } = useApp();

  const getActionBadge = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'apply_fix':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" /> Fix Applied
          </span>
        );
      case 'ignore_finding':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full">
            <X className="w-3 h-3" /> Fix Ignored
          </span>
        );
      case 'status_change':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3" /> Status Changed
          </span>
        );
      case 'add_comment':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full">
            <MessageSquare className="w-3 h-3" /> Comment Added
          </span>
        );
      case 'create_draft':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
            <FileEdit className="w-3 h-3" /> Draft Created
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full">
            System Event
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Accountability & Compliance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Review Decision Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            A chronological immutable record of human reviewer approvals, creator edits, and rule resolutions.
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          Total Recorded Actions: <span className="font-bold text-slate-200">{auditLogs.length}</span>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
          {auditLogs.map((log) => (
            <div key={log.id} className="relative group">
              {/* Timeline dot */}
              <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-indigo-500 group-hover:scale-125 transition-transform" />

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.action)}
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {log.authorName}
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                        {log.authorRole}
                      </span>
                    </span>
                  </div>

                  <span suppressHydrationWarning className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {log.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
