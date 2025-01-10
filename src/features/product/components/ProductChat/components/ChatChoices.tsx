// src/features/product/components/ProductChat/components/ChatChoices.tsx
import React from 'react';

interface ChatChoicesProps {
  choices: string[];
  onChoiceSelect: (choice: string) => void;
}

const ChatChoices: React.FC<ChatChoicesProps> = ({ choices, onChoiceSelect }) => (
  <div className="flex flex-wrap gap-2">
    {choices.map((choice, index) => (
      <button
        key={index}
        onClick={() => onChoiceSelect(choice)}
        className="bg-white border border-[#FF7E93] text-[#FF7E93] rounded-full px-4 py-2 hover:bg-[#FF7E93] hover:text-white transition-colors text-sm"
      >
        {choice}
      </button>
    ))}
  </div>
);

export default ChatChoices;