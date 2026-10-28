import type { BrandProfile, Draft, AuditLogEntry, DraftComment, ApprovedEdit } from '@/types';

export const INITIAL_BRAND_PROFILE: BrandProfile = {
  id: 'brand-ecosutra',
  name: 'EchoStream',
  tagline: 'Consistent brands. Confident content.',
  description: 'A direct-to-consumer sustainable electronics brand creating premium, repairable audio gear and accessories.',
  voiceSummary: 'Honest, grounded, knowledgeable, and inviting. We never exaggerate environmental claims, we cite exact certifications, and we respect our customer’s intelligence.',
  toneGuidelines: [
    {
      attribute: 'Transparent & Grounded',
      description: 'State exact numbers and material origins. Do not hide behind greenwashing or vague claims.',
      doExample: 'Our casing is crafted with 80% certified recycled ocean-bound plastic.',
      dontExample: 'Our miraculous green headphones save the entire planet!'
    },
    {
      attribute: 'Empowering, not Preachy',
      description: 'Guide customers toward durable choices without guilt-tripping or moral superiority.',
      doExample: 'Modular components make battery replacements seamless in under 5 minutes.',
      dontExample: 'If you still buy disposable tech, you are contributing to global destruction.'
    },
    {
      attribute: 'Crisp & Action-Oriented',
      description: 'Use active verbs and plain language. Avoid Silicon Valley jargon or buzzword stuffing.',
      doExample: 'Syncs automatically across three Bluetooth devices with zero delay.',
      dontExample: 'Leverages paradigm-shifting synergistic cloud-native multi-device mesh protocols.'
    }
  ],
  prohibitedTerms: [
    {
      id: 'term-1',
      term: 'entirely recycled',
      reason: 'Inaccurate. Our current composite is 80% recycled post-consumer plastic and 20% virgin structural resin.',
      suggestedAlternative: '80% certified recycled plastic',
      severity: 'high'
    },
    {
      id: 'term-2',
      term: 'eco-friendly',
      reason: 'Vague greenwashing phrase banned by consumer protection guidelines. Specify the verified impact instead.',
      suggestedAlternative: 'sustainably sourced / recycled',
      severity: 'medium'
    },
    {
      id: 'term-3',
      term: 'revolutionary',
      reason: 'Overused marketing hyperbole that conflicts with our grounded, honest brand tone.',
      suggestedAlternative: 'thoughtfully redesigned / modern',
      severity: 'low'
    },
    {
      id: 'term-4',
      term: 'cheapest',
      reason: 'Diminishes perceived build quality and longevity. Focus on value or durability.',
      suggestedAlternative: 'most accessible / high-value',
      severity: 'medium'
    },
    {
      id: 'term-5',
      term: 'guaranteed unbreakable',
      reason: 'Unsubstantiated legal liability. We offer repairability, not indestructible physics.',
      suggestedAlternative: 'tested for drop resilience up to 2 meters',
      severity: 'high'
    },
    {
      id: 'term-6',
      term: 'perfect sound',
      reason: 'Subjective acoustic perfection claim. Describe verified acoustic response or TrueNeutral Sound Stage instead.',
      suggestedAlternative: 'TrueNeutral balanced audio',
      severity: 'medium'
    },
    {
      id: 'term-7',
      term: 'unbeatable battery life',
      reason: 'Unsubstantiated comparative claim prohibited under advertising standards. Cite lab-tested battery duration.',
      suggestedAlternative: 'up to 48 hours of tested battery life',
      severity: 'high'
    },
    {
      id: 'term-8',
      term: 'risk-free listening',
      reason: 'Unsubstantiated legal liability guarantee. Cite standard return policy instead.',
      suggestedAlternative: 'with a 30-day trial period',
      severity: 'medium'
    },
    {
      id: 'term-9',
      term: 'completely waterproof',
      reason: 'Contradicts official lab benchmark: Device is certified IPX4 splash-resistant, not completely waterproof.',
      suggestedAlternative: 'IPX4 splash-resistant',
      severity: 'high'
    },
    {
      id: 'term-10',
      term: '100% sustainable materials',
      reason: 'Overstates verified material composite. Certified as 80% recycled plastic and 20% virgin structural resin.',
      suggestedAlternative: '80% certified recycled plastic',
      severity: 'high'
    },
    {
      id: 'term-11',
      term: "world's best",
      reason: 'Absolute superlative lacking audited third-party market benchmarking.',
      suggestedAlternative: 'premium',
      severity: 'medium'
    }
  ],
  approvedTerms: [
    {
      id: 'appr-1',
      term: '80% post-consumer recycled plastic',
      preferredUsage: 'Use when describing the primary earcup and headband outer housing.',
      category: 'Materials'
    },
    {
      id: 'appr-2',
      term: 'GRS Certified (Global Recycled Standard)',
      preferredUsage: 'Cite whenever discussing polymer sourcing and supply chain validation.',
      category: 'Certifications'
    },
    {
      id: 'appr-3',
      term: 'Modular Architecture',
      preferredUsage: 'Refers to the swappable headband, ear cushions, and replaceable battery.',
      category: 'Product Features'
    },
    {
      id: 'appr-4',
      term: 'TrueNeutral Sound Stage',
      preferredUsage: 'Our acoustic tuning profile that delivers flat response without artificial bass boost.',
      category: 'Audio'
    }
  ],
  trustedFacts: [
    {
      id: 'fact-1',
      topic: 'Recycled Materials',
      claimOrStat: 'Outer casing is made with 80% post-consumer recycled plastic certified under GRS-2025-081.',
      source: 'Global Recycled Standard Audit Certificate #GRS-2025-081',
      sourceUrl: 'https://standards.ecosutra.internal/grs-2025',
      verifiedDate: '2025-01-15'
    },
    {
      id: 'fact-2',
      topic: 'Packaging',
      claimOrStat: 'Packaging is 100% plastic-free, made from FSC-certified recycled kraft cardboard and soy inks.',
      source: 'Packaging Compliance Report Q4 2024',
      verifiedDate: '2024-11-20'
    },
    {
      id: 'fact-3',
      topic: 'Battery Life',
      claimOrStat: 'Battery provides up to 48 hours of playback with ANC off, and 36 hours with ANC on.',
      source: 'Hardware Lab Test Protocol v2.4 (IEC 62368-1 benchmark)',
      verifiedDate: '2025-02-10'
    },
    {
      id: 'fact-4',
      topic: 'Warranty & Repair',
      claimOrStat: '5-year spare parts availability guarantee with all tools included in repair kits.',
      source: 'Right to Repair Commitment Policy Document',
      verifiedDate: '2024-09-01'
    }
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-15T12:00:00.000Z'
};

export const NUVIA_BRAND_PROFILE: BrandProfile = {
  id: 'brand-nuvia-skin',
  name: 'Nuvia Skin',
  tagline: 'Clinically Transparent Skincare.',
  description: 'A clinical dermatological skincare brand dedicated to transparent ingredient concentrations, ISO-certified clinical trials, and responsible claim compliance.',
  voiceSummary: 'Dermatological Authority — Grounded, scientific, and empathetic. We avoid sensationalism, unverified cosmetic hyperbole, and medical disease treatment claims.',
  toneGuidelines: [
    {
      attribute: 'Dermatological Authority',
      description: 'State exact active ingredient concentrations and verified clinical metrics. Avoid sensationalism or elixir rhetoric.',
      doExample: 'Formulated with 5% niacinamide and 2% hyaluronic acid.',
      dontExample: 'A magical elixir that erases all your skin flaws overnight.'
    },
    {
      attribute: 'Plain Language & Respectful',
      description: 'Use clear, accessible language without artificial urgency, fear-mongering, or pressure tactics.',
      doExample: 'Designed to fit into your daily skincare routine.',
      dontExample: 'Buy now before your wrinkles become permanent.'
    },
    {
      attribute: 'Measured Claims',
      description: 'Use descriptive, observable efficacy statements rather than absolute superlatives or permanent guarantees.',
      doExample: 'Visibly smooths the appearance of fine lines and helps clarify blemish-prone skin.',
      dontExample: "The world's best skincare miracle cure."
    }
  ],
  prohibitedTerms: [
    {
      id: 'nuvia-term-1',
      term: "the world's best skincare",
      reason: 'Absolute superlatives cannot be clinically substantiated and violate advertising fair claim standards.',
      suggestedAlternative: 'skincare designed with simplicity in mind',
      severity: 'high'
    },
    {
      id: 'nuvia-term-2',
      term: 'miracle cure',
      reason: 'Cosmetic products cannot claim miraculous or medicinal curative properties.',
      suggestedAlternative: 'targeted treatment',
      severity: 'high'
    },
    {
      id: 'nuvia-term-3',
      term: 'permanent wrinkle removal',
      reason: 'Cosmetics cannot claim permanent anatomical or structural modification.',
      suggestedAlternative: 'visibly smooths the appearance of fine lines',
      severity: 'high'
    },
    {
      id: 'nuvia-term-4',
      term: '100% organic',
      reason: 'Overbroad organic claim requires third-party organic certification attribution.',
      suggestedAlternative: 'crafted with certified organic botanicals',
      severity: 'medium'
    },
    {
      id: 'nuvia-term-5',
      term: 'instant face lift',
      reason: 'Comparison to invasive surgical medical procedures is prohibited by cosmetic labeling regulations.',
      suggestedAlternative: 'firming and revitalizing treatment',
      severity: 'high'
    },
    {
      id: 'nuvia-term-6',
      term: 'treats acne',
      reason: 'Disease treatment claim classified as an unapproved drug claim under cosmetic regulations.',
      suggestedAlternative: 'helps clarify blemish-prone skin',
      severity: 'high'
    },
    {
      id: 'nuvia-term-7',
      term: 'erases scars',
      reason: 'Cosmetic formulas cannot claim permanent scar tissue elimination.',
      suggestedAlternative: 'visibly improves skin texture and tone',
      severity: 'high'
    },
    {
      id: 'nuvia-term-8',
      term: 'cure eczema',
      reason: 'Eczema is a medical dermatological condition requiring pharmaceutical treatment claims.',
      suggestedAlternative: 'soothes dry, sensitive skin',
      severity: 'high'
    },
    {
      id: 'nuvia-term-9',
      term: 'guaranteed acne-free skin',
      reason: 'Unlawful outcome guarantee lacking clinical individual trial variance disclaimer.',
      suggestedAlternative: 'designed to fit into your daily skincare routine',
      severity: 'high'
    },
    {
      id: 'nuvia-term-10',
      term: '100% safe for everyone',
      reason: 'Absolute safety claims violate allergen disclosure and patch test standards.',
      suggestedAlternative: 'review the ingredient list to decide whether the product suits your needs',
      severity: 'high'
    },
    {
      id: 'nuvia-term-11',
      term: 'instantly removes all wrinkles',
      reason: 'Overstated immediate structural transformation claim prohibited under FTC/FDA rules.',
      suggestedAlternative: 'learn more about the product and its intended use',
      severity: 'high'
    },
    {
      id: 'nuvia-term-12',
      term: 'chemical-free',
      reason: 'Scientifically false and misleading advertising claim; all cosmetic matter has chemical composition.',
      suggestedAlternative: 'see the ingredient list',
      severity: 'medium'
    },
    {
      id: 'nuvia-term-13',
      term: 'flawless skin forever',
      reason: 'Unrealistic, perpetual perfection claim contrary to our grounded brand tone.',
      suggestedAlternative: 'build a skincare routine that works for you',
      severity: 'medium'
    },
    {
      id: 'nuvia-term-14',
      term: 'clinically proven',
      reason: 'Requires citing the specific clinical study protocol ID (e.g., Protocol NUV-2025-01).',
      suggestedAlternative: 'see clinical study protocol NUV-2025-01',
      severity: 'medium'
    }
  ],
  approvedTerms: [
    {
      id: 'nuvia-appr-1',
      term: 'Bio-Renewal Complex',
      preferredUsage: 'Permitted for the proprietary fermented peptide blend.',
      category: 'Proprietary Formulations'
    },
    {
      id: 'nuvia-appr-2',
      term: 'dermatologist-tested',
      preferredUsage: 'Permitted for all formulas tested under clinical Protocol NUV-2025.',
      category: 'Clinical Benchmarks'
    },
    {
      id: 'nuvia-appr-3',
      term: 'daily skincare routine',
      preferredUsage: 'Recommended phrasing for incorporating treatments into customer habits.',
      category: 'Usage Guidance'
    },
    {
      id: 'nuvia-appr-4',
      term: 'visibly smooths the appearance of fine lines',
      preferredUsage: 'Approved phrasing for peptide and hyaluronic serum efficacy.',
      category: 'Efficacy Claims'
    },
    {
      id: 'nuvia-appr-5',
      term: 'helps clarify blemish-prone skin',
      preferredUsage: 'Approved cosmetic phrasing for niacinamide clarifying formulas.',
      category: 'Efficacy Claims'
    },
    {
      id: 'nuvia-appr-6',
      term: 'individual experiences may vary',
      preferredUsage: 'Mandatory disclaimer for customer testimonials and study summaries.',
      category: 'Disclaimers'
    }
  ],
  trustedFacts: [
    {
      id: 'nuvia-fact-1',
      topic: 'Clinical Hydration Benchmark',
      claimOrStat: 'Clinical study protocol NUV-2025-01 demonstrated 94% improvement in skin hydration over 14 days under ISO 17025 certification.',
      source: 'ISO 17025 Clinical Study Protocol NUV-2025-01',
      sourceUrl: 'https://clinical.nuviaskin.com/nuv-2025-01',
      verifiedDate: '2025-02-14'
    },
    {
      id: 'nuvia-fact-2',
      topic: 'Packaging Certification',
      claimOrStat: 'Outer packaging is 100% post-consumer recycled paperboard certified under FSC standards.',
      source: 'Nuvia Skin Packaging Audit Certificate #FSC-2025-C88',
      sourceUrl: 'https://standards.nuviaskin.com/fsc-cert',
      verifiedDate: '2025-01-20'
    },
    {
      id: 'nuvia-fact-3',
      topic: 'Active Formulation Concentrations',
      claimOrStat: 'Formulated with 5% niacinamide and 2% multi-molecular hyaluronic acid.',
      source: 'Nuvia Skin Formulation Dossier v4.2',
      sourceUrl: 'https://clinical.nuviaskin.com/dossier-42',
      verifiedDate: '2025-01-10'
    }
  ],
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-02-20T12:00:00.000Z'
};

export const INITIAL_BRANDS: BrandProfile[] = [
  INITIAL_BRAND_PROFILE,
  NUVIA_BRAND_PROFILE
];

export const NUVIA_DRAFTS: Draft[] = [
  {
    id: 'draft-nuvia-1',
    brandId: 'brand-nuvia-skin',
    title: 'Nuvia Skin Launch Campaign',
    channel: 'Social & Paid Ad Campaign',
    targetAudience: 'Skincare consumers seeking dermatological solutions',
    creatorId: 'user-creator-1',
    creatorName: 'Aarav Sharma (Copywriter)',
    reviewerId: 'user-reviewer-1',
    reviewerName: 'Divyansh Chandra (Brand Lead)',
    reviewStatus: 'In Review',
    version: 1,
    createdAt: '2026-10-26T10:00:00.000Z',
    updatedAt: '2026-10-26T11:30:00.000Z',
    content: `Introducing the world's best skincare. Our miracle cure provides an instant face lift and permanently removes all wrinkles.

Guaranteed acne-free skin in 24 hours that erases scars and cures eczema. It is 100% organic and completely chemical-free. Formulated with our proprietary Bio-Renewal Complex, you will achieve flawless skin forever.`,
    findings: [
      {
        id: 'nuvia-find-1',
        draftId: 'draft-nuvia-1',
        issueType: 'Terminology',
        severity: 'high',
        quote: "the world's best skincare",
        startIndex: 12,
        endIndex: 38,
        explanation: 'Absolute superlatives cannot be clinically substantiated and violate advertising fair claim standards.',
        sourceLink: 'Nuvia Regulatory Rule #1',
        ruleId: 'nuvia-term-1',
        suggestedFix: 'skincare designed with simplicity in mind',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-26T11:30:00.000Z',
        evidence: [
          {
            id: 'cite-rule-nuvia-term-1',
            type: 'rule',
            title: 'Prohibited Term: "the world\'s best skincare"',
            sourceDoc: 'Nuvia Skin Brand Guidelines 2026',
            snippet: 'Never say "the world\'s best skincare" because absolute superlatives cannot be clinically substantiated.',
            relevanceScore: 0.99,
            reasoning: 'Matches banned absolute claim in brand guidelines.'
          }
        ]
      },
      {
        id: 'nuvia-find-2',
        draftId: 'draft-nuvia-1',
        issueType: 'Terminology',
        severity: 'high',
        quote: 'miracle cure',
        startIndex: 44,
        endIndex: 56,
        explanation: 'Cosmetic products cannot claim miraculous or medicinal curative properties.',
        sourceLink: 'Nuvia Regulatory Rule #2',
        ruleId: 'nuvia-term-2',
        suggestedFix: 'targeted treatment',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-26T11:30:00.000Z',
        evidence: [
          {
            id: 'cite-rule-nuvia-term-2',
            type: 'rule',
            title: 'Prohibited Term: "miracle cure"',
            sourceDoc: 'Nuvia Skin Brand Guidelines 2026',
            snippet: 'Do not use "miracle cure", use "targeted treatment" instead.',
            relevanceScore: 0.99,
            reasoning: 'Direct guideline prohibition on curative medical language.'
          }
        ]
      },
      {
        id: 'nuvia-find-3',
        draftId: 'draft-nuvia-1',
        issueType: 'Terminology',
        severity: 'high',
        quote: 'instant face lift',
        startIndex: 69,
        endIndex: 86,
        explanation: 'Comparison to invasive surgical medical procedures is prohibited by cosmetic labeling regulations.',
        sourceLink: 'Nuvia Regulatory Rule #5',
        ruleId: 'nuvia-term-5',
        suggestedFix: 'firming and revitalizing treatment',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-26T11:30:00.000Z',
        evidence: [
          {
            id: 'cite-rule-nuvia-term-5',
            type: 'rule',
            title: 'Prohibited Term: "instant face lift"',
            sourceDoc: 'Nuvia Skin Brand Guidelines 2026',
            snippet: 'Comparison to surgical medical procedures is prohibited.',
            relevanceScore: 0.98,
            reasoning: 'Prohibited claim comparing cosmetic serum to surgery.'
          }
        ]
      },
      {
        id: 'nuvia-find-4',
        draftId: 'draft-nuvia-1',
        issueType: 'Terminology',
        severity: 'high',
        quote: 'permanently removes all wrinkles',
        startIndex: 91,
        endIndex: 123,
        explanation: 'Cosmetics cannot claim permanent anatomical or structural modification.',
        sourceLink: 'Nuvia Regulatory Rule #3',
        ruleId: 'nuvia-term-3',
        suggestedFix: 'visibly smooths the appearance of fine lines',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-26T11:30:00.000Z',
        evidence: [
          {
            id: 'cite-rule-nuvia-term-3',
            type: 'rule',
            title: 'Prohibited Phrase: "permanent wrinkle removal"',
            sourceDoc: 'Nuvia Skin Brand Guidelines 2026',
            snippet: 'Reason: Cosmetic products cannot claim permanent structural alteration. Alternative: "visibly smooths the appearance of fine lines"',
            relevanceScore: 0.99,
            reasoning: 'Permanent alteration claims violate FDA cosmetics standards.'
          }
        ]
      },
      {
        id: 'nuvia-find-5',
        draftId: 'draft-nuvia-1',
        issueType: 'Terminology',
        severity: 'high',
        quote: 'cures eczema',
        startIndex: 185,
        endIndex: 197,
        explanation: 'Eczema is a medical dermatological disease. Cosmetics may not claim to cure or treat diseases.',
        sourceLink: 'Nuvia Medical Claims Policy',
        ruleId: 'nuvia-term-8',
        suggestedFix: 'soothes dry, sensitive skin',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-26T11:30:00.000Z',
        evidence: [
          {
            id: 'cite-rule-nuvia-term-8',
            type: 'rule',
            title: 'Prohibited Term: "cure eczema"',
            sourceDoc: 'Nuvia Skin Brand Guidelines 2026',
            snippet: 'Never say "cure eczema" -> Alternative: "soothes dry, sensitive skin"',
            relevanceScore: 0.99,
            reasoning: 'Disease claim classification.'
          }
        ]
      },
      {
        id: 'nuvia-find-6',
        draftId: 'draft-nuvia-1',
        issueType: 'Terminology',
        severity: 'medium',
        quote: '100% organic',
        startIndex: 205,
        endIndex: 217,
        explanation: 'Overbroad organic claim requires specific third-party organic certification attribution.',
        sourceLink: 'Nuvia Regulatory Rule #4',
        ruleId: 'nuvia-term-4',
        suggestedFix: 'crafted with certified organic botanicals',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-26T11:30:00.000Z',
        evidence: [
          {
            id: 'cite-rule-nuvia-term-4',
            type: 'rule',
            title: 'Banned Term: "100% organic"',
            sourceDoc: 'Nuvia Skin Brand Guidelines 2026',
            snippet: 'Banned Term: "100% organic" -> use "crafted with certified organic botanicals" instead.',
            relevanceScore: 0.98,
            reasoning: 'Cosmetics organic claim compliance.'
          }
        ]
      },
      {
        id: 'nuvia-find-7',
        draftId: 'draft-nuvia-1',
        issueType: 'Terminology',
        severity: 'medium',
        quote: 'chemical-free',
        startIndex: 233,
        endIndex: 246,
        explanation: 'Scientifically inaccurate claim; all cosmetic matter has chemical composition.',
        sourceLink: 'Nuvia Regulatory Rule #12',
        ruleId: 'nuvia-term-12',
        suggestedFix: 'see the ingredient list',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-26T11:30:00.000Z',
        evidence: [
          {
            id: 'cite-rule-nuvia-term-12',
            type: 'rule',
            title: 'Prohibited Term: "chemical-free"',
            sourceDoc: 'Nuvia Skin Rules and Alternatives v2',
            snippet: 'Prohibited: chemical-free -> Approved alternative: see the ingredient list',
            relevanceScore: 0.97,
            reasoning: 'Inaccurate scientific description.'
          }
        ]
      }
    ]
  },
  {
    id: 'draft-nuvia-2',
    brandId: 'brand-nuvia-skin',
    title: 'Nuvia Skin Verified Daily Routine',
    channel: 'Educational Newsletter & Website',
    targetAudience: 'Educated skincare customers',
    creatorId: 'user-creator-2',
    creatorName: 'Neha Patel (Product Marketing)',
    reviewerId: 'user-reviewer-1',
    reviewerName: 'Divyansh Chandra (Brand Lead)',
    reviewStatus: 'Approved',
    version: 2,
    createdAt: '2026-10-24T09:00:00.000Z',
    updatedAt: '2026-10-25T14:00:00.000Z',
    content: `Formulated with 5% niacinamide and 2% hyaluronic acid, this targeted treatment visibly smooths the appearance of fine lines and helps clarify blemish-prone skin.

Clinical study protocol NUV-2025-01 demonstrated 94% improvement in skin hydration over 14 days under ISO 17025 certification. Outer packaging is 100% post-consumer recycled paperboard certified under FSC standards.

Designed to fit comfortably into your daily skincare routine. Individual experiences may vary.`,
    findings: []
  }
];

export const INITIAL_DRAFTS: Draft[] = [
  {
    id: 'draft-demo-1',
    brandId: 'brand-ecosutra',
    title: 'EchoStream Pro Launch Announcement',
    channel: 'Product Launch Email & Blog',
    targetAudience: 'Tech enthusiasts & conscious consumers',
    creatorId: 'user-creator-1',
    creatorName: 'Aarav Sharma (Copywriter)',
    reviewerId: 'user-reviewer-1',
    reviewerName: 'Divyansh Chandra (Brand Lead)',
    reviewStatus: 'In Review',
    version: 1,
    createdAt: '2026-10-25T14:30:00.000Z',
    updatedAt: '2026-10-25T15:45:00.000Z',
    content: `Meet the EchoStream Pro: our revolutionary wireless headphones crafted for pure sound and sustainable living.

We are proud to share that the new housing is made entirely from recycled plastic, making it the most eco-friendly audio gear on the market today. With an unbeatable 75-hour continuous battery life and guaranteed unbreakable titanium headband hinge, you will never need another pair of headphones again.

Grab yours today and join the green revolution.`,
    findings: [
      {
        id: 'find-1',
        draftId: 'draft-demo-1',
        issueType: 'Fact Conflict',
        severity: 'high',
        quote: 'made entirely from recycled plastic',
        startIndex: 140,
        endIndex: 175,
        explanation: 'Conflict with verified brand fact: The product is 80% recycled post-consumer plastic and 20% virgin resin. Claiming 100% or "entirely" violates truth-in-advertising guidelines.',
        sourceLink: 'Global Recycled Standard Audit #GRS-2025-081',
        ruleId: 'fact-1',
        suggestedFix: 'crafted with 80% certified post-consumer recycled plastic',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-25T15:45:00.000Z',
        evidence: [
          {
            id: 'cite-fact-primary-fact-1',
            type: 'fact',
            title: 'Verified Fact: Recycled Materials',
            sourceDoc: 'Global Recycled Standard Audit Certificate #GRS-2025-081',
            pageNumber: 4,
            verifiedDate: '2025-01-15',
            snippet: 'Outer casing is made with 80% post-consumer recycled plastic certified under GRS-2025-081.',
            relevanceScore: 0.99,
            reasoning: 'Directly contradicts certified engineering composition benchmark.'
          },
          {
            id: 'cite-edit-edit-1',
            type: 'historical_edit',
            title: 'Approved Precedent by Divyansh Chandra',
            snippet: 'Original: "100% recycled plastic housing" → Approved: "80% certified post-consumer recycled plastic housing". Decision Rationale: Corrected exaggeration to match official GRS audit.',
            relevanceScore: 0.94,
            reasoning: 'Past reviewer precedent for similar claim wording.'
          }
        ]
      },
      {
        id: 'find-2',
        draftId: 'draft-demo-1',
        issueType: 'Terminology',
        severity: 'medium',
        quote: 'eco-friendly',
        startIndex: 197,
        endIndex: 209,
        explanation: '"eco-friendly" is a prohibited vague buzzword in our brand guidelines. It risks greenwashing claims under consumer protection regulations.',
        sourceLink: 'Brand Rule #2: Prohibited Terms',
        ruleId: 'term-2',
        suggestedFix: 'sustainably engineered',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-25T15:45:00.000Z',
        evidence: [
          {
            id: 'cite-rule-term-2',
            type: 'rule',
            title: 'Prohibited Term: "eco-friendly"',
            sourceDoc: 'Brand Voice & Terminology Guide',
            pageNumber: 3,
            snippet: 'Forbidden: "eco-friendly". Reason: Too vague and risks greenwashing accusations under EU green claims directive. Suggested replacement: "sustainably engineered".',
            relevanceScore: 0.98,
            reasoning: 'Matches brand prohibition against using "eco-friendly".'
          },
          {
            id: 'cite-edit-edit-2',
            type: 'historical_edit',
            title: 'Approved Precedent by Divyansh Chandra',
            snippet: 'Original: "eco-friendly materials" → Approved: "thoughtfully sourced recycled polymers". Decision Rationale: Replaced banned buzzword with verified material attribution.',
            relevanceScore: 0.92,
            reasoning: 'Past reviewer precedent for replacing buzzword.'
          }
        ]
      },
      {
        id: 'find-3',
        draftId: 'draft-demo-1',
        issueType: 'Fact Conflict',
        severity: 'high',
        quote: '75-hour continuous battery life',
        startIndex: 256,
        endIndex: 287,
        explanation: 'Official test benchmark confirms up to 48 hours playback (ANC off) and 36 hours (ANC on). 75 hours is unverified and contradicts lab measurements.',
        sourceLink: 'Hardware Lab Test Protocol v2.4',
        ruleId: 'fact-3',
        suggestedFix: 'up to 48 hours of tested battery life',
        status: 'Pending',
        detectedBy: 'ai',
        createdAt: '2026-10-25T15:45:00.000Z',
        evidence: [
          {
            id: 'cite-fact-primary-fact-3',
            type: 'fact',
            title: 'Verified Fact: Battery Life Benchmark',
            sourceDoc: 'Hardware Lab Test Protocol v2.4 (IEC 62368-1 benchmark)',
            pageNumber: 12,
            verifiedDate: '2025-02-10',
            snippet: 'Battery provides up to 48 hours of playback with ANC off, and 36 hours with ANC on.',
            relevanceScore: 0.99,
            reasoning: 'Directly contradicts certified hardware battery endurance test.'
          }
        ]
      },
      {
        id: 'find-4',
        draftId: 'draft-demo-1',
        issueType: 'Terminology',
        severity: 'high',
        quote: 'guaranteed unbreakable',
        startIndex: 296,
        endIndex: 318,
        explanation: 'Legal risk: "Guaranteed unbreakable" creates false warranty liability. Brand guidelines require stating drop-test specifications instead.',
        sourceLink: 'Legal & Brand Prohibited Term #5',
        ruleId: 'term-5',
        suggestedFix: 'tested for drop resilience up to 2 meters',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-25T15:45:00.000Z',
        evidence: [
          {
            id: 'cite-rule-term-5',
            type: 'rule',
            title: 'Prohibited Term: "guaranteed unbreakable"',
            sourceDoc: 'Brand Voice & Terminology Guide',
            pageNumber: 6,
            snippet: 'Forbidden: "guaranteed unbreakable". Reason: Unsubstantiated durability guarantee creates warranty liability. Must cite drop-test metrics. Suggested replacement: "tested for drop resilience up to 2 meters".',
            relevanceScore: 0.98,
            reasoning: 'Matches brand prohibition against durability absolutes.'
          }
        ]
      },
      {
        id: 'find-5',
        draftId: 'draft-demo-1',
        issueType: 'Tone',
        severity: 'low',
        quote: 'revolutionary',
        startIndex: 32,
        endIndex: 45,
        explanation: 'Overused buzzword that strays from our grounded, humble brand voice.',
        sourceLink: 'Tone Guideline: Crisp & Action-Oriented',
        ruleId: 'term-3',
        suggestedFix: 'thoughtfully redesigned',
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-25T15:45:00.000Z',
        evidence: [
          {
            id: 'cite-tone-term-3',
            type: 'rule',
            title: 'Tone Pillar: Grounded & Humble Voice',
            sourceDoc: 'Brand Editorial Principles',
            pageNumber: 2,
            snippet: 'Avoid: "revolutionary, miraculous, game-changing" | Do: "thoughtfully engineered, refined, purposeful"',
            relevanceScore: 0.94,
            reasoning: 'Breaches brand voice directive against hyperbolic hype.'
          }
        ]
      },
      {
        id: 'find-6',
        draftId: 'draft-demo-1',
        issueType: 'Unverified Claim',
        severity: 'medium',
        quote: 'most eco-friendly audio gear on the market today',
        startIndex: 187,
        endIndex: 235,
        explanation: 'Superlative claim ("most ... on the market") lacks comparative third-party market data. Requires legal substantiation before publishing.',
        sourceLink: 'Needs Independent Market Verification',
        suggestedFix: 'designed to minimize environmental footprint',
        status: 'Pending',
        detectedBy: 'ai',
        createdAt: '2026-10-25T15:45:00.000Z',
        evidence: [
          {
            id: 'cite-superlative-policy',
            type: 'rule',
            title: 'Advertising Substantiation Policy',
            sourceDoc: 'Legal & Regulatory Compliance Standards',
            pageNumber: 3,
            snippet: 'Absolute superlatives ("best in the world", "most eco-friendly") require independent third-party market audit certification prior to release.',
            relevanceScore: 0.96,
            reasoning: 'Regulatory requirement under Advertising governance standards.'
          }
        ]
      }
    ]
  },
  {
    id: 'draft-demo-2',
    brandId: 'brand-ecosutra',
    title: 'Q3 Modular Architecture & Repair Kit Update',
    channel: 'Customer Newsletter',
    targetAudience: 'Existing device owners & repair advocates',
    creatorId: 'user-creator-2',
    creatorName: 'Neha Patel (Product Marketing)',
    reviewerId: 'user-reviewer-1',
    reviewerName: 'Divyansh Chandra (Brand Lead)',
    reviewStatus: 'Approved',
    version: 2,
    createdAt: '2026-10-20T11:00:00.000Z',
    updatedAt: '2026-10-22T09:15:00.000Z',
    content: `Keeping your audio gear running shouldn't require sending it to a landfill.

With our Modular Architecture, every pair of EcoSutra headphones lets you swap out the headband, ear cushions, and internal cell in under 5 minutes. The casing is crafted from 80% post-consumer recycled plastic certified under GRS-2025-081, and our repair kits come backed by our 5-year spare parts availability guarantee.

Sound tailored to your life, built for the long haul.`,
    findings: []
  },
  ...NUVIA_DRAFTS
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-1',
    draftId: 'draft-demo-1',
    authorId: 'user-creator-1',
    authorName: 'Aarav Sharma',
    authorRole: 'creator',
    action: 'create_draft',
    summary: 'Created initial draft for EchoStream Pro Launch',
    timestamp: '2026-10-25T14:30:00.000Z'
  },
  {
    id: 'audit-2',
    draftId: 'draft-demo-1',
    authorId: 'system',
    authorName: 'Brand Sutra Engine',
    authorRole: 'manager',
    action: 'run_check',
    summary: 'Detected 6 potential issues (2 Fact Conflicts, 2 Terminology, 1 Tone, 1 Unverified Claim)',
    timestamp: '2026-10-25T15:45:00.000Z'
  }
];

export const INITIAL_COMMENTS: DraftComment[] = [
  {
    id: 'comm-1',
    draftId: 'draft-demo-1',
    authorId: 'user-reviewer-1',
    authorName: 'Divyansh Chandra',
    authorRole: 'reviewer',
    content: 'Aarav, please review the recycled plastic ratio and battery benchmark before we publish this to the newsletter list.',
    timestamp: '2026-10-25T15:50:00.000Z',
    resolved: false
  }
];

export const INITIAL_APPROVED_EDITS: ApprovedEdit[] = [
  {
    id: 'approved-edit-1',
    draftId: 'draft-demo-1',
    findingId: 'find-1',
    originalText: 'Made entirely from recycled plastic.',
    approvedChange: 'Made with 80% recycled plastic.',
    reason: 'The original claim overstated the verified recycled content.',
    relatedRuleOrFact: 'Global Recycled Standard Audit #GRS-2025-081',
    approvedBy: 'Divyansh Chandra (Brand Lead)',
    approvedByRole: 'reviewer',
    approvedAt: '2026-10-25T16:00:00.000Z',
    category: 'Fact Conflict',
    usageCount: 2
  }
];
