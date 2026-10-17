import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  speaking: boolean;
  speak: (text: string, langCode?: 'en' | 'hi' | string) => void;
  stop: () => void;
}

export const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [speaking, setSpeaking] = useState(false);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    isMountedRef.current = true;

    if (isSupported) {
      const loadVoices = () => {
        try {
          voicesRef.current = window.speechSynthesis.getVoices();
        } catch {
          // ignore
        }
      };

      loadVoices();
      if (typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      isMountedRef.current = false;
      if (isSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      if (isMountedRef.current) {
        setSpeaking(false);
      }
    }
  }, [isSupported]);

  const speak = useCallback((text: string, langCode: 'en' | 'hi' | string = 'en') => {
    if (!isSupported || !text.trim()) return;

    // Clean text: strip markdown characters (*, #, _, `, etc.) for smooth natural voice speech
    const cleanText = text
      .replace(/[*#_`>~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    // Cancel any active utterance
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    currentUtteranceRef.current = utterance;

    // Pick best voice
    let voices = voicesRef.current;
    if (!voices || voices.length === 0) {
      try {
        voices = window.speechSynthesis.getVoices();
        voicesRef.current = voices;
      } catch {
        voices = [];
      }
    }

    const isHindi = langCode === 'hi' || langCode.startsWith('hi');

    if (isHindi) {
      utterance.lang = 'hi-IN';
      const hindiVoice = voices.find(v => v.lang.toLowerCase().includes('hi'));
      if (hindiVoice) utterance.voice = hindiVoice;
    } else {
      utterance.lang = 'en-IN';
      const indianVoice = voices.find(v => v.lang.toLowerCase().includes('en-in')) ||
                          voices.find(v => v.lang.toLowerCase().startsWith('en'));
      if (indianVoice) utterance.voice = indianVoice;
    }

    utterance.rate = isHindi ? 0.92 : 0.96;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      if (isMountedRef.current) {
        setSpeaking(true);
      }
    };

    utterance.onend = () => {
      if (isMountedRef.current) {
        setSpeaking(false);
      }
    };

    utterance.onerror = (e) => {
      // Abort is normal when canceled or interrupted
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e.error);
      }
      if (isMountedRef.current) {
        setSpeaking(false);
      }
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis speak failed:', err);
      if (isMountedRef.current) {
        setSpeaking(false);
      }
    }
  }, [isSupported]);

  return {
    isSupported,
    speaking,
    speak,
    stop,
  };
};
