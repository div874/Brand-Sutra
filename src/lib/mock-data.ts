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
  }
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
