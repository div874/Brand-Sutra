import React from 'react';
import { ReviewStatus } from '@/types';
import { FileEdit, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: ReviewStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const configs: Record<ReviewStatus, { label: string; className: string; icon: React.ReactNode }> = {
    'Draft': {
      label: 'Draft',
      className: 'badge-draft',
      icon: <FileEdit className="w-3.5 h-3.5" />
    },
    'In Review': {
      label: 'In Review',
      className: 'badge-in-review',
      icon: <Clock className="w-3.5 h-3.5" />
    },
    'Changes Requested': {
      label: 'Changes Requested',
      className: 'badge-changes-requested',
      icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    'Approved': {
      label: 'Approved',
      className: 'badge-approved',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />
    }
  };

  const config = configs[status] || configs['Draft'];
  const sizeClasses = size === 'sm' ? 'text-[11px] py-0.5 px-2' : 'text-xs py-1 px-2.5';

  return (
    <span 
      className={`badge-status ${config.className} ${sizeClasses}`}
      role="status"
      aria-label={`Draft status: ${config.label}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
