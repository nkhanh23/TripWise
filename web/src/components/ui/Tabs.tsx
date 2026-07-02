import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: React.ReactNode;
  content?: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (id: string) => void;
  variant?: 'default' | 'ticket' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs = [],
  activeTab,
  onChange,
  variant = 'default',
  className = '',
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id);

  const controlled = activeTab !== undefined;
  const currentTab = controlled ? activeTab : internalActiveTab;

  const handleTabChange = (id: string) => {
    if (!controlled) setInternalActiveTab(id);
    onChange?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight') {
      const nextIdx = (idx + 1) % tabs.length;
      handleTabChange(tabs[nextIdx].id);
      (e.currentTarget.parentElement?.children[nextIdx] as HTMLElement)?.focus();
    } else if (e.key === 'ArrowLeft') {
      const prevIdx = (idx - 1 + tabs.length) % tabs.length;
      handleTabChange(tabs[prevIdx].id);
      (e.currentTarget.parentElement?.children[prevIdx] as HTMLElement)?.focus();
    }
  };

  const activeContent = tabs.find(t => t.id === currentTab)?.content;

  return (
    <div className={className} style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Tab List Header wrapper */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: variant === 'default' ? 0 : 8,
          borderBottom: variant === 'default' ? '2px solid #111111' : undefined,
          marginBottom: 16,
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive = currentTab === tab.id;

          // Default styles
          let tabStyle: React.CSSProperties = {
            padding: '8px 20px',
            border: '2px solid #111111',
            borderRadius: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 14,
            whiteSpace: 'nowrap',
            transition: 'all 150ms ease',
            fontFamily: "var(--font-display)",
          };

          if (variant === 'default') {
            tabStyle = {
              ...tabStyle,
              backgroundColor: isActive ? '#FFD166' : '#FFF6DE',
              boxShadow: isActive ? '3px 3px 0 #111111' : 'none',
              transform: isActive ? 'translate(-1px,-1px)' : 'none',
              borderBottom: isActive ? '2px solid #111111' : '2px solid #111111',
            };
          } else if (variant === 'pills') {
            tabStyle = {
              ...tabStyle,
              borderRadius: 9999,
              backgroundColor: isActive ? '#20A7D8' : '#FFF6DE',
              color: isActive ? '#FFF6DE' : '#111111',
              boxShadow: isActive ? '3px 3px 0 #111111' : 'none',
              transform: isActive ? 'translate(-1px,-1px)' : 'none',
            };
          } else if (variant === 'ticket') {
            tabStyle = {
              ...tabStyle,
              backgroundColor: isActive ? '#FFD166' : '#FFF6DE',
              boxShadow: isActive ? '3px 3px 0 #111111' : 'none',
              transform: isActive ? 'translate(-1px,-1px)' : 'none',
              borderBottom: isActive ? '2px dashed #111111' : '2px solid #111111',
            };
          }

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              style={tabStyle}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeContent && (
        <div role="tabpanel" className="animate-pop-in">
          {activeContent}
        </div>
      )}
    </div>
  );
};
