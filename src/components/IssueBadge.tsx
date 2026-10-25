import React from 'react';
import { IssueType, IssueSeverity } from '@/types';
import { MessageSquareQuote, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';

interface IssueBadgeProps {
  type: IssueType;
  severity?: IssueSeverity;
}

export function IssueBadge({ type, severity }: IssueBadgeProps) {
  const configs: Record<IssueType, { label: string; className: string; icon: React.ReactNode }> = {
    'Tone': {
      label: 'Tone Mismatch',
      className: 'badge-issue-tone',
      icon: <Sparkles className="w-3.5 h-3.5" />
    },
    'Terminology': {
      label: 'Prohibited Term',
      className: 'badge-issue-term',
      icon: <ShieldAlert className="w-3.5 h-3.5" />
    },
    'Fact Conflict': {
      label: 'Fact Conflict',
      className: 'badge-issue-fact',
      icon: <MessageSquareQuote className="w-3.5 h-3.5" />
    },
    'Unverified Claim': {
      label: 'Needs Verification',
      className: 'badge-issue-claim',
      icon: <HelpCircle className="w-3.5 h-3.5" />
    }
  };

  const config = configs[type] || {
    label: type,
    className: 'badge-issue-tone',
    icon: <Sparkles className="w-3.5 h-3.5" />
  };

  return (
    <span className={`badge-issue ${config.className}`}>
      {config.icon}
      <span>{config.label}</span>
      {severity && (
        <span className={`ml-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
          severity === 'high' ? 'bg-rose-500/30 text-rose-200' :
          severity === 'medium' ? 'bg-amber-500/30 text-amber-200' :
          'bg-slate-500/30 text-slate-300'
        }`}>
          {severity}
        </span>
      )}
    </span>
  );
}
