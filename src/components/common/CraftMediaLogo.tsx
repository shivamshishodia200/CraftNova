import React from 'react';

interface CraftMediaLogoProps {
  className?: string;
  size?: number | string;
  withText?: boolean;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;
  lightText?: boolean;
}

export const CraftMediaLogo: React.FC<CraftMediaLogoProps> = ({
  className = '',
  size = 40,
  withText = false,
  textSize = 'md',
  subtitle = 'CRM & ERP PLATFORM',
  lightText = true,
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 40;

  const fontSizes = {
    sm: { title: 'text-sm font-black', sub: 'text-[9px]' },
    md: { title: 'text-base font-black', sub: 'text-[10px]' },
    lg: { title: 'text-xl font-extrabold', sub: 'text-xs' },
    xl: { title: 'text-2xl sm:text-3xl font-black', sub: 'text-xs sm:text-sm' },
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* 3D Golden-Crimson Ribbon Loop SVG Logo */}
      <svg
        width={numericSize}
        height={numericSize}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-md transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Outer Crimson to Orange-Gold Ribbon Gradient */}
          <linearGradient id="cmGradOuter" x1="15" y1="95" x2="85" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7F1D1D" />
            <stop offset="25%" stopColor="#991B1B" />
            <stop offset="45%" stopColor="#DC2626" />
            <stop offset="70%" stopColor="#EA580C" />
            <stop offset="90%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FDE047" />
          </linearGradient>

          {/* Inner Golden-Amber Ribbon Arc Gradient */}
          <linearGradient id="cmGradInner" x1="30" y1="75" x2="105" y2="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="60%" stopColor="#FBBF24" />
            <stop offset="85%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Bottom Loop Shading Gradient */}
          <linearGradient id="cmGradBottom" x1="45" y1="70" x2="100" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EA580C" />
            <stop offset="30%" stopColor="#DC2626" />
            <stop offset="70%" stopColor="#991B1B" />
            <stop offset="100%" stopColor="#450A0A" />
          </linearGradient>

          {/* Golden Sheen Overlay */}
          <radialGradient id="cmGoldSheen" cx="65%" cy="30%" r="50%" fx="60%" fy="25%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FDE047" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Deep Shadow Filter */}
          <filter id="cmShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#450A0A" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background glow circle */}
        <circle cx="60" cy="60" r="54" fill="url(#cmGradOuter)" opacity="0.08" />

        {/* Outer Circular Swirl Ribbon (C shape) */}
        <path
          d="M 40,102 C 22,90 14,68 20,44 C 26,20 50,8 74,10 C 94,12 108,26 108,44 C 108,54 100,58 92,54 C 84,50 86,34 76,26 C 62,16 40,24 34,42 C 28,60 38,82 56,88 C 72,94 88,86 96,74 C 98,71 104,74 102,80 C 92,98 66,112 40,102 Z"
          fill="url(#cmGradOuter)"
          filter="url(#cmShadow)"
        />

        {/* Inner Golden Wave Loop (M flourish) */}
        <path
          d="M 38,72 C 34,56 46,38 60,36 C 72,34 78,44 72,56 C 66,68 62,80 74,84 C 84,88 98,78 104,66 C 106,62 110,65 108,70 C 100,88 80,98 64,92 C 48,86 44,76 38,72 Z"
          fill="url(#cmGradInner)"
        />

        {/* Bottom Connecting Ribbon Shading */}
        <path
          d="M 64,92 C 78,96 94,88 102,74 C 104,70 106,72 104,78 C 96,96 74,106 52,98 C 58,95 62,93 64,92 Z"
          fill="url(#cmGradBottom)"
        />

        {/* Dynamic Highlight Crest */}
        <path
          d="M 52,18 C 66,12 84,16 94,26 C 88,22 72,20 60,24 C 54,26 50,22 52,18 Z"
          fill="url(#cmGoldSheen)"
        />
        <circle cx="78" cy="24" r="10" fill="url(#cmGoldSheen)" opacity="0.6" />
      </svg>

      {/* Brand Typography */}
      {withText && (
        <div className="leading-tight">
          <div
            className={`${fontSizes[textSize].title} tracking-tight ${
              lightText ? 'text-white' : 'text-slate-900'
            } flex items-center gap-1.5`}
          >
            <span>Craft Media</span>
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Hub
            </span>
            <span className="text-amber-400 text-xs px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 font-mono font-bold tracking-normal">
              CRM
            </span>
          </div>
          {subtitle && (
            <div
              className={`${fontSizes[textSize].sub} font-semibold uppercase tracking-widest ${
                lightText ? 'text-amber-400/80' : 'text-amber-600'
              }`}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
