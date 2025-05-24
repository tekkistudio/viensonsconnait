// src/components/icons/TikTokIcon.tsx
import React from 'react';

interface TikTokIconProps {
  className?: string;
}

export const TikTokIcon: React.FC<TikTokIconProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 19.75 4h-2.93A4.278 4.278 0 0 1 16.6 5.82M20 8.73v2.67a7.84 7.84 0 0 1-4.66-1.5V15a6 6 0 1 1-5.88-6v2.71a3.29 3.29 0 1 0 2.88 3.29V4h2.91a4.27 4.27 0 0 0 .78 2.73A4.29 4.29 0 0 0 20 8.73" />
    </svg>
  );
};