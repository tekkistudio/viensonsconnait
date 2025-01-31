// components/conversations/ChatArea.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Message, Conversation } from '@/types/conversations';

interface ChatAreaProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  className?: string;
}

export function ChatArea({
  conversation,
  messages,
  onSendMessage,
  className
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(newMessage);
      setNewMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Zone de messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.sender_type === 'customer' ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-lg p-3",
                  message.sender_type === 'customer'
                    ? "bg-gray-100 dark:bg-gray-800"
                    : message.sender_type === 'assistant'
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "bg-brand-blue text-white"
                )}
              >
                {message.sender_type === 'assistant' && (
                  <div className="flex items-center gap-1 mb-1 text-xs text-gray-500 dark:text-gray-400">
                    <Bot className="w-3 h-3" />
                    Assistant IA
                  </div>
                )}
                
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
                
                <div className="mt-1 text-xs opacity-60">
                  {format(new Date(message.created_at), 'HH:mm')}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Zone de saisie */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Votre message..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}