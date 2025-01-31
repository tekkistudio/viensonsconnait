// src/components/admin/conversations/AIConversationAnalysis.tsx
import React, { useEffect, useState } from 'react';
import {
  BrainCircuit,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Bot,
  User
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Message {
  id: string;
  content: string;
  sender_type: 'customer' | 'assistant' | 'admin';
  created_at: string;
  metadata?: {
    intent?: string;
    sentiment?: number;
  } | null;
}

interface MessageIndicatorProps {
  type: 'customer' | 'assistant' | 'admin';
  content: string;
}

const MessageIndicator: React.FC<MessageIndicatorProps> = ({ type, content }) => (
  <div className={`flex items-start gap-2 mb-2 ${
    type === 'customer' ? 'justify-start' : 'justify-end'
  }`}>
    <div className={`p-2 rounded-lg max-w-[80%] ${
      type === 'customer' 
        ? 'bg-gray-50 dark:bg-gray-800' 
        : type === 'assistant'
        ? 'bg-blue-50 dark:bg-blue-900/20'
        : 'bg-brand-blue text-white'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {type === 'assistant' ? (
          <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
        <span className="text-sm font-medium">
          {type === 'assistant' ? 'Assistant IA' : type === 'customer' ? 'Client' : 'Admin'}
        </span>
      </div>
      <p className="text-sm">{content}</p>
    </div>
  </div>
);

interface AIConversationAnalysisProps {
  conversation: Message[];
  onImproveResponse: (messageId: string) => void;
  onFlagIssue: (messageId: string) => void;
  onApproveResponse: (messageId: string) => void;
}

const AIConversationAnalysis: React.FC<AIConversationAnalysisProps> = ({
  conversation,
  onImproveResponse,
  onFlagIssue,
  onApproveResponse
}) => {
  const [analysis, setAnalysis] = useState({
    sentiment: 0,
    understanding: 0,
    helpfulness: 0,
  });

  useEffect(() => {
    analyzeConversation();
  }, [conversation]);

  const analyzeConversation = () => {
    // Logique d'analyse - à personnaliser selon tes besoins
    setAnalysis({
      sentiment: 0.8,
      understanding: 0.9,
      helpfulness: 0.85,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BrainCircuit className="w-5 h-5" />
          Analyse de la conversation
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Compréhension</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${analysis.understanding * 100}%` }}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Efficacité</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${analysis.helpfulness * 100}%` }}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Satisfaction client</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full" 
                style={{ width: `${analysis.sentiment * 100}%` }}
              />
            </div>
          </Card>
        </div>

        <div className="flex gap-2 mt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onApproveResponse(conversation[conversation.length - 1]?.id)}
                className="text-green-600 border-green-600"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Approuver la réponse
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Marquer cette réponse comme exemplaire
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onImproveResponse(conversation[conversation.length - 1]?.id)}
                className="text-blue-600 border-blue-600"
              >
                <BrainCircuit className="w-4 h-4 mr-2" />
                Suggérer une amélioration
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Proposer une meilleure réponse
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onFlagIssue(conversation[conversation.length - 1]?.id)}
                className="text-red-600 border-red-600"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Signaler un problème
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Signaler une réponse incorrecte ou inappropriée
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="mt-6 space-y-4">
          {conversation.map((message) => (
            <MessageIndicator
              key={message.id}
              type={message.sender_type}
              content={message.content}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIConversationAnalysis;