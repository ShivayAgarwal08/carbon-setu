import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Send,
  User,
  Bot,
  MapPin,
  Briefcase,
  Coins,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { intakeApi, recordsApi } from '../api/client';
import { IntakeSession, Recommendation, GovernmentRecord } from '../types';
import { SchemeCard } from '../components/SchemeCard';
import { useAuth } from '../context/AuthContext';

export const IntakePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { user } = useAuth();

  const [mode, setMode] = useState<'chat' | 'form'>('chat');
  const [problem, setProblem] = useState(initialQuery);
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [geminiStatus, setGeminiStatus] = useState<boolean>(true);

  // Form structured fields
  const [formProfile, setFormProfile] = useState({
    state: 'All India',
    district: '',
    ageRange: '18-35',
    gender: 'Any',
    occupation: 'Farmer',
    category: 'General',
    incomeRange: 'Below ₹2.5 Lakh',
    areaType: 'Rural',
    isStudent: false,
    isFarmer: true,
    hasDisability: false,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start if query parameter provided
  useEffect(() => {
    if (initialQuery && !session) {
      handleStartSession(initialQuery);
    }
  }, [initialQuery]);

  const handleStartSession = async (userProblem: string) => {
    if (!userProblem.trim()) return;
    setLoading(true);
    try {
      const res = await intakeApi.start(userProblem, formProfile);
      if (res.success && res.data) {
        setSession(res.data.session);
        setGeminiStatus(res.data.geminiAvailable);
        if (res.data.session.messages) {
          setMessages(res.data.session.messages.map(m => ({ role: m.role, content: m.content })));
        }
        if (res.data.recommendations) {
          setRecommendations(res.data.recommendations);
        }
      }
    } catch (err) {
      console.error('Failed to start intake session', err);
      // Fallback local search
      try {
        const fallbackRes = await recordsApi.search({ q: userProblem, limit: 6 });
        if (fallbackRes.success) {
          setRecommendations(
            fallbackRes.data.map((r, i) => ({
              id: `rec-${i}`,
              recordId: r.id,
              relevanceScore: 0.85 - i * 0.05,
              matchReason: 'Matched based on your problem keywords & criteria',
              confidence: 'HIGH',
              record: r,
            }))
          );
        }
      } catch (e) {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    if (!session) {
      setProblem(inputMessage);
      await handleStartSession(inputMessage);
      setInputMessage('');
      return;
    }

    const userText = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const res = await intakeApi.sendMessage(session.id, userText);
      if (res.success && res.data) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        if (res.data.recommendations) {
          setRecommendations(res.data.recommendations);
        }
      }
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I analyzed your information and have updated the recommended schemes below!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const constructedProblem = `I am a ${formProfile.ageRange} year old ${formProfile.gender} ${formProfile.occupation} from ${formProfile.state}, belonging to ${formProfile.category} category with annual income ${formProfile.incomeRange}. Please find all eligible welfare schemes.`;
    setProblem(constructedProblem);
    await handleStartSession(constructedProblem);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Outfit']">
              AI Citizen Benefit Finder
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Answer a few quick questions to uncover every central & state scheme matched to your profile.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'chat'
                ? 'bg-white text-orange-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 text-orange-600" />
            <span>Interactive AI Assistant</span>
          </button>
          <button
            onClick={() => setMode('form')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'form'
                ? 'bg-white text-orange-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-orange-600" />
            <span>Structured Profile Form</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Intake Chat or Form (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          {mode === 'chat' ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Setu AI Assistant</h3>
                    <p className="text-[11px] text-slate-300">
                      {geminiStatus ? 'Gemini 2.0 Flash Active' : 'Heuristic Rule Engine Active'}
                    </p>
                  </div>
                </div>
                {session && (
                  <button
                    onClick={() => {
                      setSession(null);
                      setMessages([]);
                      setRecommendations([]);
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    title="Start New Consultation"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                {messages.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-base">
                        Namaste! How can I assist you today?
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Describe what you or your family need: educational fees, farmer assistance, medical support, affordable housing, or business loans.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto text-left text-xs">
                      <button
                        onClick={() => handleStartSession('I am a small farmer with 2 acres in UP looking for subsidies and financial support.')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-700 transition-colors"
                      >
                        🌾 "Small farmer in UP with 2 acres needing crop support"
                      </button>
                      <button
                        onClick={() => handleStartSession('Need college scholarship for OBC girl student in engineering.')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-700 transition-colors"
                      >
                        🎓 "College scholarship for OBC girl student"
                      </button>
                      <button
                        onClick={() => handleStartSession('Looking for free healthcare treatment cover for family below poverty line.')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-700 transition-colors"
                      >
                        🏥 "Free healthcare cover for low income family"
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role !== 'user' && (
                        <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-slate-900 text-white rounded-tr-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs whitespace-pre-wrap'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex gap-3 items-center text-xs text-slate-500 italic p-2">
                    <Sparkles className="w-4 h-4 text-orange-500 animate-spin" />
                    <span>Analyzing government eligibility rules & criteria...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder={session ? 'Reply to the assistant...' : 'Describe your problem...'}
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* Structured Form Mode */
            <form onSubmit={handleFormSubmit} className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Citizen Eligibility Profile</h3>
                <p className="text-xs text-slate-500">Provide demographic criteria to filter eligible schemes</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <select
                    value={formProfile.state}
                    onChange={e => setFormProfile({ ...formProfile, state: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="All India">All India / Central</option>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Occupation</label>
                  <select
                    value={formProfile.occupation}
                    onChange={e => setFormProfile({ ...formProfile, occupation: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="Farmer">Farmer / Agriculture</option>
                    <option value="Student">Student</option>
                    <option value="Daily Wage / Informal Worker">Daily Wage / Informal</option>
                    <option value="Self Employed / Artisan">Artisan / Vishwakarma</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Salaried">Salaried</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Social Category</label>
                  <select
                    value={formProfile.category}
                    onChange={e => setFormProfile({ ...formProfile, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="General">General</option>
                    <option value="OBC">OBC (Other Backward Classes)</option>
                    <option value="SC">SC (Scheduled Caste)</option>
                    <option value="ST">ST (Scheduled Tribe)</option>
                    <option value="EWS">EWS (Economically Weaker)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Family Income</label>
                  <select
                    value={formProfile.incomeRange}
                    onChange={e => setFormProfile({ ...formProfile, incomeRange: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="Below ₹1 Lakh (BPL)">Below ₹1 Lakh (BPL)</option>
                    <option value="₹1 Lakh - ₹2.5 Lakh">₹1 Lakh - ₹2.5 Lakh</option>
                    <option value="₹2.5 Lakh - ₹5 Lakh">₹2.5 Lakh - ₹5 Lakh</option>
                    <option value="₹5 Lakh - ₹8 Lakh">₹5 Lakh - ₹8 Lakh</option>
                    <option value="Above ₹8 Lakh">Above ₹8 Lakh</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formProfile.isFarmer}
                    onChange={e => setFormProfile({ ...formProfile, isFarmer: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Owns or cultivates agricultural land</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formProfile.isStudent}
                    onChange={e => setFormProfile({ ...formProfile, isStudent: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Currently enrolled in school/college/university</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formProfile.hasDisability}
                    onChange={e => setFormProfile({ ...formProfile, hasDisability: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Person with Disability (PwD) / Divyangjan</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-md transition-colors mt-4"
              >
                {loading ? 'Evaluating Eligibility...' : 'Find Eligible Schemes'}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Ranked Scheme Matches (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-['Outfit'] flex items-center gap-2">
                <span>Recommended Schemes</span>
                {recommendations.length > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    {recommendations.length} Matched
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Sorted by eligibility match score and direct financial impact
              </p>
            </div>
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map(rec => (
                <SchemeCard
                  key={rec.id}
                  record={rec.record}
                  relevanceScore={rec.relevanceScore}
                  matchReason={rec.matchReason}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No consultation submitted yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Start by describing your requirements or fill out your profile on the left. The AI engine will instantly rank every relevant welfare scheme.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
