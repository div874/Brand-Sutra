import { 
  BrandProfile, 
  Finding, 
  ApprovedEdit, 
  IssueType, 
  IssueSeverity 
} from '@/types';

export interface EvaluatedFinding extends Finding {
  evidenceType: 'official_rule' | 'official_fact' | 'unverified_claim';
  historicalPrecedent?: ApprovedEdit;
}

/**
 * Contextual Retrieval Engine:
 * Analyzes draft content against Official Evidence (facts, rules) while keeping
 * historical approved edits strictly isolated as precedent context.
 */
export function analyzeDraftContent(
  draftId: string,
  content: string,
  brand: BrandProfile,
  approvedEdits: ApprovedEdit[]
): EvaluatedFinding[] {
  const findings: EvaluatedFinding[] = [];
  const lowerContent = content.toLowerCase();

  // 1. Check Prohibited Terms (Official Rules)
  brand.prohibitedTerms.forEach((rule) => {
    const termLower = rule.term.toLowerCase();
    const index = lowerContent.indexOf(termLower);

    if (index !== -1) {
      // Find matching historical precedent if available
      const matchingPrecedent = approvedEdits.find(e => 
        e.originalText.toLowerCase().includes(termLower) || 
        termLower.includes(e.originalText.toLowerCase())
      );

      findings.push({
        id: `find-rule-${rule.id}-${Date.now()}`,
        draftId,
        issueType: 'Terminology',
        severity: rule.severity || 'medium',
        quote: content.slice(index, index + rule.term.length),
        startIndex: index,
        endIndex: index + rule.term.length,
        explanation: rule.reason,
        sourceLink: `Official Brand Rule: ${rule.sourceDoc ? `${rule.sourceDoc} (p.${rule.pageNumber || 1})` : 'Terminology Guideline'}`,
        ruleId: rule.id,
        suggestedFix: rule.suggestedAlternative,
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: new Date().toISOString(),
        evidenceType: 'official_rule',
        historicalPrecedent: matchingPrecedent
      });
    }
  });

  // 2. Check Fact Conflicts against Trusted Facts (Official Evidence)
  // E.g., claiming 100% or "entirely" recycled plastic when verified fact is 80%
  const entirelyRecycledRegex = /(made entirely from recycled plastic|100%\s*recycled plastic|all recycled plastic)/i;
  const matchRecycled = content.match(entirelyRecycledRegex);
  if (matchRecycled && matchRecycled.index !== undefined) {
    const quote = matchRecycled[0];
    const factRef = brand.trustedFacts.find(f => f.topic.toLowerCase().includes('recycled') || f.claimOrStat.toLowerCase().includes('recycled')) || brand.trustedFacts[0];
    
    const matchingPrecedent = approvedEdits.find(e => 
      e.originalText.toLowerCase().includes('entirely') || 
      e.originalText.toLowerCase().includes('recycled')
    );

    findings.push({
      id: `find-fact-recycled-${Date.now()}`,
      draftId,
      issueType: 'Fact Conflict',
      severity: 'high',
      quote,
      startIndex: matchRecycled.index,
      endIndex: matchRecycled.index + quote.length,
      explanation: 'Overstates verified recycled content: Product is certified as 80% post-consumer recycled plastic and 20% virgin structural resin.',
      sourceLink: factRef ? `${factRef.source} (Verified ${factRef.verifiedDate})` : 'Official GRS Audit Certificate',
      ruleId: factRef?.id,
      suggestedFix: 'crafted with 80% certified post-consumer recycled plastic',
      status: 'Pending',
      detectedBy: 'deterministic',
      createdAt: new Date().toISOString(),
      evidenceType: 'official_fact',
      historicalPrecedent: matchingPrecedent
    });
  }

  // E.g., battery life exaggerated claims (e.g. 75 hours vs verified 48 hours)
  const batteryExaggeratedRegex = /(\b(?:7[0-9]|8[0-9]|9[0-9]|100)\s*-?\s*hours?\b[^.\n]*battery)/i;
  const matchBattery = content.match(batteryExaggeratedRegex);
  if (matchBattery && matchBattery.index !== undefined) {
    const quote = matchBattery[0];
    const factRef = brand.trustedFacts.find(f => f.topic.toLowerCase().includes('battery') || f.claimOrStat.toLowerCase().includes('battery'));

    findings.push({
      id: `find-fact-battery-${Date.now()}`,
      draftId,
      issueType: 'Fact Conflict',
      severity: 'high',
      quote,
      startIndex: matchBattery.index,
      endIndex: matchBattery.index + quote.length,
      explanation: 'Exceeds official lab benchmark: Verified battery life is up to 48 hours (ANC off) and 36 hours (ANC on). Contradicts engineering test specifications.',
      sourceLink: factRef ? `${factRef.source}` : 'Hardware Lab Protocol v2.4',
      ruleId: factRef?.id,
      suggestedFix: 'up to 48 hours of tested battery life',
      status: 'Pending',
      detectedBy: 'deterministic',
      createdAt: new Date().toISOString(),
      evidenceType: 'official_fact'
    });
  }

  // 3. Unverified Superlative Claims
  const superlativeRegex = /(most eco-friendly audio gear on the market today|the best sounding wireless headphones in the world|unbeatable performance guaranteed)/i;
  const matchSuperlative = content.match(superlativeRegex);
  if (matchSuperlative && matchSuperlative.index !== undefined) {
    const quote = matchSuperlative[0];
    findings.push({
      id: `find-unverified-${Date.now()}`,
      draftId,
      issueType: 'Unverified Claim',
      severity: 'medium',
      quote,
      startIndex: matchSuperlative.index,
      endIndex: matchSuperlative.index + quote.length,
      explanation: 'Superlative comparative claim lacks independent market substantiation. Must cite audited third-party benchmark before publishing.',
      sourceLink: 'Requires Independent Market Data Verification',
      suggestedFix: 'designed to minimize environmental footprint',
      status: 'Pending',
      detectedBy: 'deterministic',
      createdAt: new Date().toISOString(),
      evidenceType: 'unverified_claim'
    });
  }

  // 4. Tone Pillar Checks
  const hypeWordsRegex = /(revolutionary|game-changing|miraculous|disruptive)/i;
  const matchHype = content.match(hypeWordsRegex);
  if (matchHype && matchHype.index !== undefined && !findings.some(f => f.quote.toLowerCase() === matchHype[0].toLowerCase())) {
    const quote = matchHype[0];
    const tonePillar = brand.toneGuidelines[0];
    findings.push({
      id: `find-tone-${Date.now()}`,
      draftId,
      issueType: 'Tone',
      severity: 'low',
      quote,
      startIndex: matchHype.index,
      endIndex: matchHype.index + quote.length,
      explanation: 'Overused buzzword conflicts with our grounded, humble brand voice doctrine.',
      sourceLink: `Official Tone Pillar: ${tonePillar?.attribute || 'Grounded & Transparent'}`,
      suggestedFix: 'thoughtfully redesigned',
      status: 'Pending',
      detectedBy: 'deterministic',
      createdAt: new Date().toISOString(),
      evidenceType: 'official_rule'
    });
  }

  return findings;
}
