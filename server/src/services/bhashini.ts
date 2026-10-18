import { logger } from '../utils/logger';

export interface BhashiniConfig {
  userId?: string;
  apiKey?: string;
  pipelineId?: string;
  inferenceUrl?: string;
}

export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  provider: 'bhashini' | 'mock' | 'fallback';
}

export interface SpeechToTextResult {
  transcript: string;
  confidence: number;
  language: string;
  provider: 'bhashini' | 'mock' | 'fallback';
}

export interface TextToSpeechResult {
  audioBase64?: string;
  audioUrl?: string;
  language: string;
  provider: 'bhashini' | 'mock' | 'fallback';
}

// Bhashini ULCA / Dhruva inference endpoint (MeitY, Government of India)
const DEFAULT_INFERENCE_URL = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

// Official 22 Scheduled Indian Languages supported under Digital India Bhashini
export const BHASHINI_SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'en', name: 'Indian English' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'or', name: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'as', name: 'Assamese (অসমীয়া)' },
  { code: 'bho', name: 'Bhojpuri (भोजपुरी)' },
  { code: 'maithili', name: 'Maithili (मैथिली)' },
];

export class BhashiniService {
  private config: BhashiniConfig;

  constructor() {
    this.config = {
      userId: process.env.BHASHINI_USER_ID,
      apiKey: process.env.BHASHINI_API_KEY,
      pipelineId: process.env.BHASHINI_PIPELINE_ID,
      inferenceUrl: process.env.BHASHINI_INFERENCE_URL || DEFAULT_INFERENCE_URL,
    };
  }

  /**
   * Check whether real Bhashini credentials are configured.
   */
  public isConfigured(): boolean {
    return !!(
      this.config.userId &&
      this.config.apiKey &&
      this.config.userId.trim().length > 3 &&
      this.config.apiKey.trim().length > 5
    );
  }

  /**
   * Configuration diagnostic that NEVER exposes secrets.
   */
  public getStatus() {
    const configured = this.isConfigured();
    return {
      status: configured ? 'live_configured' : 'unavailable_unconfigured',
      provider: 'Bhashini ULCA (Ministry of Electronics and Information Technology, Govt of India)',
      configured,
      supportedLanguages: BHASHINI_SUPPORTED_LANGUAGES.map(l => l.code),
      supportedLanguageDetails: BHASHINI_SUPPORTED_LANGUAGES,
      browserSpeechFallback: true,
      browserSpeechSupported: true,
      notice: configured
        ? 'Bhashini ULCA pipeline is configured for Indian vernacular speech and translation.'
        : 'Bhashini credentials not set in environment. System automatically uses browser native Web Speech API as offline fallback.',
    };
  }

  /**
   * Translate text between Indian languages while preserving government scheme names and numbers.
   */
  public async translate(
    text: string,
    sourceLang: string = 'en',
    targetLang: string = 'hi',
    options: { mockMode?: boolean } = {}
  ): Promise<TranslationResult> {
    if (!text || text.trim() === '') {
      return { sourceText: '', translatedText: '', sourceLang, targetLang, provider: 'fallback' };
    }

    if (sourceLang === targetLang) {
      return { sourceText: text, translatedText: text, sourceLang, targetLang, provider: 'fallback' };
    }

    // Protect scheme names and currency from translation corruption
    const protectedTerms: string[] = [];
    let sanitizedText = text.replace(/(PM-KISAN|Ayushman Bharat|PM-JAY|PM Awas Yojana|PM SVANidhi|Atal Pension Yojana|₹\s*[\d,]+)/gi, (match) => {
      protectedTerms.push(match);
      return `__PROTECTED_${protectedTerms.length - 1}__`;
    });

    // Mock mode for testing without incurring network calls
    if (options.mockMode || (process.env.NODE_ENV === 'test' && !this.isConfigured())) {
      let mockTranslation = sanitizedText;
      if (sourceLang === 'en' && targetLang === 'hi') {
        mockTranslation = `[Bhashini हिंदी अनुवाद]: ${sanitizedText}`;
      } else if (sourceLang === 'hi' && targetLang === 'en') {
        mockTranslation = `[Bhashini English Translation]: ${sanitizedText}`;
      }

      protectedTerms.forEach((term, index) => {
        mockTranslation = mockTranslation.replace(`__PROTECTED_${index}__`, term);
      });

      return {
        sourceText: text,
        translatedText: mockTranslation,
        sourceLang,
        targetLang,
        provider: 'mock',
      };
    }

    if (!this.isConfigured()) {
      return {
        sourceText: text,
        translatedText: text,
        sourceLang,
        targetLang,
        provider: 'fallback',
      };
    }

    try {
      const response = await fetch(this.config.inferenceUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.config.apiKey!,
          'User-Id': this.config.userId!,
          'ulcaApiKey': this.config.apiKey!,
        },
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType: 'translation',
              config: {
                language: {
                  sourceLanguage: sourceLang,
                  targetLanguage: targetLang,
                },
                ...(this.config.pipelineId ? { serviceId: this.config.pipelineId } : {}),
              },
            },
          ],
          inputData: {
            input: [{ source: sanitizedText }],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Bhashini translation HTTP ${response.status}`);
      }

      const data = await response.json();
      let translated = data?.pipelineResponse?.[0]?.output?.[0]?.target || sanitizedText;

      // Restore protected terms
      protectedTerms.forEach((term, index) => {
        translated = translated.replace(`__PROTECTED_${index}__`, term);
      });

      return {
        sourceText: text,
        translatedText: translated,
        sourceLang,
        targetLang,
        provider: 'bhashini',
      };
    } catch (error) {
      logger.error('Bhashini translation failed', error);
      return {
        sourceText: text,
        translatedText: text,
        sourceLang,
        targetLang,
        provider: 'fallback',
      };
    }
  }

  /**
   * Server-side Speech-to-Text via Bhashini ASR.
   */
  public async speechToText(
    audioBase64: string,
    language: string = 'hi',
    options: { mockMode?: boolean } = {}
  ): Promise<SpeechToTextResult> {
    if (options.mockMode || (process.env.NODE_ENV === 'test' && !this.isConfigured())) {
      return {
        transcript: language === 'hi' ? 'मुझे किसान सम्मान निधि और फसल बीमा के बारे में जानना है' : 'I want to know about PM Kisan and crop insurance',
        confidence: 0.95,
        language,
        provider: 'mock',
      };
    }

    if (!this.isConfigured()) {
      return {
        transcript: '',
        confidence: 0,
        language,
        provider: 'fallback',
      };
    }

    try {
      const response = await fetch(this.config.inferenceUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.config.apiKey!,
          'User-Id': this.config.userId!,
          'ulcaApiKey': this.config.apiKey!,
        },
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType: 'asr',
              config: {
                language: { sourceLanguage: language },
                audioFormat: 'wav',
                samplingRate: 16000,
              },
            },
          ],
          inputData: {
            audio: [{ audioContent: audioBase64 }],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Bhashini ASR HTTP ${response.status}`);
      }

      const data = await response.json();
      const transcript = data?.pipelineResponse?.[0]?.output?.[0]?.source || '';

      return {
        transcript,
        confidence: 0.92,
        language,
        provider: 'bhashini',
      };
    } catch (error) {
      logger.error('Bhashini speech-to-text failed', error);
      return {
        transcript: '',
        confidence: 0,
        language,
        provider: 'fallback',
      };
    }
  }

  /**
   * Server-side Text-to-Speech via Bhashini TTS.
   */
  public async textToSpeech(
    text: string,
    language: string = 'hi',
    options: { gender?: 'female' | 'male'; mockMode?: boolean } = {}
  ): Promise<TextToSpeechResult> {
    if (options.mockMode || (process.env.NODE_ENV === 'test' && !this.isConfigured())) {
      return {
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        language,
        provider: 'mock',
      };
    }

    if (!this.isConfigured()) {
      return {
        language,
        provider: 'fallback',
      };
    }

    try {
      const response = await fetch(this.config.inferenceUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.config.apiKey!,
          'User-Id': this.config.userId!,
          'ulcaApiKey': this.config.apiKey!,
        },
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType: 'tts',
              config: {
                language: { sourceLanguage: language },
                gender: options.gender || 'female',
                samplingRate: 8000,
              },
            },
          ],
          inputData: {
            input: [{ source: text.slice(0, 500) }],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Bhashini TTS HTTP ${response.status}`);
      }

      const data = await response.json();
      const audioBase64 = data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent || '';

      return {
        audioBase64,
        language,
        provider: 'bhashini',
      };
    } catch (error) {
      logger.error('Bhashini TTS failed', error);
      return {
        language,
        provider: 'fallback',
      };
    }
  }
}

export const bhashiniService = new BhashiniService();
