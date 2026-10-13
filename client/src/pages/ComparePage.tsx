import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  X,
  Plus,
  ArrowRight,
  ExternalLink,
  Coins,
  Building2,
  MapPin,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useCompare } from '../context/CompareContext';
import { CategoryBadge } from '../components/EligibilityBadge';

export const ComparePage: React.FC = () => {
  const { selectedRecords, removeRecord, clearCompare } = useCompare();

  if (selectedRecords.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <Layers className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 font-['Outfit']">
            No Schemes Selected to Compare
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Browse our scheme catalog or use the AI Benefit Finder and click "Compare" on any 2 to 3 schemes to evaluate them side by side.
          </p>
        </div>
        <Link
          to="/schemes"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-md transition-all"
        >
          <span>Browse Schemes Directory</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Outfit']">
              Scheme Comparison Matrix
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Compare benefits, income ceilings, and document requirements side by side.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={clearCompare}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
          >
            Clear All
          </button>
          <Link
            to="/schemes"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add More Schemes</span>
          </Link>
        </div>
      </div>

      {/* Comparison Table Grid */}
      <div className="overflow-x-auto pb-4">
        <div
          className="min-w-[800px] grid border border-slate-200 rounded-3xl bg-white shadow-xs overflow-hidden"
          style={{ gridTemplateColumns: `240px repeat(${selectedRecords.length}, minmax(280px, 1fr))` }}
        >
          {/* Header Row: Scheme Titles */}
          <div className="p-5 bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-r border-slate-200 flex items-center">
            Scheme Details
          </div>
          {selectedRecords.map(record => (
            <div
              key={record.id}
              className="p-5 border-b border-r border-slate-200 space-y-3 relative group"
            >
              <button
                onClick={() => removeRecord(record.id)}
                className="absolute top-3 right-3 text-slate-400 hover:text-red-600 p-1 rounded-md"
                title="Remove from comparison"
              >
                <X className="w-4 h-4" />
              </button>
              <CategoryBadge category={record.category} />
              <Link
                to={`/schemes/${record.slug}`}
                className="block font-bold text-base text-slate-900 hover:text-orange-600 transition-colors font-['Outfit'] pr-6 leading-snug"
              >
                {record.title}
              </Link>
              {record.department && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{record.department.name}</span>
                </p>
              )}
            </div>
          ))}

          {/* Primary Benefit Row */}
          <div className="p-5 bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-r border-slate-200 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-orange-600" />
            <span>Primary Benefit</span>
          </div>
          {selectedRecords.map(record => (
            <div key={record.id} className="p-5 border-b border-r border-slate-200 bg-orange-50/30">
              <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                {record.benefits || 'Financial & welfare benefit as per central guidelines'}
              </p>
            </div>
          ))}

          {/* Geographic Scope */}
          <div className="p-5 bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-r border-slate-200 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span>State / Jurisdiction</span>
          </div>
          {selectedRecords.map(record => (
            <div key={record.id} className="p-5 border-b border-r border-slate-200 text-xs text-slate-700">
              {record.stateScope && record.stateScope.length > 0
                ? record.stateScope.join(', ')
                : 'All India (National Coverage)'}
            </div>
          ))}

          {/* Target Beneficiaries */}
          <div className="p-5 bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-r border-slate-200 flex items-center">
            Beneficiaries
          </div>
          {selectedRecords.map(record => (
            <div key={record.id} className="p-5 border-b border-r border-slate-200 space-y-1">
              {record.beneficiaries?.map((b, i) => (
                <span
                  key={i}
                  className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium mr-1 mb-1"
                >
                  {b}
                </span>
              ))}
            </div>
          ))}

          {/* Eligibility Criteria */}
          <div className="p-5 bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-r border-slate-200 flex items-center">
            Eligibility Summary
          </div>
          {selectedRecords.map(record => (
            <div key={record.id} className="p-5 border-b border-r border-slate-200 text-xs text-slate-700 leading-relaxed">
              {record.eligibilityDetails || record.shortDescription}
            </div>
          ))}

          {/* Required Documents */}
          <div className="p-5 bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-r border-slate-200 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Required Documents</span>
          </div>
          {selectedRecords.map(record => (
            <div key={record.id} className="p-5 border-b border-r border-slate-200 space-y-1 text-xs text-slate-700">
              {(record.requiredDocuments || ['Aadhaar', 'Bank Passbook', 'Income Certificate']).map((doc, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Application Action Row */}
          <div className="p-5 bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-500 border-r border-slate-200 flex items-center">
            Official Portal
          </div>
          {selectedRecords.map(record => (
            <div key={record.id} className="p-5 border-r border-slate-200">
              {record.officialUrl ? (
                <a
                  href={record.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Apply Now</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <Link
                  to={`/schemes/${record.slug}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                >
                  <span>View Details</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
