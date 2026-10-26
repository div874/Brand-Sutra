'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/store';
import { RotateCcw, Building2 } from 'lucide-react';
import { SupabaseModal } from './SupabaseModal';

export function Header() {
  const pathname = usePathname();
  const { brand, userRole, setUserRole, resetToDefaults, supabaseStatus } = useApp();
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  return (
    <header className="border-b border-[#262626] bg-[#0c0c0c]">
      <div className="max-w-[1440px] xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Brand Title & Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white text-black font-bold text-xs flex items-center justify-center">
              B
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm text-white tracking-tight">
                Brand Sutra
              </span>
              <span className="text-xs text-[#737373] hidden sm:inline">Inkloom AI</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-[#262626] text-white'
                  : 'text-[#8a8a8a] hover:text-white hover:bg-[#171717]'
              }`}
            >
              Brands
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-[#262626] text-white'
                  : 'text-[#8a8a8a] hover:text-white hover:bg-[#171717]'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/rules"
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                pathname === '/rules'
                  ? 'bg-[#262626] text-white'
                  : 'text-[#8a8a8a] hover:text-white hover:bg-[#171717]'
              }`}
            >
              Rules & Facts
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Active Brand Switcher Pill */}
          <Link
            href="/"
            id="header-brand-pill"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-[#171717] hover:bg-[#222222] border border-[#2a2a2a] transition-colors"
            title="Active Brand Workspace. Click to switch brand."
          >
            <Building2 className="w-3 h-3 text-[#737373]" />
            <span className="font-medium text-white max-w-[120px] truncate">{brand.name}</span>
            <span className="text-[10px] text-[#737373] font-mono">⇄</span>
          </Link>

          {/* Supabase Status Pill */}
          <button
            id="btn-open-supabase-modal"
            type="button"
            onClick={() => setIsSupabaseModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] transition-colors"
            title="Supabase Cloud Connection & Schema Deployment"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                supabaseStatus.tablesReady
                  ? 'bg-emerald-400'
                  : supabaseStatus.connected
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-[#a3a3a3] text-[11px] font-mono">
              {supabaseStatus.tablesReady ? 'Supabase: Synced' : supabaseStatus.connected ? 'Supabase: Setup' : 'Supabase'}
            </span>
          </button>

          {/* Simple Role Toggle */}
          <div className="flex items-center bg-[#171717] border border-[#262626] rounded p-0.5 text-xs">
            <button
              id="btn-role-creator"
              type="button"
              onClick={() => setUserRole('creator')}
              className={`px-2.5 py-1 rounded transition-colors ${
                userRole === 'creator'
                  ? 'bg-[#ededed] text-black font-medium'
                  : 'text-[#8a8a8a] hover:text-white'
              }`}
            >
              Creator
            </button>
            <button
              id="btn-role-reviewer"
              type="button"
              onClick={() => setUserRole('reviewer')}
              className={`px-2.5 py-1 rounded transition-colors ${
                userRole === 'reviewer'
                  ? 'bg-[#ededed] text-black font-medium'
                  : 'text-[#8a8a8a] hover:text-white'
              }`}
            >
              Reviewer
            </button>
          </div>

          {/* Reset Button */}
          <button
            id="btn-reset-defaults"
            type="button"
            onClick={() => resetToDefaults()}
            title="Reset to default template"
            className="p-1.5 text-[#737373] hover:text-white hover:bg-[#1f1f1f] rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </header>
  );
}
