// src/components/global/FloatingAssistant.tsx
'use client';
import { AIManager } from '@/lib/services/AIManager';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useTheme } from '@/core/theme/AdminThemeProvider';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface Message {
  id: number;
  content: string;
  type: 'assistant' | 'user';
  timestamp: Date;
  context?: {
    page: string;
    data?: any;
  };
  insights?: string[];
  actions?: string[];
  suggestions?: string[];
}

interface PageContext {
  page: string;
  data?: any;
}

const initialSuggestions = [
  "Analyser mes performances d'aujourd'hui",
  "Voir les meilleures ventes de la semaine",
  "Améliorer ma stratégie marketing",
  "Conseils pour fidéliser mes clients"
];

const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const getWelcomeMessage = (firstName: string): string => {
  const hour = new Date().getHours();
  let greeting = '';
  
  if (hour >= 5 && hour < 12) {
    greeting = 'Bonjour';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Bon après-midi';
  } else {
    greeting = 'Bonsoir';
  }

  return `${greeting} ${capitalizeFirstLetter(firstName)} ! En quoi puis-je vous aider aujourd'hui ?`;
};

export default function FloatingAssistant() {
  const { actualTheme } = useTheme();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [user, setUser] = useState<{ firstName: string; email: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: user?.firstName ? getWelcomeMessage(user.firstName) : "Un instant...",
      type: 'assistant',
      timestamp: new Date(),
      suggestions: initialSuggestions
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', session.user.id)
            .single();

          if (userData && !error) {
            setUser({
              firstName: userData.name.split(' ')[0],
              email: userData.email
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (user?.firstName) {
      setMessages([{
        id: 1,
        content: getWelcomeMessage(user.firstName),
        type: 'assistant',
        timestamp: new Date(),
        suggestions: initialSuggestions
      }]);
    }
  }, [user?.firstName]);

  // Nouvelle fonction sendMessage
  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;
  
    const context = await getCurrentPageContext();
    
    // Créer le message utilisateur
    const userMessage: Message = {
      id: Date.now(),
      content: messageContent,
      type: 'user',
      timestamp: new Date(),
      context: context
    };
  
    try {
      setMessages(prev => [...prev, userMessage]);
      setMessage('');
      setIsTyping(true);
  
      // Utiliser AIManager pour obtenir la réponse
      const aiManager = AIManager.getInstance();
      const aiResponse = await aiManager.handleDashboardAssistant(
        messageContent,
        context
      );
  
      // Créer le message de l'assistant
      const assistantMessage: Message = {
        id: Date.now() + 1,
        content: aiResponse.content,
        type: 'assistant',
        timestamp: new Date(),
        context: context,
        insights: aiResponse.insights,
        actions: aiResponse.actions,
        suggestions: aiResponse.suggestions
      };
  
      setMessages(prev => [...prev, assistantMessage]);
  
      // Sauvegarde dans Supabase
      try {
        const { error: supabaseError } = await supabase
          .from('chat_messages')
          .insert([{
            content: messageContent,
            response: JSON.stringify(aiResponse),
            type: 'dashboard',
            context: {
              page: context.page,
              data: JSON.stringify(context.data)
            },
            created_at: new Date().toISOString()
          }]);
  
        if (supabaseError) {
          console.error('Supabase Insert Error:', supabaseError);
        }
      } catch (supabaseError) {
        console.error('Supabase Error:', supabaseError);
      }
  
    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: Message = {
        id: Date.now() + 1,
        content: "Je suis désolé, je rencontre actuellement des difficultés techniques. Vos messages sont bien reçus, mais je ne peux pas les sauvegarder pour le moment. Je reste à votre disposition pour continuer notre conversation.",
        type: 'assistant',
        timestamp: new Date(),
        suggestions: ["Réessayer", "Contacter le support"]
      };
  
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Note",
        description: "La conversation continue mais certaines données ne seront pas sauvegardées",
        variant: "default"
      });
    } finally {
      setIsTyping(false);
    }
  };

  const getCurrentPageContext = async (): Promise<PageContext> => {
    try {
      const currentDate = new Date();
      const yesterdayDate = new Date(currentDate);
      yesterdayDate.setDate(currentDate.getDate() - 1);

      switch (pathname) {
        case '/admin/dashboard': {
          const { data: salesData, error: salesError } = await supabase
            .from('orders')
            .select('total_amount, created_at')
            .gte('created_at', yesterdayDate.toISOString());

          if (salesError) throw salesError;

          const { data: conversationsData, error: convError } = await supabase
            .from('conversations')
            .select('status')
            .eq('status', 'active');

          if (convError) throw convError;

          return {
            page: 'Dashboard',
            data: {
              dailySales: salesData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
              salesCount: salesData?.length || 0,
              activeConversations: conversationsData?.length || 0,
            }
          };
        }

        case '/admin/orders': {
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('status')
            .order('created_at', { ascending: false })
            .limit(10);

          if (ordersError) throw ordersError;

          return {
            page: 'Orders',
            data: {
              recentOrders: ordersData || [],
              orderStatuses: ordersData?.reduce((acc: {[key: string]: number}, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
              }, {})
            }
          };
        }

        case '/admin/products': {
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('stock_quantity');

          if (productsError) throw productsError;

          const lowStockProducts = productsData?.filter(p => p.stock_quantity < 10).length || 0;

          return {
            page: 'Products',
            data: {
              totalProducts: productsData?.length || 0,
              lowStockAlert: lowStockProducts
            }
          };
        }

        case '/admin/marketing': {
          // Récupérer les données de marketing
          const { data: analyticsData, error: analyticsError } = await supabase
            .from('marketing_stats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

          if (analyticsError) throw analyticsError;

          return {
            page: 'Marketing',
            data: {
              ...analyticsData?.[0],
              lastUpdated: new Date().toISOString()
            }
          };
        }

        case '/admin/performance': {
          // Récupérer les données de performance
          const { data: performanceData, error: performanceError } = await supabase
            .from('monthly_stats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

          if (performanceError) throw performanceError;

          return {
            page: 'Performance',
            data: {
              ...performanceData?.[0],
              lastUpdated: new Date().toISOString()
            }
          };
        }

        default:
          return {
            page: pathname.replace('/admin/', '').charAt(0).toUpperCase() + 
                  pathname.slice(7).replace('/', ' '),
            data: null
          };
      }
    } catch (error) {
      console.error('Error getting page context:', error);
      return {
        page: pathname,
        data: null
      };
    }
  };

  // Version modifiée qui utilise sendMessage
  const handleSendMessage = async () => {
    if (message.trim()) {
      await sendMessage(message);
      setMessage(''); // Vider le champ de saisie après l'envoi
    }
  };

  return (
    <>
      {/* Bouton flottant avec bulle de message */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Bulle de message */}
          {showBubble && (
            <div className="absolute bottom-20 right-0 min-w-[250px] bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 animate-fade-in">
              <button 
                onClick={() => setShowBubble(false)}
                className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center space-x-3">
                <Image
                  src={actualTheme === 'dark'
                    ? '/images/logos/fav_dukka_white.svg'
                    : '/images/logos/fav_dukka.svg'}
                  alt="Assistant VOSC"
                  width={28}
                  height={28}
                />
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Besoin d'aide ? Je suis là !
                </p>
              </div>
            </div>
          )}

          {/* Bouton */}
          <Button
            onClick={() => {
              setIsOpen(true);
              setShowBubble(false);
            }}
            className="p-4 bg-[#2563EB] text-white rounded-full shadow-lg hover:bg-[#2563EB]/90 transition-all w-16 h-16 flex items-center justify-center"
            size="icon"
          >
            <Image
              src="/images/logos/fav_dukka_white.svg"
              alt="Assistant VOSC"
              width={40}
              height={40}
              className="w-10 h-10"
            />
          </Button>
        </div>
      )}

      {/* Interface de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col overflow-hidden border dark:border-gray-700 z-50"
          >
            {/* Header */}
            <div className="p-4 bg-[#2563EB] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/logos/fav_dukka_white.svg"
                    alt="Assistant VOSC"
                    width={28}
                    height={28}
                  />
                  <div>
                    <h3 className="font-semibold">Assistant Dukka</h3>
                    <p className="text-sm text-white">
                      Votre conseiller business personnel
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.type === 'user' && "justify-end"
                  )}
                >
                  {msg.type === 'assistant' && (
                    <div className="w-9 h-9 rounded-full bg-[#2563EB]/10 dark:bg-[#2563EB]/20 flex items-center justify-center">
                      <Image
                        src={actualTheme === 'dark'
                          ? '/images/logos/fav_dukka_white.svg'
                          : '/images/logos/fav_dukka.svg'}
                        alt="Assistant VOSC"
                        width={24}
                        height={24}
                      />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] space-y-3",
                    msg.type === 'assistant' 
                      ? "text-gray-800 dark:text-gray-200" 
                      : "text-white"
                  )}>
                    {/* Message principal */}
                    <div className={cn(
                      "rounded-2xl p-3",
                      msg.type === 'assistant' 
                        ? "bg-gray-100 dark:bg-gray-700" 
                        : "bg-[#2563EB]"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[11px] mt-1 text-gray-500 dark:text-gray-400">
                        {msg.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>

                    {/* Insights si disponibles */}
                    {msg.type === 'assistant' && msg.insights && msg.insights.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Points clés :</h4>
                        <ul className="space-y-2 text-blue-600 dark:text-blue-300">
                          {msg.insights.map((insight, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="mt-1">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions si disponibles */}
                    {msg.type === 'assistant' && msg.actions && msg.actions.length > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
                        <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Actions recommandées :</h4>
                        <ul className="space-y-2 text-green-600 dark:text-green-300">
                          {msg.actions.map((action, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="mt-1">✓</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggestions cliquables */}
                    {msg.type === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => sendMessage(suggestion)}
                            className="px-4 py-2 text-sm bg-white dark:bg-gray-600 
                                     rounded-full border border-gray-200 dark:border-gray-500 
                                     hover:bg-gray-50 dark:hover:bg-gray-500 
                                     transition-colors text-gray-700 dark:text-gray-200
                                     flex items-center gap-2"
                          >
                            <span className="w-4 h-4 flex items-center justify-center">
                              {index === 0 ? '🎯' : index === 1 ? '📸' : index === 2 ? '📱' : '💡'}
                            </span>
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.type === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-sm font-medium">
                      U
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">L'assistant analyse...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input avec micro */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-full p-2 pl-4 border dark:border-gray-600">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Posez vos questions..."
                  className="flex-1 px-4 py-2 bg-transparent text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-0 border-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
                <Button
                  title="Messages vocaux bientôt disponibles"
                  disabled
                  size="icon"
                  variant="ghost"
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  <Mic className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isTyping}
                  size="icon"
                  className={cn(
                    "rounded-full p-2",
                    message.trim() && !isTyping
                      ? "bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
                      : "bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500"
                  )}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
