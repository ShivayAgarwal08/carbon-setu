import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, Sparkles } from 'lucide-react';

interface EligibilityBadgeProps {
  score?: number;
  reason?: string | null;
  confidence?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const EligibilityBadge: React.FC<EligibilityBadgeProps> = ({
  score,
  reason,
  confidence,
  size = 'md',
}) => {
  if (score === undefined || score === null) return null;

  const pct = Math.round(score * 100);

  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = HelpCircle;
  let label = 'Partial Match';

  if (pct >= 80) {
    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    Icon = CheckCircle2;
    label = 'High Match';
  } else if (pct >= 50) {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    Icon = Sparkles;
    label = 'Likely Eligible';
  } else {
    badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
    Icon = AlertCircle;
    label = 'Review Required';
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <div
      className={`inline-flex items-center font-medium rounded-full border ${badgeColor} ${sizeClasses} shadow-2xs`}
      title={reason || `${pct}% match confidence`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{label}</span>
      <span className="font-bold opacity-80">({pct}%)</span>
    </div>
  );
};

export const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const categoryConfig: Record<string, { label: string; bg: string; text: string }> = {
    AGRICULTURE: { label: 'Agriculture & Farmers', bg: 'bg-emerald-100', text: 'text-emerald-800' },
    EDUCATION: { label: 'Education & Scholarships', bg: 'bg-blue-100', text: 'text-blue-800' },
    HEALTHCARE: { label: 'Healthcare & Wellness', bg: 'bg-rose-100', text: 'text-rose-800' },
    HOUSING: { label: 'Housing & Shelter', bg: 'bg-amber-100', text: 'text-amber-800' },
    WOMEN_AND_CHILD: { label: 'Women & Child', bg: 'bg-pink-100', text: 'text-pink-800' },
    FINANCIAL_SERVICES: { label: 'Financial & Banking', bg: 'bg-indigo-100', text: 'text-indigo-800' },
    SKILL_DEVELOPMENT: { label: 'Skill Development', bg: 'bg-teal-100', text: 'text-teal-800' },
    SOCIAL_WELFARE: { label: 'Social Welfare', bg: 'bg-purple-100', text: 'text-purple-800' },
    BUSINESS_AND_ENTREPRENEURSHIP: { label: 'MSME & Business', bg: 'bg-orange-100', text: 'text-orange-800' },
    PENSION_AND_INSURANCE: { label: 'Pension & Insurance', bg: 'bg-cyan-100', text: 'text-cyan-800' },
    PUBLIC_SERVICE: { label: 'Public Service', bg: 'bg-slate-100', text: 'text-slate-800' },
  };

  const config = categoryConfig[category] || {
    label: category.replace(/_/g, ' '),
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};
