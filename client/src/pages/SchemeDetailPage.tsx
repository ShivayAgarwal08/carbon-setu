import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  FileText,
  Share2,
  Printer,
  Coins,
  MapPin,
  HelpCircle,
  PhoneCall,
  Plus,
  Check,
  Flag,
} from 'lucide-react';
import { recordsApi, savedApi } from '../api/client';
import { GovernmentRecord } from '../types';
import { CategoryBadge } from '../components/EligibilityBadge';
import { FeedbackModal } from '../components/FeedbackModal';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';

export const SchemeDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { addRecord, removeRecord, isInCompare } = useCompare();

  const [record, setRecord] = useState<GovernmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!slug) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await recordsApi.getBySlug(slug);
        if (res.success && res.data) {
          setRecord(res.data);
          setIsSaved(res.data.isSaved || false);
        } else {
          setError('Scheme not found');
        }
      } catch (err) {
        setError('Failed to load scheme details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [slug]);

  const handleToggleSave = async () => {
    if (!record) return;
    if (!user) {
      window.location.href = '/auth?mode=login';
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await savedApi.remove(record.id);
        setIsSaved(false);
      } else {
        await savedApi.save(record.id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const compared = record ? isInCompare(record.id) : false;

  const handleToggleCompare = () => {
    if (!record) return;
    if (compared) {
      removeRecord(record.id);
    } else {
      addRecord(record);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: record?.title,
        text: record?.shortDescription,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-12 w-3/4 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-900 font-['Outfit']">Scheme Not Found</h2>
        <p className="text-sm text-slate-600">{error || 'The requested scheme could not be found.'}</p>
        <Link
          to="/schemes"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-semibold text-sm shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Schemes Directory</span>
        </Link>
      </div>
    );
  }

  const docs = record.requiredDocuments || [
    'Aadhaar Card of Applicant',
    'Bank Account Passbook (Aadhaar linked)',
    'Income Certificate issued by Tehsildar/Revenue Authority',
    'Domicile / Residence Certificate',
  ];

  const readyDocsCount = Object.values(checkedDocs).filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & utility actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/schemes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Schemes</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1.5"
            title="Share scheme details"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1.5"
            title="Print scheme guidelines"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-amber-700 text-xs flex items-center gap-1.5"
            title="Report data discrepancy"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report Issue</span>
          </button>
        </div>
      </div>

      {/* Scheme Dossier Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={record.category} />
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            <MapPin className="w-3 h-3 text-slate-400" />
            {record.stateScope && record.stateScope.length > 0
              ? record.stateScope.join(', ')
              : 'All India (Central Scheme)'}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Government Verified</span>
          </span>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-['Outfit']">
            {record.title}
          </h1>
          {record.department && (
            <p className="flex items-center gap-2 text-sm text-slate-600 mt-2 font-medium">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>{record.department.name}</span>
            </p>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleToggleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              isSaved
                ? 'bg-orange-50 border-orange-300 text-orange-700'
                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4 text-orange-600" /> : <Bookmark className="w-4 h-4" />}
            <span>{isSaved ? 'Saved to Profile' : 'Save Scheme'}</span>
          </button>

          <button
            onClick={handleToggleCompare}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              compared
                ? 'bg-orange-50 border-orange-300 text-orange-700'
                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
            }`}
          >
            {compared ? <Check className="w-4 h-4 text-orange-600" /> : <Plus className="w-4 h-4" />}
            <span>{compared ? 'In Comparison' : 'Add to Compare'}</span>
          </button>

          {record.officialUrl && (
            <a
              href={record.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-md shadow-orange-600/20 transition-all ml-auto"
            >
              <span>Apply on Official Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main Grid: Details & Document Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Scheme Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Key Benefit Highlight Box */}
          {record.benefits && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200/80 p-6 space-y-2">
              <div className="flex items-center gap-2 text-orange-800 text-xs font-bold uppercase tracking-wider">
                <Coins className="w-4 h-4 text-orange-600" />
                <span>Financial & Welfare Benefit Details</span>
              </div>
              <p className="text-slate-900 font-semibold text-base leading-relaxed">
                {record.benefits}
              </p>
            </div>
          )}

          {/* Detailed Overview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 font-['Outfit']">
              Scheme Description & Objective
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed space-y-3">
              <p>{record.shortDescription}</p>
              {record.detailedDescription && (
                <p className="text-slate-600 whitespace-pre-line">{record.detailedDescription}</p>
              )}
            </div>
          </div>

          {/* Eligibility Criteria */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 font-['Outfit'] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Eligibility Guidelines</span>
            </h2>
            {record.eligibilityDetails ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {record.eligibilityDetails}
              </p>
            ) : (
              <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside">
                <li>Must be a citizen of India residing in eligible jurisdiction.</li>
                <li>Family annual income must be within specified limits of the scheme guidelines.</li>
                <li>Must not be drawing conflicting parallel benefits under similar central schemes.</li>
                <li>Applicant must possess active Aadhaar and Aadhaar-seeded bank account.</li>
              </ul>
            )}

            {/* Target Beneficiaries */}
            {record.beneficiaries && record.beneficiaries.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Target Beneficiary Groups
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {record.beneficiaries.map((b, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Application Process Guidelines */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 font-['Outfit']">
              How to Apply (Step-by-Step)
            </h2>
            {record.applicationProcess ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {record.applicationProcess}
              </p>
            ) : (
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </span>
                  <p>
                    Visit the official portal or your local Common Service Centre (CSC) / Panchayat Bhawan.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </span>
                  <p>Complete e-KYC using Aadhaar number and registered mobile OTP.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </span>
                  <p>Upload digital copies of required certificates and submit application.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                    4
                  </span>
                  <p>Note your Application Reference Number (ARN) for status tracking.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Document Readiness & Verification (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Document Readiness Interactive Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-slate-900 text-base font-['Outfit']">
                  Document Readiness Checker
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                {readyDocsCount}/{docs.length} Ready
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Check off documents you have in hand before initiating application on the official portal:
            </p>

            <div className="space-y-2.5 pt-2">
              {docs.map((doc, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    checkedDocs[doc]
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checkedDocs[doc])}
                    onChange={e =>
                      setCheckedDocs({ ...checkedDocs, [doc]: e.target.checked })
                    }
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-medium leading-relaxed">{doc}</span>
                </label>
              ))}
            </div>

            {readyDocsCount === docs.length ? (
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>All documents ready! You are prepared to apply smoothly.</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 text-center">
                Need help getting certificates? Contact your nearest Tehsil office or CSC.
              </p>
            )}
          </div>

          {/* Official Verification & Department Contacts */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">
              Nodal Contact & Helplines
            </h3>
            <div className="space-y-3 text-xs text-slate-300">
              {record.department && (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Department</span>
                  <span className="font-semibold text-white">{record.department.name}</span>
                </div>
              )}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Public Grievance Portal</span>
                  <span className="font-semibold text-white">CPGRAMS</span>
                </div>
                <a
                  href="https://pgportal.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3">
              Last data integrity verification:{' '}
              <span className="text-slate-200">
                {record.lastVerifiedAt
                  ? new Date(record.lastVerifiedAt).toLocaleDateString()
                  : 'Current Financial Year'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        recordId={record.id}
        recordTitle={record.title}
      />
    </div>
  );
};
