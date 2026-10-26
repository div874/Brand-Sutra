import React from 'react';
import { ReviewStatus } from '@/types';

interface StatusBadgeProps {
  status: ReviewStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<ReviewStatus, string> = {
    'Draft': 'border-[#333333] bg-[#1a1a1a] text-[#a3a3a3]',
    'In Review': 'border-[#525252] bg-[#262626] text-[#ededed]',
    'Changes Requested': 'border-[#525252] bg-[#1f1f1f] text-[#d4d4d4]',
    'Approved': 'border-[#737373] bg-[#2e2e2e] text-[#ffffff]'
  };

  const style = styles[status] || styles['Draft'];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}
