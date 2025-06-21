// src/features/product/components/ProductChat/components/ChatInput.tsx - MICRO ACTIVÉ ET BORDURES
import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { SpeechRecognition } from '@/types/speech';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  disabled?: boolean;
  isMobile?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onKeyDown,
  onSend,
  disabled = false,
  isMobile = false,
  placeholder = "Tapez votre message..."
}) => {
  // ✅ États pour la reconnaissance vocale
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  // ✅ Initialisation de la reconnaissance vocale
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsVoiceSupported(true);
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'fr-FR';
        
        recognitionInstance.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          // Créer un événement artificiel pour onChange
          const syntheticEvent = {
            target: { value: transcript }
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
          setIsListening(false);
        };
        
        recognitionInstance.onend = () => {
          setIsListening(false);
        };
        
        recognitionInstance.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        setRecognition(recognitionInstance);
      }
    }
  }, [onChange]);

  // ✅ Fonction pour gérer la reconnaissance vocale
  const toggleVoiceInput = useCallback(() => {
    if (!isVoiceSupported || !recognition || disabled) return;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognition.start();
    }
  }, [isVoiceSupported, recognition, isListening, disabled]);

  return (
    <div className={`bg-white border-t-2 border-gray-100 shadow-md ${isMobile ? '' : 'px-4 py-3'}`}>
      <div className={`${isMobile ? 'px-4 py-3' : ''}`}>
        <div className="relative flex items-center">
          {/* ✅ Input avec bordures améliorées */}
          <input
            type="text"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-3 bg-[#F0F2F5] text-gray-800 rounded-full pr-24 
                     focus:outline-none focus:ring-2 focus:ring-[#FF7E93] focus:border-transparent 
                     disabled:opacity-50 disabled:cursor-not-allowed 
                     border-2 border-gray-200 hover:border-gray-300
                     transition-all duration-200"
          />
          
          {/* ✅ Boutons avec designs améliorés */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* ✅ Bouton micro ACTIVÉ */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={disabled}
              className={`p-2 rounded-full transition-all duration-200 ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                  : isVoiceSupported && !disabled
                    ? 'text-gray-500 hover:text-[#FF7E93] hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200'
                    : 'text-gray-400 cursor-not-allowed'
              }`}
              title={
                !isVoiceSupported 
                  ? 'Reconnaissance vocale non supportée dans ce navigateur' 
                  : isListening 
                    ? 'Arrêter l\'écoute'
                    : 'Appuyez pour parler'
              }
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            {/* ✅ Bouton envoi avec design amélioré */}
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim() || disabled}
              className={`p-2 rounded-full transition-all duration-200 ${
                value.trim() && !disabled
                  ? 'text-[#FF7E93] hover:text-white hover:bg-[#FF7E93] hover:shadow-md border border-transparent hover:border-[#FF7E93]' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title={disabled ? 'Traitement en cours...' : 'Envoyer le message (Entrée)'}
            >
              {disabled ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-[#FF7E93] rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* ✅ Indicateur vocal */}
        {isListening && (
          <div className="mt-2 flex items-center justify-center gap-2 text-red-500 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>Parlez maintenant...</span>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          </div>
        )}

        {/* ✅ Aide contextuelle */}
        {!isVoiceSupported && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            💡 Astuce : Utilisez Entrée pour envoyer rapidement
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInput;