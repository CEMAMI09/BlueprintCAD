/**
 * Blueprint Design System
 * Complete design tokens, colors, spacing, and typography
 */

export const DesignSystem = {
  colors: {
    // Primary palette
    primary: {
      blue: '#2F80ED',
      blueHover: '#1E6FDB',
      blueActive: '#1A5FC4',
      blueLight: '#4A9FF5',
      blueDark: '#1A5FC4',
    },
    
    // Backgrounds
    background: {
      app: '#0A0A0A',
      panel: '#141414',
      panelLight: '#181818',
      panelHover: '#1F1F1F',
      card: '#1A1A1A',
      elevated: '#222222',
    },
    
    // Accent colors
    accent: {
      cyan: '#00E5FF',
      cyanDark: '#00C4D6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      purple: '#8B5CF6',
    },
    
    // Text colors
    text: {
      primary: '#E0E0E0',
      secondary: '#A0A0A0',
      tertiary: '#6B7280',
      disabled: '#4B5563',
      inverse: '#1F1F1F',
    },
    
    // Border colors
    border: {
      subtle: '#2A2A2A',
      default: '#333333',
      strong: '#404040',
      focus: '#2F80ED',
    },
    
    // Status colors
    status: {
      online: '#10B981',
      away: '#F59E0B',
      busy: '#EF4444',
      offline: '#6B7280',
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
  },
  
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '10px',
    '2xl': '12px',
    full: '9999px',
  },
  
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.4)',
    glow: '0 0 20px rgba(47, 128, 237, 0.3)',
  },
  
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  layout: {
    leftPanel: {
      expanded: '240px',
      collapsed: '90px',
    },
    rightPanel: {
      width: '320px',
    },
    header: {
      height: '60px',
    },
    maxWidth: {
      content: '1440px',
      wide: '1920px',
    },
  },
  
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    toast: 1400,
    tooltip: 1500,
  },
};

export type ColorToken = keyof typeof DesignSystem.colors;
export type SpacingToken = keyof typeof DesignSystem.spacing;
export type RadiusToken = keyof typeof DesignSystem.borderRadius;
