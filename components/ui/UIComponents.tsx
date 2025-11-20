/**
 * Reusable UI Components
 * Button, Card, Badge, Input, etc.
 */

'use client';

import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { DesignSystem as DS } from '@/lib/ui/design-system';

// Button Component
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: `bg-[${DS.colors.primary.blue}] text-white hover:bg-[${DS.colors.primary.blueHover}] active:bg-[${DS.colors.primary.blueActive}]`,
    secondary: `bg-[${DS.colors.background.elevated}] text-[${DS.colors.text.primary}] hover:bg-[${DS.colors.background.panelHover}] border border-[${DS.colors.border.default}]`,
    ghost: `bg-transparent text-[${DS.colors.text.secondary}] hover:bg-[${DS.colors.background.panelHover}] hover:text-[${DS.colors.text.primary}]`,
    danger: `bg-[${DS.colors.accent.error}] text-white hover:opacity-90`,
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="animate-spin">⏳</span>
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
}

// Card Component
interface CardProps {
  children: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, hover = false, padding = 'md', className = '', onClick, style }: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${paddingStyles[padding]} ${hover ? 'cursor-pointer hover:shadow-lg' : ''} ${className}`}
      style={{
        backgroundColor: DS.colors.background.card,
        borderColor: DS.colors.border.default,
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = DS.colors.primary.blue;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = DS.colors.border.default;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
}

// Badge Component
interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variantStyles = {
    default: { bg: DS.colors.background.elevated, color: DS.colors.text.secondary },
    primary: { bg: DS.colors.primary.blue, color: '#ffffff' },
    success: { bg: DS.colors.accent.success, color: '#ffffff' },
    warning: { bg: DS.colors.accent.warning, color: '#ffffff' },
    error: { bg: DS.colors.accent.error, color: '#ffffff' },
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeStyles[size]}`}
      style={{
        backgroundColor: variantStyles[variant].bg,
        color: variantStyles[variant].color,
      }}
    >
      {children}
    </span>
  );
}

// Input Component
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Input({ label, error, icon, fullWidth = false, className = '', ...props }: InputProps) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: DS.colors.text.primary }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DS.colors.text.tertiary }}>
            {icon}
          </div>
        )}
        <input
          className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 ${icon ? 'pl-10' : ''} ${className}`}
          style={{
            backgroundColor: DS.colors.background.panelLight,
            borderColor: error ? DS.colors.accent.error : DS.colors.border.default,
            color: DS.colors.text.primary,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = DS.colors.primary.blue;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${DS.colors.primary.blue}33`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? DS.colors.accent.error : DS.colors.border.default;
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm" style={{ color: DS.colors.accent.error }}>
          {error}
        </p>
      )}
    </div>
  );
}

// SearchBar Component
interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  fullWidth?: boolean;
}

export function SearchBar({ placeholder = 'Search...', onSearch, fullWidth = true }: SearchBarProps) {
  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <input
        type="search"
        placeholder={placeholder}
        className="w-full px-4 py-2.5 pl-10 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2"
        style={{
          backgroundColor: DS.colors.background.panelLight,
          borderColor: DS.colors.border.default,
          color: DS.colors.text.primary,
        }}
        onChange={(e) => onSearch?.(e.target.value)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = DS.colors.primary.blue;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${DS.colors.primary.blue}33`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = DS.colors.border.default;
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
        style={{ color: DS.colors.text.tertiary }}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}

// Tabs Component
interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b" style={{ borderColor: DS.colors.border.subtle }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center gap-2"
            style={{
              color: isActive ? DS.colors.primary.blue : DS.colors.text.secondary,
              borderBottom: isActive ? `2px solid ${DS.colors.primary.blue}` : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = DS.colors.text.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = DS.colors.text.secondary;
              }
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && (
              <Badge variant="primary" size="sm">
                {tab.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Loading Spinner
export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <div
        className="animate-spin rounded-full border-2 border-t-transparent"
        style={{
          width: size,
          height: size,
          borderColor: DS.colors.primary.blue,
          borderTopColor: 'transparent',
        }}
      />
    </div>
  );
}

// Empty State
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4" style={{ color: DS.colors.text.tertiary }}>
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2" style={{ color: DS.colors.text.primary }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mb-6 max-w-md" style={{ color: DS.colors.text.secondary }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
