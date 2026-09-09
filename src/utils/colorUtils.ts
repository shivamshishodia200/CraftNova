/**
 * 360CRM Enterprise - Central Color & Theme Token Engine
 * Provides safe color manipulation, W3C accessibility contrast computation,
 * and automatic derivation of semantic workspace theme tokens.
 */

// HEX Color Validation (Supports #RGB, #RRGGBB, and #RRGGBBAA)
export function isValidHex(color: string): boolean {
  if (!color || typeof color !== 'string') return false;
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color.trim());
}

// Convert HEX to RGB
export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.trim().replace(/^#/, '');

  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }

  if (clean.length < 6) return null;

  const num = parseInt(clean.slice(0, 6), 16);
  if (isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// Convert RGB to HEX
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Darken a color by percentage (0-100)
export function darken(color: string, percent: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const factor = Math.max(0, Math.min(1, 1 - percent / 100));
  return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

// Lighten a color by percentage (0-100)
export function lighten(color: string, percent: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const p = Math.max(0, Math.min(1, percent / 100));
  return rgbToHex(
    rgb.r + (255 - rgb.r) * p,
    rgb.g + (255 - rgb.g) * p,
    rgb.b + (255 - rgb.b) * p
  );
}

// Generate translucent rgba string
export function alpha(color: string, opacity: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const op = Math.max(0, Math.min(1, opacity));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op})`;
}

// Calculate relative luminance according to W3C WCAG 2.1 specs
export function getLuminance(color: string): number {
  const rgb = parseHex(color);
  if (!rgb) return 0.5;

  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors (1:1 to 21:1)
export function getContrastRatio(foreground: string, background: string): number {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Automatically choose high-contrast text color (#FFFFFF or #0F172A)
export function getAccessibleTextColor(background: string): string {
  if (!isValidHex(background)) return '#FFFFFF';
  const contrastWithWhite = getContrastRatio('#FFFFFF', background);
  const contrastWithDark = getContrastRatio('#0F172A', background);
  return contrastWithWhite >= contrastWithDark ? '#FFFFFF' : '#0F172A';
}

// Validate if contrast meets WCAG AA standards (4.5:1 for normal text, 3:1 for large/buttons)
export function isContrastAccessible(
  foreground: string,
  background: string,
  minRatio = 4.5
): boolean {
  return getContrastRatio(foreground, background) >= minRatio;
}

export interface DerivedThemeTokens {
  brandPrimary: string;
  brandPrimaryHover: string;
  brandPrimaryLight: string;
  brandPrimarySoft: string;
  brandPrimaryBorder: string;

  brandSecondary: string;
  brandAccent: string;

  sidebarBg: string;
  sidebarText: string;
  sidebarMuted: string;
  sidebarActiveBg: string;
  sidebarActiveText: string;

  headerBg: string;
  headerText: string;

  pageBg: string;
  surfaceBg: string;
  surfaceBorder: string;

  textPrimary: string;
  textSecondary: string;

  buttonPrimaryBg: string;
  buttonPrimaryText: string;

  focusRing: string;

  // Semantic Status Colors (Preserved consistently)
  semanticSuccess: string;
  semanticWarning: string;
  semanticDanger: string;
  semanticInfo: string;
}

/**
 * Derives comprehensive, accessible theme variables automatically from
 * the basic primary, secondary, and sidebar colors configured by Super Admin.
 */
export function deriveThemeTokens(branding: {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  sidebarBackground?: string;
  sidebarTextColor?: string;
  sidebarActiveColor?: string;
  headerBackground?: string;
  headerTextColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
}): DerivedThemeTokens {
  const primary = isValidHex(branding.primaryColor || '') ? branding.primaryColor! : '#F59E0B';
  const secondary = isValidHex(branding.secondaryColor || '') ? branding.secondaryColor! : '#111827';
  const accent = isValidHex(branding.accentColor || '') ? branding.accentColor! : '#EA580C';

  // Derived primary variants
  const primaryHover = darken(primary, 9);
  const primaryLight = lighten(primary, 22);
  const primarySoft = alpha(primary, 0.12);
  const primaryBorder = alpha(primary, 0.28);

  // Sidebar derivation
  const sidebarBg = isValidHex(branding.sidebarBackground || '') ? branding.sidebarBackground! : '#080D1A';
  const sidebarText = isValidHex(branding.sidebarTextColor || '') ? branding.sidebarTextColor! : '#94A3B8';
  const sidebarMuted = alpha(sidebarText, 0.6);

  // Sidebar active menu
  const sidebarActiveBg = isValidHex(branding.sidebarActiveColor || '')
    ? branding.sidebarActiveColor!
    : primary;
  const sidebarActiveText = getAccessibleTextColor(sidebarActiveBg);

  // Header derivation
  const headerBg = isValidHex(branding.headerBackground || '') ? branding.headerBackground! : '#FFFFFF';
  const headerText = isValidHex(branding.headerTextColor || '')
    ? branding.headerTextColor!
    : getAccessibleTextColor(headerBg) === '#FFFFFF' ? '#FFFFFF' : '#0F172A';

  // Surface & Page background
  const pageBg = isValidHex(branding.backgroundColor || '') ? branding.backgroundColor! : '#F8FAFC';
  const surfaceBg = isValidHex(branding.surfaceColor || '') ? branding.surfaceColor! : '#FFFFFF';
  const surfaceBorder = alpha(secondary, 0.12);

  // Text colors
  const textPrimary = getAccessibleTextColor(pageBg) === '#FFFFFF' ? '#F8FAFC' : '#0F172A';
  const textSecondary = getAccessibleTextColor(pageBg) === '#FFFFFF' ? '#94A3B8' : '#64748B';

  // Primary Button
  const buttonPrimaryBg = primary;
  const buttonPrimaryText = getAccessibleTextColor(primary);

  // Focus Ring
  const focusRing = alpha(primary, 0.45);

  return {
    brandPrimary: primary,
    brandPrimaryHover: primaryHover,
    brandPrimaryLight: primaryLight,
    brandPrimarySoft: primarySoft,
    brandPrimaryBorder: primaryBorder,

    brandSecondary: secondary,
    brandAccent: accent,

    sidebarBg,
    sidebarText,
    sidebarMuted,
    sidebarActiveBg,
    sidebarActiveText,

    headerBg,
    headerText,

    pageBg,
    surfaceBg,
    surfaceBorder,

    textPrimary,
    textSecondary,

    buttonPrimaryBg,
    buttonPrimaryText,

    focusRing,

    // Strictly preserved semantic colors
    semanticSuccess: '#10B981',
    semanticWarning: '#F59E0B',
    semanticDanger: '#EF4444',
    semanticInfo: '#3B82F6'
  };
}
