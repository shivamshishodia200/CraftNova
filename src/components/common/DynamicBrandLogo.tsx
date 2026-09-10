import React, { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';

interface DynamicBrandLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;
  className?: string;
  forceLight?: boolean;
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
  accentColor?: string;
}

export const DynamicBrandLogo: React.FC<DynamicBrandLogoProps> = ({
  size = 36,
  showText = true,
  textSize = 'md',
  subtitle,
  className = '',
  forceLight = false,
  logoUrl: propLogoUrl,
  companyName: propCompanyName,
  primaryColor: propPrimaryColor,
  accentColor: propAccentColor
}) => {
  const { branding } = useOrganization();
  const companyName = propCompanyName || branding?.companyName || 'Craft Media Hub';
  
  // Resolve logo URL
  let resolvedLogoUrl = propLogoUrl !== undefined ? propLogoUrl : (branding?.logoUrl || '');
  
  // If company is Craft Media Hub and no logo set, use the official logo.svg
  if (!resolvedLogoUrl && (companyName.toLowerCase().includes('craft media') || companyName.toLowerCase().includes('craftmedia'))) {
    resolvedLogoUrl = '/logo.svg';
  }

  // Normalize local backend port URLs to relative path for seamless Vite proxying
  if (resolvedLogoUrl && (resolvedLogoUrl.includes('127.0.0.1:5055/uploads') || resolvedLogoUrl.includes('localhost:5055/uploads'))) {
    try {
      const parsed = new URL(resolvedLogoUrl);
      resolvedLogoUrl = parsed.pathname;
    } catch {
      // keep as-is if parsing fails
    }
  }

  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [resolvedLogoUrl]);

  const brandPrimary = propPrimaryColor || branding?.primaryColor || '#F59E0B';
  const brandAccent = propAccentColor || branding?.accentColor || '#EA580C';

  const words = companyName.trim().split(' ');
  const firstWord = words[0] || 'Craft';
  const restOfWords = words.slice(1).join(' ') || 'Media';

  const getTextClass = () => {
    switch (textSize) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      default: return 'text-sm';
    }
  };

  const hasImageLogo = Boolean(resolvedLogoUrl) && !imgError;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 1. Logo Icon / Image */}
      {hasImageLogo ? (
        <img
          src={resolvedLogoUrl}
          alt={companyName}
          className="object-contain rounded-lg shrink-0"
          style={{ height: size, width: 'auto', maxHeight: size }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="relative flex items-center justify-center rounded-xl font-black text-white shadow-md overflow-hidden shrink-0"
          style={{
            width: size,
            height: size,
            background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandAccent} 100%)`
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3/5 h-3/5"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
      )}

      {/* 2. Text Brand Name */}
      {showText && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className={`font-black tracking-tight uppercase truncate ${forceLight ? 'text-slate-900' : 'text-white'} ${getTextClass()}`}>
              {firstWord}
            </span>
            {restOfWords && (
              <span
                className={`font-black tracking-tight uppercase truncate ${getTextClass()}`}
                style={{ color: brandPrimary }}
              >
                {restOfWords}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
