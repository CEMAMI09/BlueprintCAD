/**
 * Blueprint Design System
 * Complete design tokens, colors, spacing, and typography
 */

export const DesignSystem = {
  colors: {
    // Primary palette
    primary: {
      blue: 'var(--ds-primary-blue)',
      blueHover: 'var(--ds-primary-blue-hover)',
      blueActive: 'var(--ds-primary-blue-active)',
      blueLight: 'var(--ds-primary-blue-light)',
      blueDark: 'var(--ds-primary-blue-dark)',
    },
    
    // Backgrounds
    background: {
      app: 'var(--ds-bg-app)',
      panel: 'var(--ds-bg-panel)',
      panelLight: 'var(--ds-bg-panel-light)',
      panelHover: 'var(--ds-bg-panel-hover)',
      card: 'var(--ds-bg-card)',
      elevated: 'var(--ds-bg-elevated)',
    },
    
    // Accent colors
    accent: {
      cyan: 'var(--ds-accent-cyan)',
      cyanDark: 'var(--ds-accent-cyan-dark)',
      success: 'var(--ds-accent-success)',
      warning: 'var(--ds-accent-warning)',
      error: 'var(--ds-accent-error)',
      purple: 'var(--ds-accent-purple)',
    },
    
    // Text colors
    text: {
      primary: 'var(--ds-text-primary)',
      secondary: 'var(--ds-text-secondary)',
      tertiary: 'var(--ds-text-tertiary)',
      disabled: 'var(--ds-text-disabled)',
      inverse: 'var(--ds-text-inverse)',
    },
    
    // Border colors
    border: {
      subtle: 'var(--ds-border-subtle)',
      default: 'var(--ds-border-default)',
      strong: 'var(--ds-border-strong)',
      focus: 'var(--ds-border-focus)',
    },
    
    // Status colors
    status: {
      online: 'var(--ds-accent-success)',
      away: 'var(--ds-accent-warning)',
      busy: 'var(--ds-accent-error)',
      offline: 'var(--ds-text-tertiary)',
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
      sans: "'Mona Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'Mona Sans', 'JetBrains Mono', 'Fira Code', monospace",
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
