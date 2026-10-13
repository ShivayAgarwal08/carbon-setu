import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Search,
  ArrowRight,
  ShieldCheck,
  Users,
  Coins,
  FileCheck2,
  CheckCircle2,
  Wheat,
  GraduationCap,
  HeartPulse,
  Home,
  Baby,
  Briefcase,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { recordsApi } from '../api/client';
import { GovernmentRecord } from '../types';
import { SchemeCard } from '../components/SchemeCard';

export const HomePage: React.FC = () => {
  const [problemQuery, setProblemQuery] = useState('');
  const [featuredRecords, setFeaturedRecords] = useState<GovernmentRecord[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsRes, catRes] = await Promise.all([
          recordsApi.search({ limit: 6, sort: 'verified' }),
          recordsApi.getCategories(),
        ]);
        if (recordsRes.success) setFeaturedRecords(recordsRes.data);
        if (catRes.success) setCategories(catRes.data);
      } catch (err) {
        console.error('Error fetching home data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemQuery.trim()) return;
    navigate(`/intake?q=${encodeURIComponent(problemQuery)}`);
  };

  const categoryIcons: Record<string, any> = {
    AGRICULTURE: Wheat,
    EDUCATION: GraduationCap,
    HEALTHCARE: HeartPulse,
    HOUSING: Home,
    WOMEN_AND_CHILD: Baby,
    BUSINESS_AND_ENTREPRENEURSHIP: Briefcase,
  };

  return (
    <div className="space-y-16 pb-16">
      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/70 via-white to-slate-50 pt-12 pb-20 border-b border-slate-200">
        {/* Subtle decorative background shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-gradient-to-br from-orange-200/40 to-amber-200/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-gradient-to-tr from-emerald-200/30 to-teal-100/20 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Live Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-900 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-spin" />
              <span>AI-Powered Citizen Benefits Discovery</span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              <span className="text-orange-700">Digital India Vision</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] font-['Outfit']">
              Every Government Benefit You Deserve.{' '}
              <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 bg-clip-text text-transparent">
                Simplified & Verified.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Don't miss out on financial support, farm subsidies, free medical treatments, or student scholarships. State your situation in simple words — CARbon Setu finds your eligible schemes in seconds.
            </p>

            {/* Conversational Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-8 bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200 flex flex-col sm:flex-row items-center gap-2 max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-3 px-3 flex-1 w-full">
                <Search className="w-5 h-5 text-orange-500 shrink-0" />
                <input
                  type="text"
                  value={problemQuery}
                  onChange={e => setProblemQuery(e.target.value)}
                  placeholder="e.g. Small farmer in UP needing crop loan & solar pump subsidy..."
                  className="w-full py-2.5 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold text-sm shadow-md shadow-orange-600/30 transition-all shrink-0"
              >
                <span>Find My Benefits</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Prompt suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-400">Popular queries:</span>
              <button
                onClick={() => setProblemQuery('Daughter college scholarship above 80%')}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 transition-colors"
              >
                Girl Student Scholarship
              </button>
              <button
                onClick={() => setProblemQuery('Ayushman card medical treatment for senior citizen')}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 transition-colors"
              >
                ₹5 Lakh Free Treatment
              </button>
              <button
                onClick={() => setProblemQuery('PM Kisan 6000 rupees installment registration')}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 transition-colors"
              >
                PM-KISAN ₹6,000
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS & IMPACT BAR ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-orange-400 mb-1">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-2xl sm:text-3xl font-extrabold font-['Outfit']">100%</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-200">Verified Schemes</p>
            <p className="text-[11px] text-slate-400">Nodal ministry gazette matched</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
              <Coins className="w-5 h-5" />
              <span className="text-2xl sm:text-3xl font-extrabold font-['Outfit']">₹25,000+</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-200">Avg. Citizen Entitlement</p>
            <p className="text-[11px] text-slate-400">Direct annual cash & subsidies</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-blue-400 mb-1">
              <Users className="w-5 h-5" />
              <span className="text-2xl sm:text-3xl font-extrabold font-['Outfit']">28 States</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-200">Central & State Coverage</p>
            <p className="text-[11px] text-slate-400">Unified nationwide discovery</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 mb-1">
              <FileCheck2 className="w-5 h-5" />
              <span className="text-2xl sm:text-3xl font-extrabold font-['Outfit']">Doc Readiness</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-200">Zero Confusion</p>
            <p className="text-[11px] text-slate-400">Clear required paperwork checklist</p>
          </div>
        </div>
      </section>

      {/* ── BROWSE BY CATEGORY ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 block">
              Direct Pathways
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit']">
              Explore Schemes by Category
            </h2>
          </div>
          <Link
            to="/schemes"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            <span>View all schemes</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { key: 'AGRICULTURE', label: 'Agriculture & Farmers', desc: 'Seeds, PM-Kisan, solar pumps' },
            { key: 'EDUCATION', label: 'Education & Scholarships', desc: 'Pre & post-matric grants' },
            { key: 'HEALTHCARE', label: 'Healthcare & Insurance', desc: 'Ayushman Bharat & critical care' },
            { key: 'HOUSING', label: 'Housing (PMAY)', desc: 'Rural & urban housing subsidies' },
            { key: 'WOMEN_AND_CHILD', label: 'Women & Child', desc: 'Sukanya, maternity support' },
            { key: 'BUSINESS_AND_ENTREPRENEURSHIP', label: 'MSME & Loans', desc: 'Mudra & PM Vishwakarma' },
          ].map(cat => {
            const Icon = categoryIcons[cat.key] || Briefcase;
            const count = categories.find(c => c.category === cat.key)?.count || 0;
            return (
              <Link
                key={cat.key}
                to={`/schemes?category=${cat.key}`}
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-orange-50 group-hover:bg-orange-500 text-orange-600 group-hover:text-white flex items-center justify-center transition-colors mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-orange-600 transition-colors">
                    {cat.label}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.desc}</p>
                </div>
                {count > 0 && (
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-orange-600 mt-3 block">
                    {count} schemes →
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── HOW CARbon SETU WORKS (3 STEPS) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-slate-800">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400 block">
              Transparent Citizen Gateway
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-['Outfit'] mt-1">
              How CARbon Setu Works
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              We eliminate complex bureaucratic language and paperwork hurdles in 3 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="text-lg font-bold">Describe Your Situation</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tell us your age, location, income level, and what support you require (farming, health, business loan, or education) in conversational language.
              </p>
            </div>

            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="text-lg font-bold">Rigorous Eligibility Matching</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Our rule engine evaluates statutory criteria (land size, caste category, annual income ceilings) with AI reasoning to give high-confidence matches.
              </p>
            </div>

            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-lg font-bold">Apply with Ready Checklist</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Receive the exact list of required certificates (Aadhaar, Income, Land Records) and direct deep-links to official central/state application portals.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              to="/intake"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-600/30 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Benefit Finder Now</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURED & HIGH IMPACT SCHEMES ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>High Impact & Frequently Applied</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] mt-1">
              Featured Welfare Schemes
            </h2>
          </div>
          <Link
            to="/schemes"
            className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>Browse all ({featuredRecords.length > 0 ? 'Full Directory' : ''})</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : featuredRecords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRecords.map(record => (
              <SchemeCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm">No schemes loaded yet. Database seeding in progress.</p>
          </div>
        )}
      </section>

      {/* ── CITIZEN CALL TO ACTION ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold font-['Outfit']">
              Save Schemes to Your Citizen Profile
            </h3>
            <p className="text-orange-100 text-sm leading-relaxed">
              Create a free account to track application deadlines, store your eligibility profile, and get alerted when new schemes launch in your district.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/auth?mode=register"
              className="px-6 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm shadow-md transition-all"
            >
              Create Free Citizen Profile
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
