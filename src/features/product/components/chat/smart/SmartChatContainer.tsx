// src/features/product/components/chat/smart/SmartChatContainer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic } from 'lucide-react';
import type { ChatMessage } from '../../../../../types/chat';
import { useChatContext } from '../../../context/ChatContext';
import { ProductRecommendation } from '@/types/order';

interface MessageGroupProps {
  message: ChatMessage;
  onChoice: (choice: string) => void;
}

const renderContent = (content: string): React.ReactNode => {
  if (content.includes('<strong>')) {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return <>{content}</>;
};

const MessageGroup: React.FC<MessageGroupProps> = ({ message, onChoice }) => {
  const shouldRenderChoices = message.type === 'assistant' && message.choices && message.choices.length > 0;
  
  const getMessageContent = (message: ChatMessage): React.ReactNode => {
    if (!message.content) return null;
  
    if (typeof message.content === 'string') {
      return renderContent(message.content);
    }
    if (React.isValidElement(message.content)) {
      return message.content;
    }
    if (typeof message.content === 'object' && 'text' in message.content) {
      return renderContent(message.content.text);
    }
    return String(message.content);
  };
  
  const isAppRecommendation = (rec: string | ProductRecommendation): boolean => {
    if (typeof rec === 'string') {
      return rec === 'mobile-app';
    }
    return rec.recommendationType === 'mobile-app' || rec.category === 'mobile-app';
  };
  
  return (
    <div className="space-y-2">
      {message.content && (
        <div className={`p-4 rounded-lg max-w-[85%] ${
          message.type === 'user' 
            ? 'bg-brand-pink text-white ml-auto rounded-br-none' 
            : 'bg-white shadow-sm mr-auto rounded-tl-none'
        }`}>
          {message.type === 'assistant' && message.assistant && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-900">{message.assistant.name}</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {message.assistant.title}
              </span>
            </div>
          )}
          
          <div className="space-y-2 text-brand-blue">
            {getMessageContent(message)}
          </div>
          
          {message.metadata?.recommendations?.some(isAppRecommendation) && (
            <div className="mt-4 p-4 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
              <h4 className="font-medium text-brand-blue mb-2">
                💡 Découvrez notre application mobile !
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Accédez à tous nos jeux depuis votre smartphone, même hors connexion.
              </p>
              <div className="flex gap-2">
                <a
                  href="https://apps.apple.com/app/viensonsconnait"
                  className="text-xs px-3 py-1.5 bg-brand-blue text-white rounded-full hover:bg-brand-blue/90"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  App Store
                </a>
              </div>
            </div>
          )}
        </div>
      )}
      
      {shouldRenderChoices && message.choices && (
        <div className="flex flex-wrap gap-2 mt-3">
          {message.choices.map((choice, idx) => (
            <button
              key={`${choice}-${idx}`}
              onClick={() => onChoice(choice)}
              className="bg-white border border-brand-pink text-brand-pink rounded-full px-4 py-2 
                text-sm hover:bg-brand-pink hover:text-white transition-colors
                active:scale-95 transform duration-100"
            >
              {choice}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SmartChatContainer: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    isTyping, 
    sendMessage, 
    handleUserChoice 
  } = useChatContext();

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    sendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatRef}>
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={`${message.type}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageGroup 
                message={message} 
                onChoice={handleUserChoice} 
              />
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex space-x-1 bg-white p-3 rounded-lg w-16"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                  animate={{ y: [0, -3, 0] }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.15
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t bg-white">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message..."
            className="w-full px-4 py-2 bg-gray-50 rounded-full pr-24 
              focus:outline-none focus:ring-2 focus:ring-brand-pink/20"
          />
          <div className="absolute right-2 flex items-center gap-2">
            <button
              type="button"
              disabled
              className="p-2 text-gray-400 cursor-not-allowed"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className={`p-2 ${
                inputMessage.trim()
                  ? 'text-brand-pink hover:text-brand-blue'
                  : 'text-gray-400'
              } transition-colors`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartChatContainer;