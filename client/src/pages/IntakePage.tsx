import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Send,
  User,
  Bot,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { intakeApi, recordsApi } from '../api/client';
import { IntakeSession, Recommendation } from '../types';
import { SchemeCard } from '../components/SchemeCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export const IntakePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { user: _user } = useAuth();
  const { language, t } = useLanguage();

  const [mode, setMode] = useState<'chat' | 'form'>('chat');
  const [_problem, setProblem] = useState(initialQuery);
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [geminiStatus, setGeminiStatus] = useState<boolean>(true);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

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

  // Speech Recognition (Speech-to-Text) Hook
  const {
    isSupported: isSpeechSupported,
    isListening,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition((recognizedText) => {
    // Fill transcript directly into input field so user can review and edit before sending
    setInputMessage(recognizedText);
    setVoiceNotice(t('intake.reviewNotice'));
  });

  // Speech Synthesis (Text-to-Speech) Hook
  const {
    isSupported: isTtsSupported,
    speaking,
    speak,
    stop: stopSpeaking,
  } = useSpeechSynthesis();

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
    setVoiceNotice(null);
    try {
      const res = await intakeApi.start(userProblem, formProfile, language);
      if (res.success && res.data) {
        setSession(res.data.session);
        setGeminiStatus(res.data.geminiAvailable);
        if (res.data.session.messages) {
          setMessages(res.data.session.messages.map(m => ({ role: m.role, content: m.content })));
        }
        if (res.data.recommendations) {
          setRecommendations(res.data.recommendations);
        }
        if (res.data.aiExplanation) {
          setAiExplanation(res.data.aiExplanation);
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

    if (isListening) {
      stopListening();
    }
    setVoiceNotice(null);

    if (!session) {
      const userText = inputMessage;
      setProblem(userText);
      setInputMessage('');
      await handleStartSession(userText);
      return;
    }

    const userText = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const res = await intakeApi.sendMessage(session.id, userText, language);
      if (res.success && res.data) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        if (res.data.recommendations) {
          setRecommendations(res.data.recommendations);
        }
        if (res.data.aiExplanation) {
          setAiExplanation(res.data.aiExplanation);
        }
      }
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: language === 'hi'
            ? 'मैंने आपकी जानकारी का विश्लेषण कर नीचे दी गई उपयुक्त योजनाओं की सूची अद्यतित कर दी है!'
            : 'I analyzed your information and have updated the recommended schemes below!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const constructedProblem = language === 'hi'
      ? `मैं ${formProfile.state} से ${formProfile.ageRange} वर्ष का ${formProfile.gender} ${formProfile.occupation} हूँ। मेरी श्रेणी ${formProfile.category} है और वार्षिक आय ${formProfile.incomeRange} है। कृपया सभी उपयुक्त सरकारी योजनाएं खोजें।`
      : `I am a ${formProfile.ageRange} year old ${formProfile.gender} ${formProfile.occupation} from ${formProfile.state}, belonging to ${formProfile.category} category with annual income ${formProfile.incomeRange}. Please find all eligible welfare schemes.`;
    setProblem(constructedProblem);
    await handleStartSession(constructedProblem);
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      setVoiceNotice(null);
      startListening(language === 'hi' ? 'hi-IN' : 'en-IN');
    }
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
              {t('intake.title')}
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {t('intake.subtitle')}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'chat'
                ? 'bg-white text-orange-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 text-orange-600" />
            <span>{t('intake.chatMode')}</span>
          </button>
          <button
            onClick={() => setMode('form')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'form'
                ? 'bg-white text-orange-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-orange-600" />
            <span>{t('intake.formMode')}</span>
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
                    <h3 className="text-sm font-bold">{t('intake.assistantTitle')}</h3>
                    <p className="text-[11px] text-slate-300">
                      {geminiStatus ? t('intake.geminiActive') : t('intake.ruleActive')}
                    </p>
                  </div>
                </div>
                {session && (
                  <button
                    onClick={() => {
                      if (speaking) stopSpeaking();
                      if (isListening) stopListening();
                      setSession(null);
                      setMessages([]);
                      setRecommendations([]);
                      setAiExplanation(null);
                      setVoiceNotice(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    title={t('intake.reset')}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('intake.reset')}</span>
                  </button>
                )}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                {messages.length === 0 ? (
                  <div className="text-center py-8 px-4 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-base">
                        {t('intake.welcomeHeading')}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        {t('intake.welcomeBody')}
                      </p>
                    </div>

                    {/* Voice prompt guidance card */}
                    <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 text-left text-xs space-y-1.5 max-w-sm mx-auto">
                      <div className="flex items-center gap-1.5 font-bold text-orange-900">
                        <Mic className="w-3.5 h-3.5 text-orange-600" />
                        <span>{language === 'hi' ? 'बोलकर पूछें (Voice Assistant)' : 'Voice-First Discovery'}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {language === 'hi'
                          ? 'नीचे दिए गए माइक बटन को दबाकर बोलें। आपका बोला गया विवरण फ़ील्ड में दिखाई देगा, जिसे आप जांचकर भेज सकते हैं।'
                          : 'Click the mic icon below to speak. Your transcript will be displayed in the box so you can review and edit before sending.'}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto text-left text-xs">
                      <button
                        onClick={() => handleStartSession(language === 'hi' ? 'मैं यूपी में 2 एकड़ का किसान हूँ, फसल बीमा और वित्तीय सहायता चाहिए।' : 'I am a small farmer with 2 acres in UP looking for subsidies and financial support.')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-700 transition-colors cursor-pointer"
                      >
                        {t('intake.sampleFarmer')}
                      </button>
                      <button
                        onClick={() => handleStartSession(language === 'hi' ? 'इंजीनियरिंग कॉलेज में ओबीसी छात्रा हेतु छात्रवृत्ति चाहिए।' : 'Need college scholarship for OBC girl student in engineering.')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-700 transition-colors cursor-pointer"
                      >
                        {t('intake.sampleStudent')}
                      </button>
                      <button
                        onClick={() => handleStartSession(language === 'hi' ? 'गरीब परिवार के लिए मुफ्त इलाज और स्वास्थ्य बीमा चाहिए।' : 'Looking for free healthcare treatment cover for family below poverty line.')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-700 transition-colors cursor-pointer"
                      >
                        {t('intake.sampleHealth')}
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role !== 'user' && (
                        <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="space-y-1 max-w-[85%]">
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-slate-900 text-white rounded-tr-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs whitespace-pre-wrap'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* Inline TTS button for assistant speech */}
                        {msg.role !== 'user' && isTtsSupported && (
                          <div className="flex items-center gap-1.5 pl-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (speaking) stopSpeaking();
                                else speak(msg.content, language);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
                              title={speaking ? t('intake.stopExplanation') : t('intake.listenExplanation')}
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>{speaking ? t('common.stop') : t('common.speak')}</span>
                            </button>
                          </div>
                        )}
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
                    <span>{t('intake.analyzing')}</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2">
                {/* Active listening banner */}
                {isListening && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-900 animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="font-semibold">
                        {t('intake.listeningBadge')} {language === 'hi' ? 'हिंदी (hi-IN)' : 'English (en-IN)'} — {t('intake.micListening')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={stopListening}
                      className="text-[11px] font-bold text-orange-800 underline hover:text-orange-950 cursor-pointer"
                    >
                      {t('intake.micStop')}
                    </button>
                  </div>
                )}

                {/* Speech Error Banner */}
                {speechError && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {speechError === 'not-allowed'
                        ? t('intake.micDenied')
                        : speechError === 'not-supported'
                        ? t('intake.micUnsupported')
                        : `Voice error: ${speechError}`}
                    </span>
                  </div>
                )}

                {/* Voice Review Helper Notice */}
                {voiceNotice && !isListening && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                    {voiceNotice}
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  {/* Microphone Button */}
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={loading}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isListening
                        ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-md shadow-red-500/30'
                        : 'bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border-slate-300 hover:border-orange-300'
                    }`}
                    title={
                      !isSpeechSupported
                        ? t('intake.micUnsupported')
                        : isListening
                        ? t('intake.micStop')
                        : `${t('intake.micStart')} (${language === 'hi' ? 'हिंदी' : 'English'})`
                    }
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={inputMessage}
                    onChange={e => {
                      setInputMessage(e.target.value);
                      if (voiceNotice) setVoiceNotice(null);
                    }}
                    placeholder={
                      isListening
                        ? t('intake.micListening')
                        : session
                        ? t('intake.replyPlaceholder')
                        : t('intake.inputPlaceholder')
                    }
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                    title={t('intake.send')}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Structured Form Mode */
            <form onSubmit={handleFormSubmit} className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">{t('intake.formHeading')}</h3>
                <p className="text-xs text-slate-500">{t('intake.formSubheading')}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State / राज्य</label>
                  <select
                    value={formProfile.state}
                    onChange={e => setFormProfile({ ...formProfile, state: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="All India">All India / केंद्रीय</option>
                    <option value="Uttar Pradesh">Uttar Pradesh (उत्तर प्रदेश)</option>
                    <option value="Maharashtra">Maharashtra (महाराष्ट्र)</option>
                    <option value="Bihar">Bihar (बिहार)</option>
                    <option value="Madhya Pradesh">Madhya Pradesh (मध्य प्रदेश)</option>
                    <option value="Rajasthan">Rajasthan (राजस्थान)</option>
                    <option value="Karnataka">Karnataka (कर्नाटक)</option>
                    <option value="Gujarat">Gujarat (गुजरात)</option>
                    <option value="Tamil Nadu">Tamil Nadu (तमिलनाडु)</option>
                    <option value="West Bengal">West Bengal (पश्चिम बंगाल)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age Group / आयु वर्ग</label>
                  <select
                    value={formProfile.ageRange}
                    onChange={e => setFormProfile({ ...formProfile, ageRange: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="Under 18">Under 18 (18 से कम)</option>
                    <option value="18-35">18-35 years (युवा)</option>
                    <option value="36-50">36-50 years</option>
                    <option value="51-60">51-60 years</option>
                    <option value="Above 60">Above 60 (वरिष्ठ नागरिक)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Occupation / पेशा</label>
                  <select
                    value={formProfile.occupation}
                    onChange={e => setFormProfile({ ...formProfile, occupation: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="Farmer">Farmer / कृषक</option>
                    <option value="Student">Student / विद्यार्थी</option>
                    <option value="Business Owner / MSME">Small Business / MSME</option>
                    <option value="Artisan / Craftsman">Artisan / शिल्पकार</option>
                    <option value="Daily Wage Worker">Daily Wage / दिहाड़ी मजदूर</option>
                    <option value="Unemployed">Job Seeker / बेरोजगार</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Income / वार्षिक आय</label>
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
                  <span>Owns or cultivates agricultural land (कृषि भूमि धारक)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formProfile.isStudent}
                    onChange={e => setFormProfile({ ...formProfile, isStudent: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Currently enrolled in school/college (अध्ययनरत छात्र)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formProfile.hasDisability}
                    onChange={e => setFormProfile({ ...formProfile, hasDisability: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Person with Disability (दिव्यांगजन)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-md transition-colors mt-4 cursor-pointer"
              >
                {loading ? t('intake.evaluating') : t('intake.formSubmit')}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Ranked Scheme Matches & Audio Guidance (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-['Outfit'] flex items-center gap-2">
                <span>{t('intake.recommendedTitle')}</span>
                {recommendations.length > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    {recommendations.length} {t('intake.matchedBadge')}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                {t('intake.recommendedSubtitle')}
              </p>
            </div>
          </div>

          {/* AI Guidance Box with Spoken Output Control */}
          {aiExplanation && (
            <div className="bg-gradient-to-br from-orange-50/90 via-amber-50/50 to-white rounded-2xl border border-orange-200 p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-slate-900 text-sm font-['Outfit']">
                    {t('intake.aiGuidance')}
                  </h3>
                </div>

                {/* Spoken Output Button */}
                {isTtsSupported && (
                  <button
                    type="button"
                    onClick={() => {
                      if (speaking) {
                        stopSpeaking();
                      } else {
                        speak(aiExplanation, language);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      speaking
                        ? 'bg-orange-600 text-white shadow-xs animate-pulse'
                        : 'bg-white text-orange-700 hover:bg-orange-100 border border-orange-200'
                    }`}
                    title={speaking ? t('intake.stopExplanation') : t('intake.listenExplanation')}
                  >
                    {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{speaking ? t('intake.stopExplanation') : t('intake.listenExplanation')}</span>
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                {aiExplanation}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1 border-t border-orange-100/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{t('intake.officialNotice')}</span>
              </div>
            </div>
          )}

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
              <h3 className="font-bold text-slate-800 text-base">{t('intake.noConsultation')}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t('intake.noConsultationDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
