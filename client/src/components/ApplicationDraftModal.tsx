import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Printer,
  ExternalLink,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { applicationsApi, profileApi } from '../api/client';
import { GovernmentRecord } from '../types';
import { useAuth } from '../context/AuthContext';

interface ApplicationDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: GovernmentRecord;
}

export const ApplicationDraftModal: React.FC<ApplicationDraftModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form State
  const [applicantName, setApplicantName] = useState(user?.name || '');
  const [fatherOrSpouseName, setFatherOrSpouseName] = useState('');
  const [dobOrAge, setDobOrAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [category, setCategory] = useState('General');
  const [occupation, setOccupation] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState(record.stateScope?.[0] || 'Uttar Pradesh');
  const [pincode, setPincode] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [hasAadhaarLinkedBank, setHasAadhaarLinkedBank] = useState(true);
  const [landholdingAcres, setLandholdingAcres] = useState('');
  const [khasraKhatauniNumber, setKhasraKhatauniNumber] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'hi'>('en');

  // Generated Result State
  const [draftResult, setDraftResult] = useState<{
    documentId: string;
    schemeTitle: string;
    draftText: string;
    missingRequiredFields: string[];
    mandatoryChecklist: string[];
    submissionInstructions: string[];
    officialPortalUrl: string;
    submissionAuthority: string;
    statutoryDisclaimer: string;
  } | null>(null);

  // Auto-fill from user profile if available
  useEffect(() => {
    if (user && isOpen) {
      profileApi.get().then((res) => {
        if (res.success && res.data) {
          const p = res.data;
          if (p.state) setState(p.state);
          if (p.district) setDistrict(p.district);
          if (p.occupation) setOccupation(p.occupation);
          if (p.casteCategory) setCategory(p.casteCategory);
          if (p.gender) setGender(p.gender);
          if (p.age) setDobOrAge(`${p.age} years`);
        }
      }).catch(() => {});
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await applicationsApi.generate({
        schemeSlug: record.slug,
        schemeTitle: record.title,
        applicantName,
        fatherOrSpouseName,
        dobOrAge,
        gender,
        category,
        occupation,
        annualIncome,
        address,
        district,
        state,
        pincode,
        mobileNumber,
        hasAadhaarLinkedBank,
        landholdingAcres: landholdingAcres ? Number(landholdingAcres) : undefined,
        khasraKhatauniNumber,
        preferredLanguage,
        saveDraft: !!user,
      });

      if (res.success && res.data) {
        setDraftResult(res.data);
        if (res.data.savedDraftId) setSaved(true);
      }
    } catch (err) {
      alert('Failed to generate application draft. Please check required fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!draftResult) return;
    navigator.clipboard.writeText(draftResult.draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-['Outfit'] text-base">
                Prefilled Application Generator
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-md">
                {record.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {!draftResult ? (
            <form onSubmit={handleGenerate} className="space-y-5">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Independent Civic Tool:</strong> This generates an editable, prefilled application draft to help you apply. It does NOT submit to the government. You must take this draft to your local Common Service Centre (CSC) or submit on the official portal.
                </span>
              </div>

              {/* Language Selection */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Application Language:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('en')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border ${
                      preferredLanguage === 'en'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    English Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('hi')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border ${
                      preferredLanguage === 'hi'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    हिंदी प्रारूप (Hindi)
                  </button>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applicant Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Full name as in Aadhaar"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Father's / Spouse's Name
                  </label>
                  <input
                    type="text"
                    value={fatherOrSpouseName}
                    onChange={(e) => setFatherOrSpouseName(e.target.value)}
                    placeholder="Father or Husband name"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth or Age
                  </label>
                  <input
                    type="text"
                    value={dobOrAge}
                    onChange={(e) => setDobOrAge(e.target.value)}
                    placeholder="e.g. 42 years or DD/MM/YYYY"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Social Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="General">General / Unreserved</option>
                    <option value="OBC">Other Backward Class (OBC)</option>
                    <option value="SC">Scheduled Caste (SC)</option>
                    <option value="ST">Scheduled Tribe (ST)</option>
                    <option value="EWS">Economically Weaker Section (EWS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Small Farmer, Street Vendor"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Complete Address (Village/Town, Ward, Post Office) *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Plot No., Village or Street Name"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="District name"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State name"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="6-digit PIN code"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {record.slug.includes('kisan') && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cultivable Landholding (Acres)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={landholdingAcres}
                        onChange={(e) => setLandholdingAcres(e.target.value)}
                        placeholder="e.g. 2.5"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Khasra / Khatauni / Land Record No.
                      </label>
                      <input
                        type="text"
                        value={khasraKhatauniNumber}
                        onChange={(e) => setKhasraKhatauniNumber(e.target.value)}
                        placeholder="e.g. Khatauni 104/52"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Declarations */}
              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAadhaarLinkedBank}
                    onChange={(e) => setHasAadhaarLinkedBank(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span>
                    My bank account is seeded with Aadhaar and has an active Direct Benefit Transfer (DBT) mandate.
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'Generating Draft...' : 'Generate Prefilled Draft'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Success & Missing Fields Alerts */}
              <div className="space-y-2">
                {draftResult.missingRequiredFields.length > 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Missing Information Required Before Submission:</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] pl-1 text-amber-800">
                      {draftResult.missingRequiredFields.map((field, idx) => (
                        <li key={idx}>{field}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All basic fields prefilled. Review the draft below before printing or filing.</span>
                  </div>
                )}

                {saved && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                    Draft saved to your citizen profile for future access.
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>

                {draftResult.officialPortalUrl && (
                  <a
                    href={draftResult.officialPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Submit on Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Mandatory Documents Checklist */}
              {draftResult.mandatoryChecklist.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Mandatory Documents to Attach (Original + Photocopies):
                  </h4>
                  <ul className="space-y-1.5">
                    {draftResult.mandatoryChecklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formatted Draft Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  Reviewable Prefilled Application Draft
                </div>
                <pre className="p-4 bg-white text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {draftResult.draftText}
                </pre>
              </div>

              {/* Statutory Disclaimer */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{draftResult.statutoryDisclaimer}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setDraftResult(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Edit Information
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
