// src/features/home/components/sections/NewsletterSection.tsx
'use client';

import { useState } from 'react';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { whatsappService } from '@/lib/services/whatsapp.service';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

export function NewsletterSection() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    setError(null);

    // Validation basique pour l'UI
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

      // Message personnalisé avec une bonne UX
      const message = encodeURIComponent(
        "Bonjour ! 👋\n\nJe souhaite rejoindre la liste de diffusion VIENS ON S'CONNAÎT pour recevoir :\n" +
        "✨ Les actualités\n" +
        "🎮 Les nouveaux jeux\n" +
        "🎁 Les offres spéciales\n" +
        "💝 Les conseils relationnels"
      );
      
      // Redirection vers WhatsApp
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
    <section className="w-full py-16 bg-[#F8F9FA]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center">
              <WhatsAppIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <h2 className="text-3xl font-bold text-[#132D5D] mb-4">
                  Rejoignez notre communauté WhatsApp
                </h2>
                <p className="text-gray-600 mb-8">
                  Recevez en avant-première nos actualités, nos conseils et nos offres spéciales directement sur WhatsApp
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                  <div className="flex-1 relative">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="Ex: +221 77 123 45 67"
                      className={`w-full px-4 py-3 rounded-lg text-gray-900 border placeholder-gray-500 bg-white focus:outline-none focus:ring-2 transition-colors ${
                        isValid 
                          ? 'border-[#25D366] focus:ring-[#25D366]' 
                          : 'border-gray-300 focus:ring-[#FF7E93]'
                      }`}
                      required
                    />
                    {phoneNumber && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isValid ? (
                          <Check className="w-5 h-5 text-[#25D366]" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!isValid || isLoading}
                    className={`px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                      isValid && !isLoading
                        ? 'bg-[#25D366] hover:bg-[#128C7E] text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Rejoindre
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-sm mt-2"
                  >
                    {error}
                  </motion.p>
                )}

                <p className="text-sm text-gray-500 mt-4">
                  En vous inscrivant, vous acceptez de recevoir nos messages WhatsApp. 
                  Vous pourrez vous désabonner à tout moment en envoyant "STOP"
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#132D5D]">
                  WhatsApp va s'ouvrir...
                </h3>
                <p className="text-gray-600">
                  Cliquez sur "Envoyer" dans WhatsApp pour finaliser votre inscription 
                  et commencer à recevoir nos actualités !
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default NewsletterSection;