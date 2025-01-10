// src/features/home/components/sections/NewsletterSection.tsx
import { useState } from 'react';
import { Mail } from 'lucide-react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logique d'inscription à la newsletter
    console.log('Email soumis:', email);
  };

  return (
    <section className="w-full py-16 bg-brand-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <Mail className="w-12 h-12 text-brand-blue" />
          </div>
          <h2 className="text-3xl font-bold text-brand-blue mb-4">
            Rejoignez notre newsletter
          </h2>
          <p className="text-gray-600 mb-8">
            Recevez nos conseils et actualités pour des relations plus fortes
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre adresse email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 border border-gray-300 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-brand-pink"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-brand-blue text-white rounded-lg font-medium hover:bg-brand-pink transition-colors"
            >
              S'inscrire
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default NewsletterSection;