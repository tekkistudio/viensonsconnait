// components/ui/DukkaBadge.tsx
import Link from 'next/link';

export function DukkaBadge() {
  return (
    <Link
      href="https://getdukka.com"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm shadow-lg rounded-full py-2 px-4 flex items-center gap-2 hover:shadow-xl transition-all z-50"
    >
      <span className="text-sm font-medium text-gray-600">Créé avec</span>
      <span className="font-bold bg-gradient-to-r from-[#2563EB] to-[#38B6FF] bg-clip-text text-transparent"> 
        Dukka
      </span>
    </Link>
  );
}

export default DukkaBadge;