/**
 * Three-Panel Layout System
 * Professional CAD SaaS layout with left navigation, center workspace, and right context panel
 */

'use client';

import { ReactNode, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

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
        className="min-h-screen w-screen overflow-x-hidden flex flex-col md:flex-row md:items-start"
        style={{ backgroundColor: DS.colors.background.app }}
      >
        {/* MOBILE TOP BAR - Back + Menu (always available on small screens) */}
        <div
          className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
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
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div className="text-sm font-semibold tracking-wide">
            BlueprintCAD
          </div>
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
              <Menu size={20} />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>

        {/* LEFT PANEL — fixed to viewport so it stays visible while the page scrolls; spacer reserves width in the flex row */}
        {!hideLeftPanel && (
          <>
            <aside
              className="hidden md:flex md:flex-col fixed left-0 top-0 z-[25] h-screen max-h-screen flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
              style={{
                width: leftWidth,
                backgroundColor: DS.colors.background.panel,
                borderRight: `1px solid ${DS.colors.border.subtle}`,
              }}
            >
              {leftPanel}
            </aside>
            <div
              className="hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out"
              style={{ width: leftWidth }}
              aria-hidden
            />
          </>
        )}

        {/* CENTER PANEL - Main Workspace */}
        <main className="flex-1 min-h-screen min-w-0 overflow-hidden flex flex-col">
          {centerPanel}
        </main>

        {/* RIGHT PANEL - Contextual Information */}
        {!hideRightPanel && rightPanelVisible && rightPanel && (
          <aside
            className="hidden lg:block flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
            style={{
              width: DS.layout.rightPanel.width,
              backgroundColor: DS.colors.background.panel,
              borderLeft: `1px solid ${DS.colors.border.subtle}`,
            }}
          >
            {rightPanel}
          </aside>
        )}

        {/* MOBILE NAV DRAWER - uses leftPanel content for page options */}
        {mobileNavOpen && !hideLeftPanel && (
          <div className="fixed inset-0 z-40 md:hidden">
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
                  <X size={18} />
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
    <div className={`h-full flex flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function RightPanel({ children, className = '' }: PanelProps) {
  return (
    <div className={`h-full flex flex-col overflow-y-auto ${className}`}>
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
      className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b"
      style={{
        borderColor: DS.colors.border.subtle,
        backgroundColor: DS.colors.background.panel,
      }}
    >
      {children || (
        <>
          {title && (
            <h2
              className="text-lg font-semibold"
              style={{ color: DS.colors.text.primary }}
            >
              {title}
            </h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </>
      )}
    </div>
  );
}

export function PanelContent({ children, className = '' }: PanelProps) {
  return (
    <div className={`flex-1 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}
