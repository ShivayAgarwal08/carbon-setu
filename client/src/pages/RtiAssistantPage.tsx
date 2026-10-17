import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Scale,
  Printer,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Save,
  Plus,
  Trash2,
  Clock,
  HelpCircle,
  Building,
  User,
  ShieldAlert,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { rtiApi, profileApi } from '../api/client';

export const RtiAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'request' | 'appeal' | 'saved'>('request');
  const [authorities, setAuthorities] = useState<any[]>([]);
  const [loadingAuthorities, setLoadingAuthorities] = useState(true);

  // Form State — Section 6(1) RTI
  const [requestForm, setRequestForm] = useState({
    publicAuthority: 'Ministry of Agriculture and Farmers Welfare',
    authorityAddress: '',
    applicantName: user?.name || '',
    fatherOrSpouseName: '',
    address: '',
    state: 'Uttar Pradesh',
    pincode: '',
    phone: '',
    email: user?.email || '',
    isBpl: false,
    bplCardNumber: '',
    subject: 'Inquiry regarding status and disbursement of PM-Kisan installment',
    timePeriod: 'Financial Year 2024-2025',
    relatedScheme: 'PM-Kisan Samman Nidhi Yojana',
    specificQueries: [
      'What is the current status of the citizen application / beneficiary record linked to my details?',
      'If any installment is on hold or pending, what are the specific reasons and missing verification items recorded in the official portal?',
      'What are the designated remediation steps and the contact particulars of the local nodal officer responsible for resolution?',
    ],
  });

  // Form State — Section 19(1) First Appeal
  const [appealForm, setAppealForm] = useState({
    publicAuthority: 'Ministry of Agriculture and Farmers Welfare',
    firstAppellateAuthority: 'The First Appellate Authority / Joint Secretary',
    faaAddress: '',
    originalRtiDate: '',
    originalRtiRegNumber: '',
    cpioNameOrDesignation: 'Central Public Information Officer (CPIO)',
    cpioReplyDate: '',
    receivedNoResponse: true,
    groundsOfAppeal: [
      'No response or information was furnished by the Respondent CPIO within the mandatory statutory period of 30 days prescribed under Section 7(1) of the RTI Act, 2005.',
      'Under Section 7(2) of the Act, failure to give decision within 30 days shall be deemed to have refused the request.',
    ],
    specificReliefSought:
      'Direct the Respondent CPIO to immediately furnish the complete, certified information requested in the original RTI application FREE OF COST pursuant to Section 7(6) of the RTI Act, 2005.',
    applicantName: user?.name || '',
    fatherOrSpouseName: '',
    address: '',
    state: 'Uttar Pradesh',
    pincode: '',
    phone: '',
    email: user?.email || '',
    isBpl: false,
    bplCardNumber: '',
  });

  // Generated draft state
  const [generatedDraft, setGeneratedDraft] = useState<any | null>(null);
  const [editableDraftText, setEditableDraftText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Saved Drafts state
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [loadingSavedDrafts, setLoadingSavedDrafts] = useState(false);

  useEffect(() => {
    // Load verified authorities
    rtiApi
      .getAuthorities()
      .then((res) => {
        if (res.success && res.data) {
          setAuthorities(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingAuthorities(false));

    // If logged in, fetch profile to pre-fill
    if (user) {
      profileApi
        .get()
        .then((res) => {
          if (res.success && res.data) {
            const p = res.data;
            if (p.state) {
              setRequestForm((prev) => ({ ...prev, state: p.state || prev.state }));
              setAppealForm((prev) => ({ ...prev, state: p.state || prev.state }));
            }
            if (p.isBpl) {
              setRequestForm((prev) => ({ ...prev, isBpl: true }));
              setAppealForm((prev) => ({ ...prev, isBpl: true }));
            }
          }
        })
        .catch(console.error);

      loadSavedDrafts();
    }
  }, [user]);

  const loadSavedDrafts = async () => {
    if (!user) return;
    setLoadingSavedDrafts(true);
    try {
      const res = await rtiApi.getDrafts();
      if (res.success && res.data) {
        setSavedDrafts(res.data);
      }
    } catch (err) {
      console.error('Failed to load saved RTI drafts', err);
    } finally {
      setLoadingSavedDrafts(false);
    }
  };

  // Add/remove query lines
  const handleAddQuery = () => {
    if (requestForm.specificQueries.length >= 8) return;
    setRequestForm((prev) => ({
      ...prev,
      specificQueries: [...prev.specificQueries, ''],
    }));
  };

  const handleQueryChange = (idx: number, val: string) => {
    const updated = [...requestForm.specificQueries];
    updated[idx] = val;
    setRequestForm((prev) => ({ ...prev, specificQueries: updated }));
  };

  const handleRemoveQuery = (idx: number) => {
    if (requestForm.specificQueries.length <= 1) return;
    setRequestForm((prev) => ({
      ...prev,
      specificQueries: prev.specificQueries.filter((_, i) => i !== idx),
    }));
  };

  // Generate Draft Action
  const handleGenerate = async (saveDirectly = false) => {
    setIsGenerating(true);
    try {
      const payload =
        activeTab === 'request'
          ? {
              ...requestForm,
              type: 'RTI_REQUEST',
              preferredLanguage: language === 'hi' ? 'hi' : 'en',
              saveDraft: saveDirectly,
            }
          : {
              ...appealForm,
              type: 'FIRST_APPEAL',
              preferredLanguage: language === 'hi' ? 'hi' : 'en',
              saveDraft: saveDirectly,
            };

      const res = await rtiApi.generate(payload);
      if (res.success && res.data) {
        setGeneratedDraft(res.data);
        setEditableDraftText(res.data.draftText);
        if (saveDirectly) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
          loadSavedDrafts();
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate draft. Please ensure all required fields are filled.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save editable draft
  const handleSaveToAccount = async () => {
    if (!user) {
      alert('Please log in or register to save drafts to your account.');
      return;
    }
    if (!generatedDraft) return;

    try {
      await handleGenerate(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(editableDraftText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Download plain text file
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([editableDraftText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${activeTab === 'request' ? 'RTI_Application_Sec_6_1' : 'First_Appeal_Sec_19_1'}_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Print draft
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
            <Scale className="w-3.5 h-3.5" />
            <span>Right to Information Act, 2005 (Act No. 22 of 2005)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-['Outfit']">
            RTI & First Appeal <span className="text-amber-400">Drafting Assistant</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Generate formal, legally grounded application drafts under <strong>Section 6(1)</strong> when you need information or face delays, or file a <strong>Section 19(1) First Appeal</strong> when an application is rejected or ignored. Free, editable, and ready to print or submit online.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-amber-200/80">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Statutory 30-Day Response Mandate
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ₹10 Standard Fee (Exempt for BPL)
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Print, Download & Edit
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2 sm:gap-4">
        <button
          onClick={() => {
            setActiveTab('request');
            setGeneratedDraft(null);
          }}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'request'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. RTI Application (Section 6(1))</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('appeal');
            setGeneratedDraft(null);
          }}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'appeal'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>2. First Appeal (Section 19(1))</span>
        </button>

        {user && (
          <button
            onClick={() => {
              setActiveTab('saved');
              loadSavedDrafts();
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>3. My Saved Drafts ({savedDrafts.length})</span>
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      {activeTab === 'saved' ? (
        /* Saved Drafts Tab */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 font-['Outfit']">Your Saved RTI & Appeal Drafts</h2>
            <p className="text-xs text-slate-500">
              Drafts saved to your citizen account are securely stored in your personal database profile. You can reload, edit, print, or download them at any time.
            </p>

            {loadingSavedDrafts ? (
              <div className="py-8 text-center text-slate-400">Loading your saved drafts...</div>
            ) : savedDrafts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl border-slate-300">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">No RTI drafts saved yet.</p>
                <p className="text-xs text-slate-500 mt-1">Generate a draft using the tabs above and click &quot;Save Draft to Account&quot;.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {savedDrafts.map((draft) => (
                  <div key={draft.id} className="border border-slate-200 rounded-xl p-5 hover:border-amber-300 transition-colors bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        {draft.type === 'FIRST_APPEAL' ? 'FIRST APPEAL (SEC 19(1))' : 'RTI APPLICATION (SEC 6(1))'}
                      </span>
                      <span className="text-[11px] text-slate-400">{new Date(draft.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{draft.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{draft.publicAuthority || 'Public Authority'}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <button
                        onClick={() => {
                          setGeneratedDraft({ draftText: draft.draftText, type: draft.type, title: draft.title });
                          setEditableDraftText(draft.draftText);
                          setActiveTab(draft.type === 'FIRST_APPEAL' ? 'appeal' : 'request');
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                      >
                        <span>Open & Edit</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm('Delete this saved RTI draft?')) {
                            await rtiApi.deleteDraft(draft.id);
                            setSavedDrafts((prev) => prev.filter((d) => d.id !== draft.id));
                          }
                        }}
                        className="text-xs text-slate-400 hover:text-red-600 p-1"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Form & Preview Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Outfit']">
                  {activeTab === 'request'
                    ? 'Step 1: Fill RTI Application Details (Section 6(1))'
                    : 'Step 1: Fill First Appeal Details (Section 19(1))'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {activeTab === 'request'
                    ? 'Enter the facts and specific questions you require from the public authority. Do not include abusive language or hypothetical questions.'
                    : 'Provide the particulars of the original application, filing date, and why you are aggrieved with the CPIO action or inaction.'}
                </p>
              </div>

              {/* Public Authority Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Public Authority / Ministry *
                </label>
                <select
                  value={activeTab === 'request' ? requestForm.publicAuthority : appealForm.publicAuthority}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = authorities.find((a) => a.name === val);
                    if (activeTab === 'request') {
                      setRequestForm((prev) => ({
                        ...prev,
                        publicAuthority: val,
                        authorityAddress: matched?.address || prev.authorityAddress,
                      }));
                    } else {
                      setAppealForm((prev) => ({
                        ...prev,
                        publicAuthority: val,
                        faaAddress: matched?.address || prev.faaAddress,
                      }));
                    }
                  }}
                  className="w-full text-xs font-medium rounded-xl border border-slate-300 px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-slate-50"
                >
                  {authorities.map((auth) => (
                    <option key={auth.id} value={auth.name}>
                      {auth.name}
                    </option>
                  ))}
                  <option value="District Magistrate / Collectorate Office">District Magistrate / Collectorate Office</option>
                  <option value="State Revenue Department / Tehsildar Office">State Revenue Department / Tehsildar Office</option>
                  <option value="Other Department (Specify Below)">Other Department (Specify in Address)</option>
                </select>
              </div>

              {/* Specific to First Appeal: Original RTI Details */}
              {activeTab === 'appeal' && (
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-4">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Original Application Particulars</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Original Application Filing Date *</label>
                      <input
                        type="date"
                        value={appealForm.originalRtiDate}
                        onChange={(e) => setAppealForm((prev) => ({ ...prev, originalRtiDate: e.target.value }))}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">RTI Reg. / Speed Post Tracking No.</label>
                      <input
                        type="text"
                        placeholder="e.g. MOABR/R/E/24/00123"
                        value={appealForm.originalRtiRegNumber}
                        onChange={(e) => setAppealForm((prev) => ({ ...prev, originalRtiRegNumber: e.target.value }))}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appealForm.receivedNoResponse}
                        onChange={(e) => setAppealForm((prev) => ({ ...prev, receivedNoResponse: e.target.checked }))}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <span className="text-xs font-medium text-slate-800">
                        No response received within mandatory 30 days (Deemed Refusal under Section 7(2))
                      </span>
                    </label>
                  </div>

                  {!appealForm.receivedNoResponse && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">CPIO Decision / Reply Date</label>
                      <input
                        type="date"
                        value={appealForm.cpioReplyDate}
                        onChange={(e) => setAppealForm((prev) => ({ ...prev, cpioReplyDate: e.target.value }))}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* RTI Subject & Scheme Reference (for Request) */}
              {activeTab === 'request' && (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Subject Matter of Information *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Current status and processing of crop insurance compensation claim"
                      value={requestForm.subject}
                      onChange={(e) => setRequestForm((prev) => ({ ...prev, subject: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Time Period of Information</label>
                      <input
                        type="text"
                        placeholder="e.g. 01 April 2024 to 31 March 2025"
                        value={requestForm.timePeriod}
                        onChange={(e) => setRequestForm((prev) => ({ ...prev, timePeriod: e.target.value }))}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Related Scheme / Service (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. PM Fasal Bima Yojana / PM-Kisan"
                        value={requestForm.relatedScheme}
                        onChange={(e) => setRequestForm((prev) => ({ ...prev, relatedScheme: e.target.value }))}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>
                  </div>

                  {/* Specific Queries */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Specific Information Queries ({requestForm.specificQueries.length}/8) *
                      </label>
                      <button
                        type="button"
                        onClick={handleAddQuery}
                        className="text-xs text-amber-700 font-semibold hover:text-amber-800 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Query</span>
                      </button>
                    </div>

                    {requestForm.specificQueries.map((query, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-xs font-bold text-amber-800 pt-2 shrink-0">{idx + 1}.</span>
                        <textarea
                          rows={2}
                          value={query}
                          onChange={(e) => handleQueryChange(idx, e.target.value)}
                          placeholder={`Enter query ${idx + 1}...`}
                          className="flex-1 text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          required
                        />
                        {requestForm.specificQueries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuery(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Applicant Details */}
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Citizen / Applicant Particulars</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      value={activeTab === 'request' ? requestForm.applicantName : appealForm.applicantName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'request') setRequestForm((prev) => ({ ...prev, applicantName: val }));
                        else setAppealForm((prev) => ({ ...prev, applicantName: val }));
                      }}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Father&apos;s / Spouse&apos;s Name</label>
                    <input
                      type="text"
                      value={activeTab === 'request' ? requestForm.fatherOrSpouseName : appealForm.fatherOrSpouseName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'request') setRequestForm((prev) => ({ ...prev, fatherOrSpouseName: val }));
                        else setAppealForm((prev) => ({ ...prev, fatherOrSpouseName: val }));
                      }}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Postal Address for Reply *</label>
                    <input
                      type="text"
                      placeholder="Village/Mohalla, Post, Tehsil"
                      value={activeTab === 'request' ? requestForm.address : appealForm.address}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'request') setRequestForm((prev) => ({ ...prev, address: val }));
                        else setAppealForm((prev) => ({ ...prev, address: val }));
                      }}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Pincode *</label>
                    <input
                      type="text"
                      value={activeTab === 'request' ? requestForm.pincode : appealForm.pincode}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'request') setRequestForm((prev) => ({ ...prev, pincode: val }));
                        else setAppealForm((prev) => ({ ...prev, pincode: val }));
                      }}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2"
                      required
                    />
                  </div>
                </div>

                {/* BPL Status Checkbox */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeTab === 'request' ? requestForm.isBpl : appealForm.isBpl}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (activeTab === 'request') setRequestForm((prev) => ({ ...prev, isBpl: checked }));
                        else setAppealForm((prev) => ({ ...prev, isBpl: checked }));
                      }}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Applicant is Below Poverty Line (BPL) — Claim 100% Fee Exemption
                    </span>
                  </label>
                  {(activeTab === 'request' ? requestForm.isBpl : appealForm.isBpl) && (
                    <input
                      type="text"
                      placeholder="Enter BPL / Antyodaya Ration Card Number"
                      value={activeTab === 'request' ? requestForm.bplCardNumber : appealForm.bplCardNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'request') setRequestForm((prev) => ({ ...prev, bplCardNumber: val }));
                        else setAppealForm((prev) => ({ ...prev, bplCardNumber: val }));
                      }}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Generate Draft Button */}
              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={isGenerating}
                className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <span>Generating Legal Draft...</span>
                ) : (
                  <>
                    <Scale className="w-4 h-4" />
                    <span>Generate Formal Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Draft Preview & Procedural Guidelines (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Generated Draft Output Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 font-['Outfit'] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Draft Application Preview</span>
                </h2>
                {generatedDraft && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Draft Ready
                  </span>
                )}
              </div>

              {generatedDraft ? (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>You can edit this draft directly below:</span>
                    <span className="text-[11px] text-amber-700 font-semibold">{editableDraftText.length} characters</span>
                  </div>

                  {/* Editable textarea with print formatting */}
                  <textarea
                    rows={16}
                    value={editableDraftText}
                    onChange={(e) => setEditableDraftText(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 p-3 bg-slate-50/50 leading-relaxed focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />

                  {/* Actions Toolbar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copySuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveToAccount}
                      className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      {saveSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{saveSuccess ? 'Saved!' : 'Save'}</span>
                    </button>
                  </div>

                  {/* Official RTI Online Link */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <p className="font-bold text-amber-950">Official Central RTI Portal</p>
                      <p className="text-[11px] text-amber-800">Submit this draft directly at rtionline.gov.in</p>
                    </div>
                    <a
                      href="https://rtionline.gov.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <span>Open Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Statutory References list */}
                  {generatedDraft.statutoryReferences && (
                    <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-200">
                      <p className="font-bold text-slate-700">Statutory Provisions Cited:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {generatedDraft.statutoryReferences.map((ref: string, i: number) => (
                          <li key={i}>{ref}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Scale className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">No draft generated yet.</p>
                  <p className="text-[11px] text-slate-400">Fill the details on the left and click &quot;Generate Formal Draft&quot;.</p>
                </div>
              )}
            </div>

            {/* Legal Disclaimers & Statutory Guidelines Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Statutory Instructions & Responsible Disclaimer</span>
              </div>
              <ul className="space-y-2 text-[11px] leading-relaxed">
                <li>
                  <strong>Drafting Aid Only:</strong> CARbon Setu generates editable drafts based on facts you provide. It is not a government agency, post office, or law firm. You must review, sign, and submit the draft yourself.
                </li>
                <li>
                  <strong>30-Day Mandate (Sec 7(1)):</strong> The Public Information Officer is legally obligated to respond within 30 days of receiving your application (48 hours if concerning life and liberty).
                </li>
                <li>
                  <strong>Fee Exemption:</strong> Under the Proviso to Section 7(5), no application or reproduction fee shall be charged from citizens Below Poverty Line (BPL).
                </li>
                <li>
                  <strong>Free Information on Delay (Sec 7(6)):</strong> Where a public authority fails to provide information within the statutory 30-day timeline, the information must be provided <em>free of cost</em>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
