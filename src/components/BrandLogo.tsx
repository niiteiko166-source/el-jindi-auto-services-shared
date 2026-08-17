import React from 'react';

const logoSrc = '/assets/images/logo.png';

interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, className = 'Logo' }) => {
  const widthClass = compact ? 'w-32 sm:w-36 md:w-44' : 'w-full max-w-[520px]';

  return (
    <div className={`brand-logo flex items-center justify-center ${className}`}>
      <img
        src={logoSrc}
        alt="EL-JINDI Auto Services"
        className={`${widthClass} h-auto object-contain select-none drop-shadow-[0_4px_12px_rgba(239,68,68,0.12)]`}
      />
    </div>
  );
};
