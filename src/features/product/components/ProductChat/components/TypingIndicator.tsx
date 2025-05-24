// src/features/product/components/ProductChat/components/TypingIndicator.tsx
import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator = () => {
  return (
    <div className="flex items-start max-w-[85%] mb-2">
      <div className="flex items-center space-x-1 bg-white p-3 rounded-[20px] rounded-tl-sm shadow-sm">
        <motion.div
          className="w-2 h-2 bg-[#FF7E93] rounded-full"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0
          }}
        />
        <motion.div
          className="w-2 h-2 bg-[#FF7E93] rounded-full"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2
          }}
        />
        <motion.div
          className="w-2 h-2 bg-[#FF7E93] rounded-full"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4
          }}
        />
      </div>
    </div>
  );
};

export default TypingIndicator;