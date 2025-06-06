// src/app/admin/settings/assistant/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  MessageSquare,
  Settings2,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";

interface Prompt {
  id: string;
  scenario: string;
  content: string;
  isActive: boolean;
}

interface AssistantSettings {
  id: string;
  name: string;
  personality: string;
  tone: string;
  language: string;
  model: string;
  temperature: number;
  maxTokens: number;
  prompts: Prompt[];
  welcomeMessage: string;
  isActive: boolean;
  style: {
    avatar: string;
    primaryColor: string;
    position: "left" | "right";
  };
}

const modelOptions = [
  { id: "gpt-4", name: "GPT-4 (Recommandé)" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
];

const toneOptions = [
  { id: "professional", name: "Professionnel" },
  { id: "friendly", name: "Amical" },
  { id: "casual", name: "Décontracté" },
  { id: "formal", name: "Formel" },
];

const defaultPrompts: Prompt[] = [
  {
    id: "welcome",
    scenario: "Message de bienvenue",
    content: "Je suis votre assistant personnel. Comment puis-je vous aider aujourd'hui ?",
    isActive: true,
  },
  {
    id: "product-inquiry",
    scenario: "Demande d'informations produit",
    content: "Je vois que vous vous intéressez à notre jeu {product_name}. Je peux vous donner plus de détails sur ce produit. Que souhaitez-vous savoir ?",
    isActive: true,
  },
];

export default function AssistantSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchAssistantSettings();
  }, []);

  const fetchAssistantSettings = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("assistant_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Créer des paramètres par défaut
        const defaultSettings: Partial<AssistantSettings> = {
          name: "Assistant VOSC",
          personality: "Je suis l'assistant commercial de VIENS ON S'CONNAÎT. Je suis là pour aider les clients à découvrir nos jeux de cartes et répondre à leurs questions.",
          tone: "friendly",
          language: "fr",
          model: "gpt-4",
          temperature: 0.7,
          maxTokens: 500,
          prompts: defaultPrompts,
          welcomeMessage: "Bonjour ! Je suis l'Assistant VOSC. Comment puis-je vous aider ?",
          isActive: true,
          style: {
            avatar: "/images/logos/fav_dukka.svg",
            primaryColor: "#2563EB",
            position: "right",
          },
        };
        setSettings(defaultSettings as AssistantSettings);
      }
    } catch (error) {
      console.error("Error fetching assistant settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres de l'assistant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { error } = await supabase
        .from("assistant_settings")
        .upsert({
          ...settings,
          user_id: session.user.id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Les paramètres de l'assistant ont été sauvegardés",
        variant: "success",
      });
    } catch (error) {
      console.error("Error saving assistant settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addPrompt = () => {
    if (!settings) return;

    const newPrompt: Prompt = {
      id: `prompt-${Date.now()}`,
      scenario: "",
      content: "",
      isActive: true,
    };

    setSettings({
      ...settings,
      prompts: [...settings.prompts, newPrompt],
    });
  };

  const removePrompt = (id: string) => {
    if (!settings) return;

    setSettings({
      ...settings,
      prompts: settings.prompts.filter((p) => p.id !== id),
    });
  };

  const updatePrompt = (id: string, field: keyof Prompt, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      prompts: settings.prompts.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Configuration de l'Assistant
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Personnalisez le comportement et l'apparence de votre assistant commercial
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
              checked={settings.isActive}
              onCheckedChange={(checked) => setSettings({ ...settings, isActive: checked })}
            />
          </div>

          <div className="space-y-4">
            {/* Nom de l'assistant */}
            <div>
              <Label htmlFor="name">Nom de l'assistant</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Personnalité */}
            <div>
              <Label htmlFor="personality">Personnalité</Label>
              <Textarea
                id="personality"
                value={settings.personality}
                onChange={(e) => setSettings({ ...settings, personality: e.target.value })}
                rows={4}
                className="mt-1"
                placeholder="Décrivez la personnalité de votre assistant..."
              />
            </div>

            {/* Ton */}
            <div>
              <Label htmlFor="tone">Ton</Label>
              <Select
                value={settings.tone}
                onValueChange={(value) => setSettings({ ...settings, tone: value })}
              >
                <SelectTrigger id="tone" className="mt-1">
                  <SelectValue placeholder="Sélectionner un ton" />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message de bienvenue */}
            <div>
              <Label htmlFor="welcome">Message de bienvenue</Label>
              <Textarea
                id="welcome"
                value={settings.welcomeMessage}
                onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Configuration du modèle */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Configuration du modèle
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Modèle */}
            <div>
              <Label htmlFor="model">Modèle</Label>
              <Select
                value={settings.model}
                onValueChange={(value) => setSettings({ ...settings, model: value })}
              >
                <SelectTrigger id="model" className="mt-1">
                  <SelectValue placeholder="Sélectionner un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Température */}
            <div>
              <Label htmlFor="temperature">
                Température 
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  (Créativité : {settings.temperature})
                </span>
              </Label>
              <Input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>

            {/* Jetons maximum */}
            <div>
              <Label htmlFor="maxTokens">Jetons maximum</Label>
              <Input
                id="maxTokens"
                type="number"
                min="100"
                max="2000"
                value={settings.maxTokens}
                onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Prompts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Scénarios et prompts
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addPrompt}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter un scénario
            </Button>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {settings.prompts.map((prompt) => (
              <AccordionItem
                key={prompt.id}
                value={prompt.id}
                className="border rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={prompt.isActive}
                        onCheckedChange={(checked) => updatePrompt(prompt.id, "isActive", checked)}
                      />
                      <span className="font-medium">
                        {prompt.scenario || "Nouveau scénario"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePrompt(prompt.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <AccordionContent className="pt-4">
                  <div className="space-y-4">
                    {/* Nom du scénario */}
                    <div>
                      <Label htmlFor={`scenario-${prompt.id}`}>
                        Nom du scénario
                      </Label>
                      <Input
                        id={`scenario-${prompt.id}`}
                        value={prompt.scenario}
                        onChange={(e) => updatePrompt(prompt.id, "scenario", e.target.value)}
                        className="mt-1"
                        placeholder="Ex: Message de bienvenue, Demande de prix..."
                      />
                    </div>

                    {/* Contenu du prompt */}
                    <div>
                      <Label htmlFor={`content-${prompt.id}`}>
                        Contenu du prompt
                      </Label>
                      <div className="mt-1 space-y-2">
                        <Textarea
                          id={`content-${prompt.id}`}
                          value={prompt.content}
                          onChange={(e) => updatePrompt(prompt.id, "content", e.target.value)}
                          rows={4}
                          placeholder="Écrivez le prompt qui sera utilisé dans ce scénario..."
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Variables disponibles : {"{product_name}"}, {"{price}"}, {"{customer_name}"}
                        </p>
                      </div>
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
            {/* Couleur primaire */}
            <div>
              <Label htmlFor="primaryColor">Couleur primaire</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="color"
                  id="primaryColor"
                  value={settings.style.primaryColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    style: {
                      ...settings.style,
                      primaryColor: e.target.value
                    }
                  })}
                  className="w-12 h-12 p-1 rounded-lg"
                />
                <Input
                  type="text"
                  value={settings.style.primaryColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    style: {
                      ...settings.style,
                      primaryColor: e.target.value
                    }
                  })}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <Label htmlFor="position">Position de la bulle</Label>
              <Select
                value={settings.style.position}
                onValueChange={(value: 'left' | 'right') => setSettings({
                  ...settings,
                  style: {
                    ...settings.style,
                    position: value
                  }
                })}
              >
                <SelectTrigger id="position" className="mt-1">
                  <SelectValue placeholder="Sélectionner une position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Gauche</SelectItem>
                  <SelectItem value="right">Droite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
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