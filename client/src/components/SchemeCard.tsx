import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ArrowRight,
  Building2,
  MapPin,
  Check,
  Plus,
  Coins,
} from 'lucide-react';
import { GovernmentRecord } from '../types';
import { EligibilityBadge, CategoryBadge } from './EligibilityBadge';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { savedApi } from '../api/client';

interface SchemeCardProps {
  record: GovernmentRecord;
  relevanceScore?: number;
  matchReason?: string | null;
  onSavedChange?: (isSaved: boolean) => void;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({
  record,
  relevanceScore,
  matchReason,
  onSavedChange,
}) => {
  const { user } = useAuth();
  const { addRecord, removeRecord, isInCompare } = useCompare();
  const [isSaved, setIsSaved] = useState(record.isSaved || false);
  const [saving, setSaving] = useState(false);

  const compared = isInCompare(record.id);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.location.href = '/auth?mode=login';
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await savedApi.remove(record.id);
        setIsSaved(false);
        onSavedChange?.(false);
      } else {
        await savedApi.save(record.id);
        setIsSaved(true);
        onSavedChange?.(true);
      }
    } catch (err) {
      console.error('Failed to toggle save', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (compared) {
      removeRecord(record.id);
    } else {
      addRecord(record);
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-orange-300 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Card Header & Badges */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={record.category} />
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              <MapPin className="w-3 h-3 text-slate-400" />
              {record.stateScope && record.stateScope.length > 0
                ? record.stateScope.join(', ')
                : 'All India (Central)'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleCompare}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                compared
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
              title={compared ? 'Remove from compare' : 'Compare side by side'}
            >
              {compared ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Compare</span>
            </button>

            <button
              onClick={handleToggleSave}
              disabled={saving}
              className={`p-1.5 rounded-lg border transition-colors ${
                isSaved
                  ? 'bg-orange-50 border-orange-300 text-orange-600'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-orange-600 hover:border-slate-300'
              }`}
              title={isSaved ? 'Saved to your profile' : 'Save scheme'}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Scheme Title */}
        <Link to={`/schemes/${record.slug}`} className="block group-hover:text-orange-600 transition-colors">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug font-['Outfit']">
            {record.title}
          </h3>
        </Link>

        {/* Nodal Department */}
        {record.department && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{record.department.name}</span>
          </p>
        )}

        {/* Eligibility score banner if available */}
        {relevanceScore !== undefined && (
          <div className="mt-3">
            <EligibilityBadge score={relevanceScore} reason={matchReason} size="sm" />
            {matchReason && (
              <p className="text-xs text-emerald-800 bg-emerald-50/70 rounded-md p-2 mt-1.5 border border-emerald-100">
                {matchReason}
              </p>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-slate-600 line-clamp-3 mt-3 leading-relaxed">
          {record.shortDescription}
        </p>

        {/* Key Benefit Highlight */}
        {record.benefits && (
          <div className="mt-4 p-2.5 rounded-xl bg-orange-50/60 border border-orange-100/80 flex items-start gap-2">
            <Coins className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800 block">
                Primary Benefit
              </span>
              <p className="text-xs text-slate-800 font-medium line-clamp-2">
                {record.benefits}
              </p>
            </div>
          </div>
        )}

        {/* Target Beneficiaries Tags */}
        {record.beneficiaries && record.beneficiaries.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {record.beneficiaries.slice(0, 3).map((ben, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
              >
                {ben}
              </span>
            ))}
            {record.beneficiaries.length > 3 && (
              <span className="text-[10px] text-slate-400 self-center">
                +{record.beneficiaries.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link
          to={`/schemes/${record.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
        >
          <span>View Guidelines & Rules</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>

        {record.officialUrl && (
          <a
            href={record.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            title="Open official portal"
          >
            <span>Official Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
