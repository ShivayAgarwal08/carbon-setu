import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Bookmark,
  Sliders,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ArrowRight,
  Shield,
  Save,
  Building2,
  MapPin,
  Sparkles,
  ListTodo,
  Clock,
  FileText,
  Scale,
  Printer,
  Download,
  Copy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { savedApi, profileApi } from '../api/client';
import { SavedRecordItem, UserProfile } from '../types';
import { CategoryBadge } from '../components/EligibilityBadge';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'saved' | 'plans' | 'profile'>('saved');
  const [savedItems, setSavedItems] = useState<SavedRecordItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Action Plans state
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [currentDraftText, setCurrentDraftText] = useState('');
  const [currentDraftTitle, setCurrentDraftTitle] = useState('');

  // Profile fields
  const [profile, setProfile] = useState<UserProfile>({
    age: 28,
    gender: 'Male',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    occupation: 'Farmer',
    casteCategory: 'OBC',
    incomeAnnual: 180000,
    isStudent: false,
    isFarmer: true,
    isBpl: false,
    hasDisability: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);

  const loadPlans = async () => {
    try {
      const res = await savedApi.getPlans();
      if (res.success && res.data) {
        // filter out RTI drafts which are managed under /rti
        setSavedPlans(res.data.filter((p) => p.recordId !== 'RTI_DRAFT' && p.recordId !== 'RTI_FIRST_APPEAL'));
      }
    } catch (err) {
      console.error('Failed to load action plans', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }

    // Load saved items
    savedApi.getAll().then(res => {
      if (res.success && res.data) setSavedItems(res.data);
      setLoadingSaved(false);
    }).catch(() => setLoadingSaved(false));

    // Load action plans
    loadPlans();

    // Load user profile
    profileApi.get().then(res => {
      if (res.success && res.data) setProfile(prev => ({ ...prev, ...res.data }));
    }).catch(console.error);
  }, [user, navigate]);

  const handleRemoveSaved = async (recordId: string) => {
    try {
      await savedApi.remove(recordId);
      setSavedItems(prev => prev.filter(item => item.recordId !== recordId));
    } catch (err) {
      console.error('Failed to remove saved scheme', err);
    }
  };

  const handleToggleStep = async (plan: any, stepOrder: number) => {
    const currentSteps = plan.plan?.steps || [];
    const updatedSteps = currentSteps.map((s: any) =>
      s.order === stepOrder ? { ...s, completed: !s.completed } : s
    );

    const updatedPlanObj = {
      ...plan.plan,
      steps: updatedSteps,
    };

    setSavedPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, plan: updatedPlanObj } : p))
    );

    try {
      await savedApi.updatePlan(plan.id, { plan: updatedPlanObj });
    } catch (err) {
      console.error('Failed to update step', err);
    }
  };

  const handleUpdateStatus = async (planId: string, status: string) => {
    const plan = savedPlans.find((p) => p.id === planId);
    if (!plan) return;

    const updatedPlanObj = {
      ...plan.plan,
      status,
    };

    setSavedPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, plan: updatedPlanObj } : p))
    );

    try {
      await savedApi.updatePlan(planId, { plan: updatedPlanObj });
    } catch (err) {
      console.error('Failed to update plan status', err);
    }
  };

  const handleUpdateRefNumber = async (planId: string, refNumber: string) => {
    const plan = savedPlans.find((p) => p.id === planId);
    if (!plan) return;

    const updatedPlanObj = {
      ...plan.plan,
      applicationRef: refNumber,
    };

    setSavedPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, plan: updatedPlanObj } : p))
    );

    try {
      await savedApi.updatePlan(planId, { plan: updatedPlanObj });
    } catch (err) {
      console.error('Failed to update tracking number', err);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to remove this action plan?')) return;
    try {
      await savedApi.deletePlan(planId);
      setSavedPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err) {
      console.error('Failed to delete plan', err);
    }
  };

  const handleOpenDraftLetter = (plan: any) => {
    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const steps = plan.plan?.steps || [];
    const completedDocs = steps
      .filter((s: any) => s.completed && s.text.includes('Obtain / Verify:'))
      .map((s: any) => s.text.replace('Obtain / Verify: ', ''));

    const letter = `APPLICATION FOR ENROLLMENT AND SANCTION OF BENEFIT UNDER ${plan.title.toUpperCase()}

To:
The Competent Sanctioning Authority / District Nodal Officer,
${plan.title}
District Administration / Tehsil Office, ${profile.district || 'Lucknow'}, ${profile.state || 'Uttar Pradesh'}

Subject: Formal Application for Sanction and Disbursement of Benefit under ${plan.title}.
${plan.plan?.applicationRef ? `Application Reference / Acknowledgement No.: ${plan.plan.applicationRef}` : ''}

Respected Sir / Madam,

1. Particulars of the Applicant:
   (a) Full Name: ${user?.name || 'Citizen Applicant'}
   (b) State & District: ${profile.state || 'Uttar Pradesh'}, ${profile.district || 'Lucknow'}
   (c) Occupation: ${profile.occupation || 'Farmer / Worker'}
   (d) Category: ${profile.casteCategory || 'General / OBC'}
   (e) Annual Household Income: ₹${(profile.incomeAnnual || 180000).toLocaleString('en-IN')}
   (f) BPL Status: ${profile.isBpl ? 'Yes (Below Poverty Line)' : 'No'}

2. Submission of Application:
   I have duly reviewed the statutory eligibility conditions and guidelines published for ${plan.title}. I hereby submit this formal application along with the required verification documents for your kind sanction.

3. List of Verified Enclosures / Supporting Documents Attached:
${completedDocs.length > 0 ? completedDocs.map((d: string, i: number) => `   (${i + 1}) Self-attested copy of ${d}`).join('\n') : '   (1) Self-attested copy of Aadhaar Card\n   (2) Self-attested copy of Bank Passbook\n   (3) Income / Domicile Certificate'}

4. Declaration:
   I solemnly declare that all particulars stated above are true and correct to the best of my knowledge and that I have not concealed any material fact.

Date: ${currentDate}
Place: ${profile.district || 'Lucknow'}, ${profile.state || 'Uttar Pradesh'}

Yours faithfully,

___________________________________
Signature / Thumb Impression of Applicant
Name: ${user?.name || 'Citizen Applicant'}
Contact: ${user?.email || 'Registered Contact'}`;

    setCurrentDraftTitle(`Application Draft: ${plan.title}`);
    setCurrentDraftText(letter);
    setDraftModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await profileApi.update(profile);
      setProfileSavedSuccess(true);
      setTimeout(() => setProfileSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Citizen Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-2xl font-['Outfit'] shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 font-['Outfit']">{user.name}</h1>
              {user.role === 'ADMIN' && (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  ADMINISTRATOR
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span>Citizen ID: #{user.id.slice(0, 8)}</span>
              <span>•</span>
              <span>Language: {user.preferredLang === 'hi' ? 'हिंदी' : 'English'}</span>
            </div>
          </div>
        </div>

        {user.role === 'ADMIN' && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Shield className="w-4 h-4" />
            <span>Open Admin Dashboard</span>
          </Link>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'saved'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Schemes ({savedItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'plans'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>Action Plans & Progress ({savedPlans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>My Eligibility Attributes</span>
        </button>
      </div>

      {/* Tab 1: Saved Schemes */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {loadingSaved ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : savedItems.length > 0 ? (
            <div className="space-y-4">
              {savedItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={item.record.category} />
                      <span className="text-[11px] text-slate-500 font-medium">
                        Saved on {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Link
                      to={`/schemes/${item.record.slug}`}
                      className="block text-lg font-bold text-slate-900 hover:text-orange-600 transition-colors font-['Outfit']"
                    >
                      {item.record.title}
                    </Link>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {item.record.shortDescription}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/schemes/${item.record.slug}`}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                    >
                      View Dossier
                    </Link>
                    {item.record.officialUrl && (
                      <a
                        href={item.record.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <span>Apply</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleRemoveSaved(item.recordId)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
              <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">No schemes bookmarked yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  When browsing schemes or using the AI Benefit Finder, click the bookmark icon to track them here.
                </p>
              </div>
              <Link
                to="/schemes"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-semibold text-xs shadow-sm hover:bg-orange-700 transition-colors"
              >
                <span>Browse Scheme Directory</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Action Plans & Progress */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {loadingPlans ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : savedPlans.length > 0 ? (
            <div className="space-y-6">
              {savedPlans.map((plan) => {
                const steps: any[] = plan.plan?.steps || [];
                const completedSteps = steps.filter((s) => s.completed).length;
                const totalSteps = steps.length || 1;
                const percent = Math.round((completedSteps / totalSteps) * 100);
                const currentStatus = plan.plan?.status || 'preparing_documents';

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
                  >
                    {/* Header: Title, Status Badge, Delete */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase tracking-wider">
                            Application Milestone Plan
                          </span>
                          <span className="text-xs text-slate-400">
                            Created {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 font-['Outfit']">{plan.title}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Dropdown */}
                        <select
                          value={currentStatus}
                          onChange={(e) => handleUpdateStatus(plan.id, e.target.value)}
                          className="text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="researching">🔍 Researching Scheme</option>
                          <option value="preparing_documents">📋 Preparing Documents</option>
                          <option value="ready_to_apply">⏳ Ready to Apply</option>
                          <option value="submitted">📤 Application Submitted</option>
                          <option value="awaiting_response">⏳ Under Verification</option>
                          <option value="approved">✅ Sanctioned / Approved</option>
                          <option value="rejected">❌ Rejected / Delayed</option>
                        </select>

                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete Action Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">Application Readiness Progress</span>
                        <span className="text-amber-800">
                          {completedSteps} of {totalSteps} tasks completed ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Checklist */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Document Checklist & Milestones
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {steps.map((step) => (
                          <div
                            key={step.order}
                            onClick={() => handleToggleStep(plan, step.order)}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                              step.completed
                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 line-through opacity-85'
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-amber-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={step.completed}
                              onChange={() => {}}
                              className="w-4 h-4 text-emerald-600 rounded mt-0.5 shrink-0 pointer-events-none"
                            />
                            <span className="font-medium">{step.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tracking Reference & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                      {/* Tracking Number Input */}
                      <div className="flex items-center gap-2 max-w-sm">
                        <input
                          type="text"
                          placeholder="Application / Ref No. (e.g. UP/2026/8912)"
                          defaultValue={plan.plan?.applicationRef || ''}
                          onBlur={(e) => handleUpdateRefNumber(plan.id, e.target.value)}
                          className="text-xs rounded-xl border border-slate-300 px-3 py-1.5 w-full bg-slate-50"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleOpenDraftLetter(plan)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                          <span>Generate Application Letter</span>
                        </button>

                        {(currentStatus === 'rejected' || currentStatus === 'awaiting_response') && (
                          <Link
                            to="/rti"
                            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Scale className="w-3.5 h-3.5 text-amber-700" />
                            <span>Draft RTI Inquiry</span>
                          </Link>
                        )}

                        {plan.plan?.officialUrl && (
                          <a
                            href={plan.plan.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <span>Official Portal</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
              <ListTodo className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">No active action plans yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Navigate to any scheme detail page and click &quot;Track Action Plan&quot; to build a personalized application and document checklist.
                </p>
              </div>
              <Link
                to="/schemes"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-semibold text-xs shadow-sm hover:bg-orange-700 transition-colors"
              >
                <span>Browse Schemes to Create Plan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Generated Application Draft Modal */}
      {draftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-4 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{currentDraftTitle}</h3>
                <p className="text-xs text-slate-500">
                  Pre-filled application cover letter based on your citizen profile and checked certificates.
                </p>
              </div>
              <button
                onClick={() => setDraftModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <textarea
              rows={14}
              value={currentDraftText}
              onChange={(e) => setCurrentDraftText(e.target.value)}
              className="flex-1 text-xs font-mono p-4 rounded-xl border border-slate-300 bg-slate-50 leading-relaxed focus:bg-white focus:outline-hidden"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
              <span className="text-xs text-slate-400">Review, edit, and print or download.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentDraftText);
                    alert('Draft copied to clipboard!');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.createElement('a');
                    const file = new Blob([currentDraftText], { type: 'text/plain;charset=utf-8' });
                    el.href = URL.createObjectURL(file);
                    el.download = `Application_Cover_Letter_${Date.now()}.txt`;
                    document.body.appendChild(el);
                    el.click();
                    document.body.removeChild(el);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Letter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Eligibility Profile Form */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-['Outfit']">
              Personal Demographic Attributes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These details are saved privately to your profile and used to match exact welfare schemes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State of Residence</label>
              <select
                value={profile.state || ''}
                onChange={e => setProfile({ ...profile, state: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white"
              >
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Bihar">Bihar</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="West Bengal">West Bengal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">District / Tehsil</label>
              <input
                type="text"
                value={profile.district || ''}
                onChange={e => setProfile({ ...profile, district: e.target.value })}
                placeholder="e.g. Lucknow, Varanasi"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Age (Years)</label>
              <input
                type="number"
                value={profile.age || ''}
                onChange={e => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Occupation</label>
              <select
                value={profile.occupation || ''}
                onChange={e => setProfile({ ...profile, occupation: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white"
              >
                <option value="Farmer">Farmer (Land owner / tenant)</option>
                <option value="Student">Student</option>
                <option value="Artisan / Potter / Carpenter">Artisan / PM-Vishwakarma</option>
                <option value="Daily Wage Laborer">Daily Wage Laborer / Construction</option>
                <option value="Street Vendor">Street Vendor / PM-SVANidhi</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Salaried Employee">Salaried Employee</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Social Category</label>
              <select
                value={profile.casteCategory || ''}
                onChange={e => setProfile({ ...profile, casteCategory: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white"
              >
                <option value="General">General</option>
                <option value="OBC">OBC (Other Backward Classes)</option>
                <option value="SC">SC (Scheduled Caste)</option>
                <option value="ST">ST (Scheduled Tribe)</option>
                <option value="EWS">EWS (Economically Weaker)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Family Income (₹)</label>
              <input
                type="number"
                value={profile.incomeAnnual || ''}
                onChange={e => setProfile({ ...profile, incomeAnnual: parseInt(e.target.value) || 0 })}
                placeholder="e.g. 150000"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(profile.isFarmer)}
                onChange={e => setProfile({ ...profile, isFarmer: e.target.checked })}
                className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
              />
              <span>I own agricultural land / cultivate crops</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(profile.isStudent)}
                onChange={e => setProfile({ ...profile, isStudent: e.target.checked })}
                className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
              />
              <span>I am currently a student enrolled in school or higher education</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(profile.hasDisability)}
                onChange={e => setProfile({ ...profile, hasDisability: e.target.checked })}
                className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
              />
              <span>Person with Benchmark Disability (PwD) / Divyangjan</span>
            </label>
          </div>

          {profileSavedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile attributes saved successfully!</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Update Citizen Profile'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
