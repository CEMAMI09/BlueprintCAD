/**
 * Three-Panel Layout System
 * Professional CAD SaaS layout with left navigation, center workspace, and right context panel
 */

'use client';

import { ReactNode, useState, createContext, useContext } from 'react';
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
        className="h-screen w-screen overflow-hidden flex"
        style={{ backgroundColor: DS.colors.background.app }}
      >
        {/* LEFT PANEL - Navigation Sidebar */}
        {!hideLeftPanel && (
          <aside
            className="flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
            style={{
              width: leftWidth,
              backgroundColor: DS.colors.background.panel,
              borderRight: `1px solid ${DS.colors.border.subtle}`,
            }}
          >
            {leftPanel}
          </aside>
        )}

        {/* CENTER PANEL - Main Workspace */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {centerPanel}
        </main>

        {/* RIGHT PANEL - Contextual Information */}
        {!hideRightPanel && rightPanelVisible && rightPanel && (
          <aside
            className="flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
            style={{
              width: DS.layout.rightPanel.width,
              backgroundColor: DS.colors.background.panel,
              borderLeft: `1px solid ${DS.colors.border.subtle}`,
            }}
          >
            {rightPanel}
          </aside>
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
