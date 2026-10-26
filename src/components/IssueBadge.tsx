import React from 'react';
import { IssueType, IssueSeverity } from '@/types';

interface IssueBadgeProps {
  type: IssueType;
  severity?: IssueSeverity;
}

export function IssueBadge({ type, severity }: IssueBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border border-[#333333] bg-[#171717] text-[#e5e5e5]">
      <span>{type}</span>
      {severity && (
        <span className="text-[10px] text-[#8a8a8a] uppercase tracking-wider">
          • {severity}
        </span>
      )}
    </span>
  );
}
