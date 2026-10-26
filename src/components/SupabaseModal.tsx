'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Database, Check, Copy, ExternalLink, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupabaseModal({ isOpen, onClose }: SupabaseModalProps) {
  const { supabaseStatus, refreshSupabaseStatus, syncToCloud, brand, drafts, approvedEdits } = useApp();
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const handleCopySchema = async () => {
    try {
      const res = await fetch('/api/schema');
      const data = await res.json();
      if (data.sql) {
        await navigator.clipboard.writeText(data.sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleVerifyAndSync = async () => {
    setIsVerifying(true);
    setSyncFeedback(null);
    try {
      const status = await refreshSupabaseStatus();
      if (!status.tablesReady) {
        setSyncFeedback({
          success: false,
          message: 'Supabase connected, but the 8 tables are not created yet. Run schema.sql in your Supabase SQL Editor first.'
        });
      } else {
        const syncResult = await syncToCloud();
        setSyncFeedback(syncResult);
      }
    } catch (err) {
      setSyncFeedback({
        success: false,
        message: err instanceof Error ? err.message : 'Verification failed'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-lg bg-[#121212] border border-[#262626] p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#1f1f1f] border border-[#333333] flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Supabase Cloud Storage & Auth
              </h2>
              <p className="text-xs text-[#8a8a8a]">
                Server-side persistence, multi-user rules, and audit logging
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="p-3 rounded bg-[#0a0a0a] border border-[#262626] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8a8a8a]">Connection Status:</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseStatus.tablesReady
                    ? 'bg-emerald-400'
                    : supabaseStatus.connected
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
              <span className="text-white">
                {supabaseStatus.tablesReady
                  ? 'Connected & Synchronized'
                  : supabaseStatus.connected
                  ? 'Connected • Tables Pending'
                  : 'Disconnected'}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8a8a8a]">Project URL:</span>
            <span className="font-mono text-white text-[11px] truncate max-w-[280px]">
              https://pnlucqeuhbcrcfytwues.supabase.co
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8a8a8a]">Publishable Key:</span>
            <span className="font-mono text-[#737373] text-[11px]">
              sb_publishable_OP50...2O0
            </span>
          </div>
        </div>

        {/* Database Tables Setup Guide */}
        {!supabaseStatus.tablesReady && (
          <div className="rounded border border-[#333333] bg-[#171717] p-3 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#a3a3a3] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-medium text-white">Database Schema Deployment Required</span>
                <p className="text-[#a3a3a3] leading-relaxed">
                  Your Supabase project is authenticated. To enable persistent cloud storage, run the schema script in your Supabase SQL Editor to create the 8 tables and RLS security policies.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#262626]">
              <button
                type="button"
                onClick={handleCopySchema}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'SQL Copied!' : 'Copy schema.sql'}</span>
              </button>

              <a
                href="https://supabase.com/dashboard/project/pnlucqeuhbcrcfytwues/sql/new"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#ededed] bg-[#222222] hover:bg-[#2e2e2e] border border-[#333333] rounded transition-colors"
              >
                <span>Open SQL Editor</span>
                <ExternalLink className="w-3 h-3 text-[#8a8a8a]" />
              </a>
            </div>
          </div>
        )}

        {/* Data Sync Summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2.5 rounded bg-[#0a0a0a] border border-[#262626]">
            <div className="text-base font-semibold text-white">
              {brand.trustedFacts.length + brand.prohibitedTerms.length + brand.approvedTerms.length + brand.toneGuidelines.length}
            </div>
            <div className="text-[11px] text-[#737373]">Active Rules & Facts</div>
          </div>
          <div className="p-2.5 rounded bg-[#0a0a0a] border border-[#262626]">
            <div className="text-base font-semibold text-white">{drafts.length}</div>
            <div className="text-[11px] text-[#737373]">Drafts Tracked</div>
          </div>
          <div className="p-2.5 rounded bg-[#0a0a0a] border border-[#262626]">
            <div className="text-base font-semibold text-white">{approvedEdits.length}</div>
            <div className="text-[11px] text-[#737373]">Learned Edits</div>
          </div>
        </div>

        {/* Sync Feedback Message */}
        {syncFeedback && (
          <div
            className={`p-3 rounded text-xs flex items-start gap-2 border ${
              syncFeedback.success
                ? 'bg-[#152417] border-[#225026] text-[#86efac]'
                : 'bg-[#241515] border-[#502222] text-[#fca5a5]'
            }`}
          >
            {syncFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>{syncFeedback.message}</div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
          <button
            type="button"
            onClick={handleCopySchema}
            className="flex items-center gap-1.5 text-xs text-[#8a8a8a] hover:text-white transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span>{copied ? 'Copied schema' : 'Copy schema.sql'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#a3a3a3] hover:text-white bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] rounded transition-colors"
            >
              Close
            </button>
            <button
              id="btn-verify-supabase"
              type="button"
              disabled={isVerifying}
              onClick={handleVerifyAndSync}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-[#d4d4d4] rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Checking...' : 'Verify Connection & Sync'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
