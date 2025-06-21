// src/lib/services/SpeechRecognitionService.ts
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export class SpeechRecognitionService {
  private static instance: SpeechRecognitionService;
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onResultCallback?: (result: SpeechRecognitionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private onEndCallback?: () => void;

  private constructor() {
    this.initializeSpeechRecognition();
  }

  public static getInstance(): SpeechRecognitionService {
    if (!this.instance) {
      this.instance = new SpeechRecognitionService();
    }
    return this.instance;
  }

  // 🎤 INITIALISATION DE LA RECONNAISSANCE VOCALE
  private initializeSpeechRecognition(): void {
    if (typeof window === 'undefined') {
      console.warn('🔇 Speech Recognition not available on server side');
      return;
    }

    // Support pour différents navigateurs
    const SpeechRecognition = 
      window.SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('🔇 Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.configureSpeechRecognition();
  }

  // ⚙️ CONFIGURATION DE LA RECONNAISSANCE
  private configureSpeechRecognition(): void {
    if (!this.recognition) return;

    // Configuration par défaut
    this.recognition.lang = 'fr-FR'; // ✅ CORRIGÉ: utiliser 'lang' au lieu de 'language'
    this.recognition.continuous = false; // Une phrase à la fois
    this.recognition.interimResults = true; // Résultats en temps réel
    this.recognition.maxAlternatives = 1;

    // 🎯 GESTION DES ÉVÉNEMENTS
    this.recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      this.isListening = true;
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('🎤 Speech recognition result:', event);
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;

        console.log('🎤 Transcript:', { transcript, confidence, isFinal });

        if (this.onResultCallback) {
          this.onResultCallback({
            transcript,
            confidence: confidence || 0.5,
            isFinal
          });
        }

        // Si c'est un résultat final, arrêter l'écoute
        if (isFinal) {
          this.stopListening();
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('❌ Speech recognition error:', event.error);
      this.isListening = false;
      
      const errorMessage = this.getErrorMessage(event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
    };

    this.recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      this.isListening = false;
      
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
  }

  // 🎯 MÉTHODES PUBLIQUES
  public startListening(config?: SpeechRecognitionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech Recognition not available'));
        return;
      }

      if (this.isListening) {
        console.log('🎤 Already listening...');
        resolve();
        return;
      }

      // Appliquer la configuration si fournie
      if (config) {
        if (config.language) {
          this.recognition.lang = config.language;
        }
        if (config.continuous !== undefined) {
          this.recognition.continuous = config.continuous;
        }
        if (config.interimResults !== undefined) {
          this.recognition.interimResults = config.interimResults;
        }
        if (config.maxAlternatives) {
          this.recognition.maxAlternatives = config.maxAlternatives;
        }
      }

      try {
        this.recognition.start();
        resolve();
      } catch (error) {
        console.error('❌ Failed to start speech recognition:', error);
        reject(error);
      }
    });
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      console.log('🎤 Stopping speech recognition...');
      this.recognition.stop();
    }
  }

  public abort(): void {
    if (this.recognition) {
      console.log('🎤 Aborting speech recognition...');
      this.recognition.abort();
      this.isListening = false;
    }
  }

  // 📝 GESTION DES CALLBACKS
  public setOnResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }

  public setOnError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  public setOnEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  // 📊 STATUT
  public getIsListening(): boolean {
    return this.isListening;
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  // 🔧 UTILITAIRES
  private getErrorMessage(error: string): string {
    const errorMessages: { [key: string]: string } = {
      'no-speech': 'Aucun son détecté. Essayez de parler plus fort.',
      'audio-capture': 'Impossible d\'accéder au microphone.',
      'not-allowed': 'Permission du microphone refusée.',
      'network': 'Erreur réseau. Vérifiez votre connexion.',
      'service-not-allowed': 'Service de reconnaissance vocale indisponible.',
      'bad-grammar': 'Erreur de grammaire dans la reconnaissance.',
      'language-not-supported': 'Langue non supportée.',
      'aborted': 'Reconnaissance vocale interrompue.'
    };

    return errorMessages[error] || `Erreur inconnue: ${error}`;
  }

  // 🌍 GESTION DES LANGUES
  public setLanguage(language: 'fr-FR' | 'en-US' | 'wo-SN'): void {
    if (this.recognition) {
      this.recognition.lang = language;
      console.log(`🌍 Language set to: ${language}`);
    }
  }

  public getSupportedLanguages(): string[] {
    // Liste des langues supportées pour l'Afrique de l'Ouest
    return [
      'fr-FR', // Français
      'en-US', // Anglais
      'ar-SA', // Arabe
      'wo-SN'  // Wolof (si supporté)
    ];
  }

  // 🎛️ MÉTHODES AVANCÉES
  public configure(config: SpeechRecognitionConfig): void {
    if (!this.recognition) return;

    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined) {
        switch (key) {
          case 'language':
            this.recognition!.lang = value;
            break;
          case 'continuous':
            this.recognition!.continuous = value;
            break;
          case 'interimResults':
            this.recognition!.interimResults = value;
            break;
          case 'maxAlternatives':
            this.recognition!.maxAlternatives = value;
            break;
        }
      }
    });
  }

  // 🧹 NETTOYAGE
  public cleanup(): void {
    if (this.recognition) {
      this.abort();
      this.onResultCallback = undefined;
      this.onErrorCallback = undefined;
      this.onEndCallback = undefined;
    }
  }
}

import { SpeechRecognition, SpeechRecognitionErrorEvent, SpeechRecognitionEvent } from '@/types/speech';
// 🎤 HOOK REACT POUR LA RECONNAISSANCE VOCALE
import { useState, useEffect, useCallback } from 'react';

export interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  confidence: number;
  error: string | null;
  startListening: (config?: SpeechRecognitionConfig) => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [service] = useState(() => SpeechRecognitionService.getInstance());

  // 🎯 CONFIGURATION DES CALLBACKS
  useEffect(() => {
    service.setOnResult((result: SpeechRecognitionResult) => {
      setTranscript(result.transcript);
      setConfidence(result.confidence);
      setError(null);
    });

    service.setOnError((errorMessage: string) => {
      setError(errorMessage);
      setIsListening(false);
    });

    service.setOnEnd(() => {
      setIsListening(false);
    });

    return () => {
      service.cleanup();
    };
  }, [service]);

  // 📊 SYNCHRONISATION DU STATUT
  useEffect(() => {
    const interval = setInterval(() => {
      setIsListening(service.getIsListening());
    }, 100);

    return () => clearInterval(interval);
  }, [service]);

  // 🎤 MÉTHODES EXPOSÉES
  const startListening = useCallback(async (config?: SpeechRecognitionConfig) => {
    try {
      setError(null);
      await service.startListening(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, [service]);

  const stopListening = useCallback(() => {
    service.stopListening();
  }, [service]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  return {
    transcript,
    isListening,
    isSupported: service.isSupported(),
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
}