import React from 'react';
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
}

export const DynamicBrandLogo: React.FC<DynamicBrandLogoProps> = ({
  size = 36,
  showText = true,
  textSize = 'md',
  subtitle,
  className = '',
  forceLight = false,
  logoUrl: propLogoUrl,
  companyName: propCompanyName
}) => {
  const { branding } = useOrganization();
  const companyName = propCompanyName || branding?.companyName || '360CRM Enterprise';
  const logoUrl = propLogoUrl !== undefined ? propLogoUrl : branding?.logoUrl;


  const words = companyName.trim().split(' ');
  const firstWord = words[0] || '360';
  const restOfWords = words.slice(1).join(' ') || 'CRM';

  const getTextClass = () => {
    switch (textSize) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      default: return 'text-sm';
    }
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 1. Logo Icon / Image */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={companyName}
          className="object-contain rounded-lg"
          style={{ height: size, width: 'auto', maxHeight: size }}
          onError={(e) => {
            // Fallback to SVG on image load error
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className="relative flex items-center justify-center rounded-xl font-black text-white shadow-md overflow-hidden shrink-0"
          style={{
            width: size,
            height: size,
            background: 'linear-gradient(135deg, var(--brand-primary, #F59E0B) 0%, var(--brand-accent, #EA580C) 100%)'
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
                style={{ color: 'var(--brand-primary, #F59E0B)' }}
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
