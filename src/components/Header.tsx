'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/store';
import { 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  History, 
  RotateCcw, 
  User, 
  CheckCircle2, 
  Feather
} from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { brand, userRole, setUserRole, resetToDefaults } = useApp();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Sutra Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Feather className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  Brand Sutra
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Round 1 • Plan
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Inkloom AI</p>
            </div>
          </Link>

          {/* Active Brand Badge */}
          <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800 text-xs">
            <span className="text-slate-400">Active Brand:</span>
            <span className="font-semibold text-slate-200 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
              {brand.name}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              pathname === '/'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Editor & Checks</span>
          </Link>

          <Link
            href="/rules"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              pathname === '/rules'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Brand Rules</span>
          </Link>

          <Link
            href="/audit"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              pathname === '/audit'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Audit Log</span>
          </Link>
        </nav>

        {/* Right Section: Role Switcher & Controls */}
        <div className="flex items-center gap-2.5">
          {/* Role Switcher Pill */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setUserRole('creator')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                userRole === 'creator'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Creator mode: edit draft and accept suggestions"
            >
              <User className="w-3.5 h-3.5" />
              <span>Creator</span>
            </button>
            <button
              type="button"
              onClick={() => setUserRole('reviewer')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                userRole === 'reviewer'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Reviewer mode: approve or request changes with comments"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Reviewer</span>
            </button>
          </div>

          {/* Reset Demo button */}
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset to initial demo draft and brand rules?')) {
                resetToDefaults();
              }
            }}
            title="Reset demo data"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
