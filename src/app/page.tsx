'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { 
  Plus, 
  Building2, 
  ArrowRight, 
  BookOpen, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  X,
  Search,
  Check,
  Trash2
} from 'lucide-react';
import type { BrandProfile } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { brands, selectedBrandId, selectBrand, createBrand, deleteBrand, restorePresetBrand, drafts } = useApp();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<BrandProfile | null>(null);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasNuvia = brands.some(b => b.name.toLowerCase().includes('nuvia') || b.id === 'brand-nuvia-skin');

  const handleSelectBrand = (brandId: string) => {
    selectBrand(brandId);
    router.push('/dashboard');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBrandName.trim();
    if (!trimmed) {
      setValidationError('Brand name is required.');
      return;
    }

    const created = createBrand({
      name: trimmed,
      description: newBrandDesc.trim() || undefined
    });

    setNewBrandName('');
    setNewBrandDesc('');
    setValidationError(null);
    setIsModalOpen(false);
    
    // Open new brand's workspace directly
    selectBrand(created.id);
    router.push('/dashboard');
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-10 py-4 max-w-6xl mx-auto">
      {/* 1. Hero & Value Proposition */}
      <div className="text-center space-y-4 pt-6 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414] border border-[#262626] text-xs text-[#a3a3a3]">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Brand Sutra Enterprise Content Pre-Check</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Consistent brands. Confident content.
          </h1>
          <p className="text-sm sm:text-base text-[#8a8a8a] max-w-2xl mx-auto leading-relaxed">
            Audit marketing copy against verified brand guidelines, prohibited terminology, 
            and official lab certifications before publication. Select a brand workspace or configure a new brand profile.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            id="btn-create-brand"
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black text-xs sm:text-sm font-semibold hover:bg-[#e5e5e5] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Create New Brand</span>
          </button>

          {!hasNuvia && (
            <button
              id="btn-restore-nuvia-hero"
              type="button"
              onClick={() => {
                restorePresetBrand('nuvia');
                router.push('/dashboard');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#141414] border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-medium hover:bg-emerald-950/30 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Nuvia Skin Preset</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Brand Workspaces Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262626]">
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Brand Workspaces ({brands.length})
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              Each brand workspace maintains strictly isolated rules, trusted facts, drafts, and review histories.
            </p>
          </div>

          {brands.length > 3 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brands..."
                className="w-full bg-[#121212] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#525252] focus:border-[#525252] outline-none"
              />
            </div>
          )}
        </div>

        {/* Brand Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((b) => {
            const isSelected = b.id === selectedBrandId;
            const totalRules = (b.prohibitedTerms?.length || 0) + (b.trustedFacts?.length || 0);
            const totalTone = b.toneGuidelines?.length || 0;
            const brandDraftsCount = drafts.filter(d => d.brandId === b.id).length;

            return (
              <div
                key={b.id}
                id={`brand-card-${b.id}`}
                onClick={() => handleSelectBrand(b.id)}
                className={`group relative rounded-xl p-5 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#141414] border-[#444444] shadow-md'
                    : 'bg-[#111111] border-[#222222] hover:border-[#383838] hover:bg-[#161616]'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar with Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-white font-bold text-sm">
                      {b.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Active Workspace
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#737373] group-hover:text-white transition-colors flex items-center gap-1">
                          Select <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      )}

                      {brands.length > 1 && (
                        <button
                          id={`btn-delete-brand-${b.id}`}
                          type="button"
                          title={`Remove brand workspace "${b.name}"`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setBrandToDelete(b);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#737373] hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Brand Name & Description */}
                  <div>
                    <h3 className="text-base font-semibold text-white tracking-tight group-hover:text-white transition-colors">
                      {b.name}
                    </h3>
                    <p className="text-xs text-[#8a8a8a] mt-1 line-clamp-2 leading-relaxed">
                      {b.description || b.tagline || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Metadata Footer */}
                <div className="pt-4 mt-4 border-t border-[#1c1c1c] flex items-center justify-between text-[11px] text-[#737373]">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#555555]" />
                    <span>{totalRules} rules & facts</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#555555]" />
                    <span>{brandDraftsCount} draft{brandDraftsCount === 1 ? '' : 's'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Create Brand Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="w-full max-w-md bg-[#0f0f0f] border border-[#262626] rounded-xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div>
                <h3 className="text-base font-semibold text-white">Create New Brand</h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Set up a clean brand profile with its own isolated rules and drafts.
                </p>
              </div>
              <button
                type="button"
                id="btn-close-modal"
                onClick={() => {
                  setIsModalOpen(false);
                  setValidationError(null);
                }}
                className="text-[#737373] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preset Option */}
            {!hasNuvia && (
              <div className="p-3 rounded-lg bg-[#141414] border border-emerald-500/20 text-xs flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Preset: Nuvia Skin</span>
                  </div>
                  <p className="text-[11px] text-[#8a8a8a] mt-0.5">
                    Clinical skincare workspace with 14 regulatory rules & facts.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-modal-add-nuvia"
                  onClick={() => {
                    restorePresetBrand('nuvia');
                    setIsModalOpen(false);
                    router.push('/dashboard');
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  Add Preset
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {validationError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
                  {validationError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="input-brand-name" className="block text-xs font-medium text-white">
                  Brand Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-brand-name"
                  type="text"
                  required
                  autoFocus
                  value={newBrandName}
                  onChange={(e) => {
                    setNewBrandName(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g., Nova Acoustics"
                  className="w-full bg-[#171717] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#525252] focus:border-white outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="input-brand-description" className="block text-xs font-medium text-[#d4d4d4]">
                  Short Description <span className="text-[#737373] font-normal">(optional)</span>
                </label>
                <textarea
                  id="input-brand-description"
                  rows={3}
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                  placeholder="Brief summary of the brand voice, core product line, or mission..."
                  className="w-full bg-[#171717] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#525252] focus:border-white outline-none resize-none transition-colors"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] text-[11px] text-[#8a8a8a] space-y-1">
                <div className="font-medium text-[#d4d4d4] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Isolated Brand Profile</span>
                </div>
                <p>
                  This new brand starts with a blank knowledge base. You can upload brand documents, policies, or product specs in Rules & Facts after creation.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  id="btn-cancel-create"
                  onClick={() => {
                    setIsModalOpen(false);
                    setValidationError(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#171717] hover:bg-[#222222] text-xs font-medium text-[#a3a3a3] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-brand"
                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#e5e5e5] text-xs font-semibold text-black transition-colors"
                >
                  Create Brand Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Remove Brand Confirmation Modal */}
      {brandToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121212] border border-[#2a2a2a] rounded-xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-950/50 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Remove Brand Workspace?</h3>
                <p className="text-xs text-[#8a8a8a] mt-1 leading-relaxed">
                  This will permanently remove <strong className="text-white">{brandToDelete.name}</strong> and delete all its associated rules, verified facts, and draft copy.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222]">
              <button
                type="button"
                onClick={() => setBrandToDelete(null)}
                className="px-3 py-1.5 text-xs text-[#d4d4d4] bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-brand"
                type="button"
                onClick={() => {
                  deleteBrand(brandToDelete.id);
                  setBrandToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors shadow-sm"
              >
                Remove Brand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
