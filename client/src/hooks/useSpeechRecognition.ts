import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API types
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: 'not-allowed' | 'no-speech' | 'network' | 'not-supported' | 'aborted' | string | null;
  startListening: (langCode?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (onTranscriptChange?: (text: string) => void): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const onTranscriptChangeRef = useRef(onTranscriptChange);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  const isSupported = typeof window !== 'undefined' && Boolean(
    (window as unknown as IWindow).SpeechRecognition ||
    (window as unknown as IWindow).webkitSpeechRecognition
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup abort errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (isMountedRef.current) {
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback((langCode: string = 'en-IN') => {
    if (isMountedRef.current) {
      setError(null);
      setInterimTranscript('');
    }

    if (!isSupported) {
      if (isMountedRef.current) setError('not-supported');
      return;
    }

    try {
      // Abort any existing session
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const SpeechRecognition = (window as unknown as IWindow).SpeechRecognition || (window as unknown as IWindow).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langCode;

      recognition.onstart = () => {
        if (isMountedRef.current) {
          setIsListening(true);
          setError(null);
        }
      };

      recognition.onresult = (event: any) => {
        let finalAccumulated = '';
        let interimAccumulated = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalAccumulated += (item[0]?.transcript || '') + ' ';
          } else {
            interimAccumulated += item[0]?.transcript || '';
          }
        }

        const trimmedFinal = finalAccumulated.trim();
        if (isMountedRef.current) {
          if (trimmedFinal) {
            setTranscript(trimmedFinal);
            onTranscriptChangeRef.current?.(trimmedFinal);
          }
          setInterimTranscript(interimAccumulated);
        }
      };

      recognition.onerror = (event: any) => {
        const errType = event.error;
        if (isMountedRef.current) {
          // 'no-speech' is non-fatal if continuous
          if (errType !== 'no-speech') {
            setError(errType);
            setIsListening(false);
          }
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current) {
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || 'Failed to start microphone');
        setIsListening(false);
      }
    }
  }, [isSupported]);

  const resetTranscript = useCallback(() => {
    if (isMountedRef.current) {
      setTranscript('');
      setInterimTranscript('');
    }
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};
