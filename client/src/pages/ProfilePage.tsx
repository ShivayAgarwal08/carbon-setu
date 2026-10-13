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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { savedApi, profileApi } from '../api/client';
import { SavedRecordItem, UserProfile } from '../types';
import { CategoryBadge } from '../components/EligibilityBadge';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'saved' | 'profile'>('saved');
  const [savedItems, setSavedItems] = useState<SavedRecordItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

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

      {/* Tab 2: Eligibility Profile Form */}
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
