// src/features/product/components/ProductChat/components/ChatInput.tsx

import React from 'react';
import { Mic, Send } from 'lucide-react';

interface ChatInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onSend: () => void;
    isMobile?: boolean;
  }
  
  const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onKeyDown,
    onSend,
    isMobile
  }) => {
    return (
      <div className={`px-4 py-3 bg-white ${isMobile ? 'border-t' : ''}`}>
        <div className="relative flex items-center">
          <input
            type="text"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Tapez votre message..."
            className="w-full px-4 py-2 bg-[#F0F2F5] text-gray-800 rounded-full pr-24 focus:outline-none"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-gray-400 cursor-not-allowed"
              disabled
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim()}
              className={`p-2 ${
                value.trim() 
                  ? 'text-[#FF7E93] hover:text-[#132D5D]' 
                  : 'text-gray-400'
              } transition-colors`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

export default ChatInput;