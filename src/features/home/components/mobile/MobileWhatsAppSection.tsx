// src/features/home/components/mobile/MobileWhatsAppSection.tsx
"use client"

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Check, AlertCircle, Users, Gift, Sparkles } from 'lucide-react';
import { whatsappService } from '@/lib/services/whatsapp.service';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

const benefits = [
  {
    icon: Sparkles,
    text: "Actualités en avant-première"
  },
  {
    icon: Gift,
    text: "Offres exclusives et promotions"
  },
  {
    icon: Users,
    text: "Conseils relationnels personnalisés"
  },
  {
    icon: MessageCircle,
    text: "Support client prioritaire"
  }
];

export default function MobileWhatsAppSection() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    setError(null);

    if (value.length > 8) {
      setIsValid(whatsappService.validatePhoneNumber(value));
    } else {
      setIsValid(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setError(null);

    try {
      const subscriber = await whatsappService.addSubscriber(phoneNumber);
      
      if (!subscriber) {
        throw new Error('Ce numéro est déjà inscrit à notre liste de diffusion');
      }

      setIsSubmitted(true);

      const message = encodeURIComponent(
        "Bonjour ! 👋\n\nJe souhaite rejoindre la communauté VIENS ON S'CONNAÎT pour recevoir :\n" +
        "✨ Les actualités en avant-première\n" +
        "🎮 Les nouveaux jeux\n" +
        "🎁 Les offres exclusives\n" +
        "💝 Les conseils relationnels\n" +
        "🚀 Le support prioritaire"
      );
      
      setTimeout(() => {
        window.open(
          `https://wa.me/221781362728?text=${message}`,
          '_blank'
        );
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsSubmitted(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-gradient-to-b from-gray-900 to-black py-16">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#25D366] rounded-full mb-6">
            <WhatsAppIcon className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Rejoignez Notre Communauté
          </h2>
          <p className="text-white/70 text-lg leading-relaxed max-w-2xl mx-auto">
            Plus de 2 500 membres reçoivent déjà nos actualités, conseils et offres 
            exclusives directement sur WhatsApp. Rejoignez-les !
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12"
        >
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="bg-[#25D366] rounded-full p-2 flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-sm font-medium">
                  {benefit.text}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="Ex: +221 77 123 45 67"
                    className={`w-full px-4 py-4 rounded-xl text-white placeholder-white/50 bg-white/10 backdrop-blur-sm border transition-all focus:outline-none focus:ring-2 ${
                      isValid 
                        ? 'border-[#25D366] focus:ring-[#25D366]/50' 
                        : 'border-white/20 focus:ring-brand-pink/50'
                    }`}
                    required
                  />
                  {phoneNumber && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isValid ? (
                        <div className="bg-[#25D366] rounded-full p-1">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="bg-red-500 rounded-full p-1">
                          <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isValid || isLoading}
                  className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all ${
                    isValid && !isLoading
                      ? 'bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <WhatsAppIcon className="w-5 h-5" />
                      <span>Rejoindre la Communauté</span>
                    </>
                  )}
                </button>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm text-center bg-red-500/10 backdrop-blur-sm rounded-lg p-3 border border-red-500/20"
                  >
                    {error}
                  </motion.p>
                )}

                <p className="text-white/50 text-xs text-center leading-relaxed">
                  En vous inscrivant, vous acceptez de recevoir nos messages WhatsApp. 
                  Vous pourrez vous désabonner à tout moment en envoyant "STOP".
                </p>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-md mx-auto"
            >
              <div className="bg-[#25D366]/20 backdrop-blur-sm rounded-2xl p-8 border border-[#25D366]/30">
                <div className="bg-[#25D366] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-white text-xl font-bold mb-4">
                  Parfait ! WhatsApp va s'ouvrir...
                </h3>
                
                <p className="text-white/80 mb-6">
                  Cliquez sur "Envoyer" dans WhatsApp pour finaliser votre inscription 
                  et commencer à recevoir nos contenus exclusifs !
                </p>

                <div className="flex items-center justify-center gap-2 text-[#25D366] text-sm">
                  <div className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse" />
                  <span>Redirection en cours...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-12"
        >
          <div className="flex items-center justify-center gap-4 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>+ 2 500 membres</span>
            </div>
            <div className="w-1 h-1 bg-white/30 rounded-full" />
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>100% gratuit</span>
            </div>
            <div className="w-1 h-1 bg-white/30 rounded-full" />
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>Désabonnement facile</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}