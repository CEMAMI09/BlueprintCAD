/**
 * Three-Panel Layout System
 * Professional CAD SaaS layout with left navigation, center workspace, and right context panel
 */

'use client';

import { ReactNode, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, ArrowLeft, PanelRight } from 'lucide-react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { LUCIDE_STROKE } from '@/components/ui/StatKpiIcon';
import VerificationBanner from '@/app/components/VerificationBanner';

interface LayoutContextType {
  leftPanelCollapsed: boolean;
  rightPanelVisible: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setRightPanelVisible: (visible: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType>({
  leftPanelCollapsed: false,
  rightPanelVisible: true,
  toggleLeftPanel: () => {},
  toggleRightPanel: () => {},
  setRightPanelVisible: () => {},
});

export const useLayout = () => useContext(LayoutContext);

interface ThreePanelLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel?: ReactNode;
  hideLeftPanel?: boolean;
  hideRightPanel?: boolean;
  fullWidth?: boolean;
}

export function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  hideLeftPanel = false,
  hideRightPanel = false,
  fullWidth = false,
}: ThreePanelLayoutProps) {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(!hideRightPanel);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileRightPanelOpen, setMobileRightPanelOpen] = useState(false);

  const router = useRouter();

  const toggleLeftPanel = () => setLeftPanelCollapsed(!leftPanelCollapsed);
  const toggleRightPanel = () => setRightPanelVisible(!rightPanelVisible);

  const leftWidth = leftPanelCollapsed ? DS.layout.leftPanel.collapsed : DS.layout.leftPanel.expanded;

  return (
    <LayoutContext.Provider
      value={{
        leftPanelCollapsed,
        rightPanelVisible,
        toggleLeftPanel,
        toggleRightPanel,
        setRightPanelVisible,
      }}
    >
      <div 
        className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col md:flex-row md:items-stretch"
        style={{ backgroundColor: DS.colors.background.app }}
      >
        {/* MOBILE TOP BAR - Back + Menu (available below lg where right panel is hidden) */}
        <div
          className="lg:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
          style={{
            backgroundColor: DS.colors.background.panel,
            borderColor: DS.colors.border.subtle,
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md"
            style={{
              color: DS.colors.text.primary,
              backgroundColor: DS.colors.background.elevated,
            }}
          >
            <ArrowLeft size={16} strokeWidth={LUCIDE_STROKE} />
            <span>Back</span>
          </button>
          <div className="text-sm font-semibold tracking-wide">
            BlueprintCAD
          </div>
          <div className="flex items-center gap-2">
            {!hideRightPanel && rightPanel && (
              <button
                type="button"
                onClick={() => setMobileRightPanelOpen(true)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-md lg:hidden"
                aria-label="Open info panel"
                style={{
                  backgroundColor: DS.colors.background.elevated,
                  color: DS.colors.text.primary,
                }}
              >
                <PanelRight size={20} strokeWidth={LUCIDE_STROKE} />
              </button>
            )}
            {!hideLeftPanel ? (
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-md"
                aria-label="Open navigation menu"
                style={{
                  backgroundColor: DS.colors.background.elevated,
                  color: DS.colors.text.primary,
                }}
              >
                <Menu size={20} strokeWidth={LUCIDE_STROKE} />
              </button>
            ) : (
              <div className="w-9 h-9" />
            )}
          </div>
        </div>

        {/* LEFT PANEL — fixed to viewport so it stays visible while the page scrolls; spacer reserves width in the flex row */}
        {!hideLeftPanel && (
          <>
            <aside
              className="hidden lg:flex lg:flex-col fixed left-0 top-0 z-[25] h-screen max-h-screen flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
              style={{
                width: leftWidth,
                backgroundColor: DS.colors.background.panel,
                borderRight: `1px solid ${DS.colors.border.subtle}`,
              }}
            >
              {leftPanel}
            </aside>
            <div
              className="hidden lg:block flex-shrink-0 transition-all duration-300 ease-in-out"
              style={{ width: leftWidth }}
              aria-hidden
            />
          </>
        )}

        {/* CENTER PANEL - Main Workspace */}
        <main className="flex-1 min-h-screen min-w-0 overflow-hidden flex flex-col">
          <VerificationBanner />
          {centerPanel}
        </main>

        {/* RIGHT PANEL - Contextual Information (stretch to full row height = at least viewport) */}
        {!hideRightPanel && rightPanelVisible && rightPanel && (
          <aside
            className="hidden lg:flex lg:flex-col flex-shrink-0 min-h-screen h-auto self-stretch transition-all duration-300 ease-in-out overflow-hidden"
            style={{
              width: DS.layout.rightPanel.width,
              backgroundColor: DS.colors.background.panel,
              borderLeft: `1px solid ${DS.colors.border.subtle}`,
            }}
          >
            {rightPanel}
          </aside>
        )}

        {/* MOBILE RIGHT PANEL DRAWER */}
        {mobileRightPanelOpen && !hideRightPanel && rightPanel && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileRightPanelOpen(false)}
              aria-label="Close info panel"
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-80 max-w-[calc(100vw-3rem)] flex flex-col"
              style={{
                backgroundColor: DS.colors.background.panel,
                borderLeft: `1px solid ${DS.colors.border.subtle}`,
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
                style={{ borderColor: DS.colors.border.subtle }}
              >
                <span className="text-sm font-semibold" style={{ color: DS.colors.text.primary }}>
                  Details
                </span>
                <button
                  type="button"
                  onClick={() => setMobileRightPanelOpen(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md"
                  aria-label="Close details panel"
                  style={{
                    backgroundColor: DS.colors.background.elevated,
                    color: DS.colors.text.primary,
                  }}
                >
                  <X size={18} strokeWidth={LUCIDE_STROKE} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {rightPanel}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE NAV DRAWER - uses leftPanel content for page options */}
        {mobileNavOpen && !hideLeftPanel && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Backdrop */}
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation menu"
            />
            {/* Drawer */}
            <div
              className="absolute left-0 top-0 bottom-0 w-72 max-w-full flex flex-col"
              style={{
                backgroundColor: DS.colors.background.panel,
                borderRight: `1px solid ${DS.colors.border.subtle}`,
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
                style={{ borderColor: DS.colors.border.subtle }}
              >
                <span className="text-sm font-semibold" style={{ color: DS.colors.text.primary }}>
                  Page Options
                </span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md"
                  aria-label="Close navigation"
                  style={{
                    backgroundColor: DS.colors.background.elevated,
                    color: DS.colors.text.primary,
                  }}
                >
                  <X size={18} strokeWidth={LUCIDE_STROKE} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Reuse the desktop left panel content for mobile navigation */}
                {leftPanel}
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutContext.Provider>
  );
}

// Reusable panel components
interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function LeftPanel({ children, className = '' }: PanelProps) {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      {children}
    </div>
  );
}

export function CenterPanel({ children, className = '' }: PanelProps) {
  return (
    <div className={`h-full flex flex-col overflow-hidden min-w-0 w-full ${className}`}>
      {children}
    </div>
  );
}

export function RightPanel({ children, className = '' }: PanelProps) {
  return (
    <div className={`min-h-full h-full flex-1 flex flex-col overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

// Panel header components
interface PanelHeaderProps {
  title?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PanelHeader({ title, actions, children }: PanelHeaderProps) {
  return (
    <div
      className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 border-b min-w-0"
      style={{
        borderColor: DS.colors.border.subtle,
        backgroundColor: DS.colors.background.panel,
      }}
    >
      {children || (
        <>
          {title && (
            <h2
              className="text-base sm:text-lg font-semibold break-words min-w-0"
              style={{ color: DS.colors.text.primary }}
            >
              {title}
            </h2>
          )}
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </>
      )}
    </div>
  );
}

export function PanelContent({ children, className = '' }: PanelProps) {
  return (
    <div className={`flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full ${className}`}>
      {children}
    </div>
  );
}
