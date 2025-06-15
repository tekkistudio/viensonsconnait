// src/features/home/components/mobile/MobileAppDownloadSection.tsx
"use client"

import { motion } from 'framer-motion';
import { Smartphone, Download, Wifi, Volume2, MessageSquare } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    icon: Smartphone,
    title: "Tous vos jeux dans la poche",
    description: "Accédez à tous les jeux VIENS ON S'CONNAÎT depuis votre Smartphone"
  },
  {
    icon: Wifi,
    title: "Mode hors connexion",
    description: "Jouez partout, même sans connexion Internet"
  },
  {
    icon: Volume2,
    title: "Lecture vocale",
    description: "Écoutez vos questions en français, et bientôt en anglais, wolof, lingala et plus"
  },
  {
    icon: MessageSquare,
    title: "IA intégrée",
    description: "Notre IA vous aide à mieux comprendre les questions pour mieux y répondre"
  }
];

export default function MobileAppDownloadSection() {
  return (
    <section className="bg-gradient-to-b from-black to-gray-900 py-16 overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full mb-6">
            <Smartphone className="w-4 h-4" />
            <span className="text-sm font-medium">Application Mobile</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Emportez Vos Jeux Partout
          </h2>
          <p className="text-white/70 text-lg leading-relaxed max-w-2xl mx-auto">
            Téléchargez l'application VIENS ON S'CONNAÎT et transformez chaque moment 
            en opportunité de connexion avec vos proches.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  className="flex items-start gap-4"
                >
                  <div className="bg-gradient-to-r from-brand-pink to-purple-500 rounded-full p-3 flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-white/80 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* App Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative"
          >
            <div className="relative mx-auto w-64 h-[500px]">
              {/* Phone mockup */}
              <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black rounded-[3rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-black rounded-[2.5rem] overflow-hidden">
                  <Image
                    src="/images/app/preview.png"
                    alt="Application VIENS ON S'CONNAÎT"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              
              {/* Floating elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-4 -right-4 bg-green-500 rounded-full p-3 shadow-lg"
              >
                <Download className="w-6 h-6 text-white" />
              </motion.div>
              
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 3, delay: 1.5 }}
                className="absolute -bottom-4 -left-4 bg-blue-500 rounded-full p-3 shadow-lg"
              >
                <Smartphone className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Download CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-12"
        >
          <h3 className="text-white text-xl font-bold mb-6">
            Téléchargez maintenant, et profitez !
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://apps.apple.com/app/viensonsconnait/id6464125284"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-4 transition-all group-hover:scale-105">
                <Image
                  src="/images/badges/app-store-badge.svg"
                  alt="Télécharger sur l'App Store"
                  width={150}
                  height={50}
                  className="h-12 w-auto"
                />
              </div>
            </a>
            
            {/* Coming soon badge pour Play Store */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="bg-gray-600 rounded-lg p-2">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-white font-medium">Google Play</div>
                  <div className="text-white/60 text-sm">Bientôt disponible</div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-white/60 text-sm mt-6">
            Compatible iPhone • Déjà plus de 300 téléchargements
          </p>
        </motion.div>
      </div>
    </section>
  );
}