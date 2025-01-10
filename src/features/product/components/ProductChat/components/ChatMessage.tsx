// src/features/product/components/ProductChat/components/ChatMessage.tsx

import React from 'react';

interface AssistantInfo {
  name: string;
  title: string;
}

interface ChatMessageProps {
  message: string | React.ReactNode;
  timestamp: string;
  isUser?: boolean;
  assistant?: AssistantInfo;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  timestamp, 
  isUser,
  assistant 
}) => {
  const renderContent = () => {
    if (!message) return null;
    
    if (React.isValidElement(message)) {
      return message;
    }

    const messageStr = String(message);
    
    if (messageStr.includes('<strong>')) {
      return <div dangerouslySetInnerHTML={{ __html: messageStr }} />;
    }

    const lines = messageStr.split('\n');
    return lines.map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`${isUser ? 'ml-12' : 'mr-8'} ${isUser ? 'max-w-[70%]' : 'max-w-[85%]'}`}>
        <div
          className={`p-4 ${
            isUser 
              ? 'bg-[#FF7E93] text-white rounded-[20px] rounded-tr-sm' 
              : 'bg-white text-gray-800 rounded-[20px] rounded-tl-sm'
          }`}
        >
          {!isUser && assistant && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-[#132D5D]">{assistant.name}</span>
              <span className="text-sm px-2 py-0.5 bg-[#F0F2F5] text-gray-600 rounded-full">
                {assistant.title}
              </span>
            </div>
          )}
          <div className="leading-relaxed text-[15px] whitespace-pre-line">
            {renderContent()}
          </div>
          <div className="text-[11px] opacity-60 text-right mt-2">
            {timestamp}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;