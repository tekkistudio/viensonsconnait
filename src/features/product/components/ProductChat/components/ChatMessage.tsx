// src/features/product/components/ProductChat/components/ChatMessage.tsx
import React from 'react';
import OrderSummaryMessage from '@/features/order/components/OrderSummaryMessage';
import { PaymentMessageHandler } from './PaymentMessageHandler';
import type { PaymentMessageData } from '@/types/payment';
import { useChatContext } from '../../../context/ChatContext';
import { MessageType } from '@/features/product/types/chat';
import type { 
  OrderSummary,
  PaymentAmount,
  OrderSummaryMessageProps as OrderSummaryProps
} from '@/features/order/types/order';

interface AssistantInfo {
  name: string;
  title: string;
}

interface BaseMessageContent {
  text: string;
  choices?: string[];
}

interface PaymentMetadata {
  paymentStatus?: 'success' | 'failed' | 'processing';
  transactionId?: string;
  amount?: number;
}

interface OrderSummaryMetadata {
  orderSummary: {
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      price: number;
      totalPrice: number;
    }>;
    customerInfo: {
      firstName: string;
      lastName: string;
      country: string;
      city: string;
      address: string;
      phone: string;
    };
    subtotal: number;
    deliveryCost: number;
    total: number;
    formatted: string;
  };
}

interface ChatMessageProps {
  message: string | React.ReactNode | PaymentMessageData | BaseMessageContent;
  timestamp: string;
  isUser?: boolean;
  assistant?: AssistantInfo;
  type?: MessageType;
  metadata?: PaymentMetadata & OrderSummaryMetadata & Record<string, any>;
  choices?: string[];
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  timestamp,
  isUser,
  assistant,
  type,
  metadata,
  choices
}) => {
  const { handleUserChoice } = useChatContext();

  const renderContent = () => {
    if (!message) return null;

    // Si c'est un message de type récapitulatif de commande
    if (type === 'order-summary' && metadata?.orderSummary) {
      const formattedSummary: OrderSummary = {
        items: metadata.orderSummary.items,
        customerInfo: metadata.orderSummary.customerInfo,
        subtotal: {
          value: metadata.orderSummary.subtotal,
          formatted: `${metadata.orderSummary.subtotal.toLocaleString()} FCFA`,
          originalInFCFA: metadata.orderSummary.subtotal
        },
        deliveryCost: {
          value: metadata.orderSummary.deliveryCost,
          formatted: `${metadata.orderSummary.deliveryCost.toLocaleString()} FCFA`,
          originalInFCFA: metadata.orderSummary.deliveryCost
        },
        total: {
          value: metadata.orderSummary.total,
          formatted: metadata.orderSummary.formatted,
          originalInFCFA: metadata.orderSummary.total
        },
        formatted: metadata.orderSummary.formatted
      };
      
      return (
        <OrderSummaryMessage
          summary={formattedSummary}
          onConfirm={() => handleUserChoice("Oui, c'est correct")}
          onModify={() => handleUserChoice("Non, je veux modifier")}
        />
      );
    }

    // Si c'est un message de type paiement
    if (type === 'payment-request' && typeof message === 'object' && 'amount' in (message as PaymentMessageData)) {
      return <PaymentMessageHandler data={message as PaymentMessageData} />;
    }

    // Pour les éléments React
    if (React.isValidElement(message)) {
      return message;
    }

    // Pour les messages avec contenu structuré
    if (typeof message === 'object' && 'text' in (message as BaseMessageContent)) {
      const { text } = message as BaseMessageContent;
      if (text.includes('<strong>')) {
        return <div dangerouslySetInnerHTML={{ __html: text }} />;
      }
      return text;
    }

    // Pour les messages textuels
    const messageStr = String(message);
    if (messageStr.includes('<strong>')) {
      return <div dangerouslySetInnerHTML={{ __html: messageStr }} />;
    }

    // Pour les messages avec retours à la ligne
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
          {choices && choices.length > 0 && type === 'user-choices' && (
            <div className="flex flex-wrap gap-2 mt-3">
              {choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUserChoice(choice)}
                  className="bg-white border border-[#FF7E93] text-[#FF7E93] rounded-full px-4 py-2 
                    hover:bg-[#FF7E93] hover:text-white transition-colors text-sm"
                >
                  {choice}
                </button>
              ))}
            </div>
          )}
          <div className="text-[11px] opacity-60 text-right mt-2">
            {timestamp}
          </div>
          
          {metadata?.paymentStatus && (
            <div className={`mt-2 p-2 rounded text-sm ${
              metadata.paymentStatus === 'success' 
                ? 'bg-green-50 text-green-700'
                : metadata.paymentStatus === 'failed'
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {metadata.paymentStatus === 'success' && '✅ Paiement confirmé'}
              {metadata.paymentStatus === 'failed' && '❌ Échec du paiement'}
              {metadata.paymentStatus === 'processing' && '⏳ Paiement en cours'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;