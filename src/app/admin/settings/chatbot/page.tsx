// src/app/admin/settings/chatbot/page.tsx
'use client';

import { useState, useEffect } from "react";
import {
  Bot,
  MessageSquare,
  Settings2,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/admin/AuthProvider';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";

// Variables disponibles pour les messages
const availableVariables = [
  { name: 'bot_name', description: 'Nom du chatbot' },
  { name: 'bot_role', description: 'Rôle du chatbot' },
  { name: 'product_name', description: 'Nom du produit' },
  { name: 'product_description', description: 'Description du produit' },
  { name: 'game_rules', description: 'Règles du jeu' },
  { name: 'testimonials', description: 'Témoignages des clients' },
  { name: 'price', description: 'Prix du produit' }
];

interface ChatbotSettings {
  id?: string;
  store_id: string;
  bot_name: string;
  bot_role: string;
  welcome_message: string;
  initial_message_template: string;
  avatar_url?: string;
  primary_color: string;
  is_active: boolean;
  messages?: ChatbotMessage[];
  created_at?: string;
  updated_at?: string;
}

interface ChatbotMessage {
  id: string;
  scenario: string;
  choice_text: string;
  response_template: string;
  next_choices: string[];
  order_index: number;
  is_active: boolean;
  requires_variables?: string[];
}

export default function ChatbotSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
  
      // Double vérification de la session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error('Erreur lors de la récupération de la session');
      }
      if (!session) {
        throw new Error('Session non trouvée');
      }
  
      // Double vérification de l'utilisateur
      if (!user || !user.store_id) {
        throw new Error('Données utilisateur invalides');
      }
  
      console.log('Session utilisateur:', session.user.id);
      console.log('Store ID:', user.store_id);
  
      // Récupération des paramètres existants
      const { data: existingSettings, error: fetchError } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('store_id', user.store_id)
        .maybeSingle();
  
      if (fetchError) {
        throw new Error(`Erreur de récupération: ${fetchError.message}`);
      }
  
      if (!existingSettings) {
        // Création des paramètres par défaut
        const defaultSettings = {
          store_id: user.store_id,
          bot_name: "Assistant",
          bot_role: "Assistant commercial",
          welcome_message: "Bonjour ! Comment puis-je vous aider ?",
          initial_message_template: "Je suis là pour répondre à vos questions.",
          primary_color: "#FF7E93",
          is_active: true,
          user_id: session.user.id // Ajout de l'ID utilisateur
        };
  
        const { data: newSettings, error: createError } = await supabase
          .from('chatbot_settings')
          .insert([defaultSettings])
          .select()
          .single();
  
        if (createError) {
          throw new Error(`Erreur de création: ${createError.message}`);
        }
  
        setSettings(newSettings);
        toast({
          title: "Succès",
          description: "Paramètres initiaux créés",
        });
      } else {
        setSettings(existingSettings);
      }
    } catch (error) {
      console.error("Erreur complète:", error);
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setError(message);
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Si encore en chargement, ne rien faire
        if (authLoading) {
          return;
        }
  
        // Si pas authentifié, afficher l'erreur
        if (!isAuthenticated || !user) {
          setError('Vous devez être connecté pour accéder à cette page');
          return;
        }
  
        // Vérifier que l'utilisateur a un store_id
        if (!user.store_id) {
          setError('Aucune boutique associée à cet utilisateur');
          return;
        }
  
        // Attendre que la session soit prête
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error('Erreur de session:', sessionError);
          throw new Error('Session non disponible');
        }
  
        // Une fois tout vérifié, charger les paramètres
        await fetchSettings();
  
      } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        setError(message);
      }
    };
  
    initializeSettings();
  }, [isAuthenticated, user, authLoading]);

  const addMessage = () => {
    if (!settings) return;

    const newMessage: ChatbotMessage = {
      id: `temp-${Date.now()}`,
      scenario: "initial",
      choice_text: "",
      response_template: "",
      next_choices: [],
      order_index: settings.messages?.length || 0,
      is_active: true,
      requires_variables: []
    };

    setSettings({
      ...settings,
      messages: [...(settings.messages || []), newMessage],
    });
  };

  const removeMessage = async (id: string) => {
    if (!settings) return;

    try {
      if (!id.startsWith('temp-')) {
        const { error } = await supabase
          .from('chatbot_messages')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      setSettings({
        ...settings,
        messages: settings.messages?.filter((m) => m.id !== id) || [],
      });

      toast({
        title: "Succès",
        description: "Message supprimé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  const updateMessage = (id: string, field: keyof ChatbotMessage, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      messages: settings.messages?.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ) || [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !user?.store_id) return;

    try {
      setIsSaving(true);
      
      const { error: updateError } = await supabase
        .from('chatbot_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Erreur de sauvegarde:', updateError);
        throw updateError;
      }

      toast({
        title: "Succès",
        description: "Les paramètres ont été sauvegardés",
      });

      await fetchSettings();
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Conditions de rendu avec gestion de l'état d'authentification
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Vous devez être connecté pour accéder à cette page
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Impossible de charger les paramètres du chatbot
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Configuration du Chatbot
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Personnalisez votre chatbot et définissez ses réponses prédéfinies
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Paramètres généraux */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Paramètres généraux
              </h2>
            </div>
            <Switch
              checked={settings.is_active}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, is_active: checked })
              }
            />
          </div>

          <div className="space-y-4">
            {/* Nom du chatbot */}
            <div>
              <Label htmlFor="bot_name">Nom du chatbot</Label>
              <Input
                id="bot_name"
                value={settings.bot_name}
                onChange={(e) => 
                  setSettings({ ...settings, bot_name: e.target.value })
                }
                className="mt-1"
              />
            </div>

            {/* Rôle */}
            <div>
              <Label htmlFor="bot_role">Rôle</Label>
              <Input
                id="bot_role"
                value={settings.bot_role}
                onChange={(e) => 
                  setSettings({ ...settings, bot_role: e.target.value })
                }
                className="mt-1"
              />
            </div>

            {/* Message de bienvenue */}
            <div>
              <Label htmlFor="welcome_message">Message de bienvenue</Label>
              <Textarea
                id="welcome_message"
                value={settings.welcome_message}
                onChange={(e) => 
                  setSettings({ ...settings, welcome_message: e.target.value })
                }
                rows={2}
                className="mt-1"
              />
              <p className="mt-1 text-sm text-gray-500">
                Variables disponibles : {availableVariables.map(v => `{${v.name}}`).join(', ')}
              </p>
            </div>

            {/* Message initial */}
            <div>
              <Label htmlFor="initial_message">Message initial</Label>
              <Textarea
                id="initial_message"
                value={settings.initial_message_template}
                onChange={(e) => 
                  setSettings({ 
                    ...settings, 
                    initial_message_template: e.target.value 
                  })
                }
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Messages prédéfinis */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Messages prédéfinis
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addMessage}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter un message
            </Button>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {settings.messages?.map((message, index) => (
              <AccordionItem
                key={message.id}
                value={message.id}
                className="border rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={message.is_active}
                        onCheckedChange={(checked) => 
                          updateMessage(message.id, "is_active", checked)
                        }
                      />
                      <span className="font-medium">
                        {message.choice_text || "Nouveau message"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMessage(message.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <AccordionContent className="pt-4">
                  <div className="space-y-4">
                    {/* Texte du choix */}
                    <div>
                      <Label htmlFor={`choice-${message.id}`}>
                        Texte du choix
                      </Label>
                      <Input
                        id={`choice-${message.id}`}
                        value={message.choice_text}
                        onChange={(e) => 
                          updateMessage(
                            message.id, 
                            "choice_text", 
                            e.target.value
                          )
                        }
                        className="mt-1"
                        placeholder="Ex: Je veux en savoir plus"
                      />
                    </div>

                    {/* Réponse */}
                    <div>
                      <Label htmlFor={`response-${message.id}`}>
                        Réponse
                      </Label>
                      <Textarea
                        id={`response-${message.id}`}
                        value={message.response_template}
                        onChange={(e) => 
                          updateMessage(
                            message.id, 
                            "response_template", 
                            e.target.value
                          )
                        }
                        rows={4}
                        className="mt-1"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Variables disponibles : {availableVariables.map(v => `{${v.name}}`).join(', ')}
                      </p>
                    </div>

                    {/* Choix suivants */}
                    <div>
                      <Label htmlFor={`next-choices-${message.id}`}>
                        Choix suivants
                      </Label>
                      <Textarea
                        id={`next-choices-${message.id}`}
                        value={message.next_choices.join('\n')}
                        onChange={(e) => 
                          updateMessage(
                            message.id, 
                            "next_choices", 
                            e.target.value.split('\n').filter(Boolean)
                          )
                        }
                        rows={3}
                        className="mt-1"
                        placeholder="Un choix par ligne"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        {/* Apparence */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Apparence
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Avatar du chatbot */}
            <div>
              <Label htmlFor="avatar_url">URL de l'avatar</Label>
              <Input
                id="avatar_url"
                type="text"
                value={settings.avatar_url || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  avatar_url: e.target.value
                })}
                className="mt-1"
                placeholder="/images/avatar.png"
              />
            </div>

            {/* Couleur primaire */}
            <div>
              <Label htmlFor="primary_color">Couleur primaire</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="color"
                  id="primary_color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({
                    ...settings,
                    primary_color: e.target.value
                  })}
                  className="w-12 h-12 p-1 rounded-lg"
                />
                <Input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({
                    ...settings,
                    primary_color: e.target.value
                  })}
                  className="flex-1"
                  placeholder="#FF7E93"
                />
              </div>
            </div>

            {/* Prévisualisation */}
            <div className="col-span-full">
              <Label>Prévisualisation</Label>
              <div className="mt-2 p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  {settings.avatar_url && (
                    <img
                      src={settings.avatar_url}
                      alt="Avatar du chatbot"
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div
                    className="p-3 rounded-lg max-w-[80%]"
                    style={{
                      backgroundColor: settings.primary_color,
                      color: '#FFFFFF'
                    }}
                  >
                    <p className="text-sm font-medium">{settings.bot_name}</p>
                    <p className="text-xs opacity-75">{settings.bot_role}</p>
                    <p className="mt-1">{settings.welcome_message}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Sauvegarder les modifications
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}