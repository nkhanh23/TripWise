import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  tabs,
  activeTab: controlledActiveTab,
  onChange,
  variant = 'default',
  className = '',
}) => {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id ?? '');
  const isControlled = controlledActiveTab !== undefined;
  const activeId = isControlled ? controlledActiveTab! : internalActive;

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSelect = useCallback(
    (id: string) => {
      if (!isControlled) setInternalActive(id);
      onChange?.(id);
    },
    [isControlled, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (index + 1) % tabs.length;
      tabRefs.current[next]?.focus();
      handleSelect(tabs[next].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (index - 1 + tabs.length) % tabs.length;
      tabRefs.current[prev]?.focus();
      handleSelect(tabs[prev].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      tabRefs.current[0]?.focus();
      handleSelect(tabs[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = tabs.length - 1;
      tabRefs.current[last]?.focus();
      handleSelect(tabs[last].id);
    }
  };

  const activeContent = tabs.find((t) => t.id === activeId)?.content;

  /* ── Style helpers ── */
  const getTabStyle = (id: string, index: number): React.CSSProperties => {
    const isActive = id === activeId;
    if (variant === 'pills') {
      return {
        padding: '8px 20px',
        borderRadius: 9999,
        border: isActive ? '2px solid #111111' : '2px solid #D8B98A',
        backgroundColor: isActive ? '#20A7D8' : '#FFF6DE',
        color: isActive ? '#FFF6DE' : '#7A6A58',
        fontFamily: "'Be Vietnam Pro', sans-serif",
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 150ms ease',
        boxShadow: isActive ? '2px 2px 0 #111111' : 'none',
        outline: 'none',
      };
    }
    if (variant === 'ticket') {
      return {
        padding: '10px 20px',
        borderRadius: '12px 12px 0 0',
        border: isActive ? '2px solid #111111' : '2px solid #D8B98A',
        borderBottom: isActive ? '3px dashed #111111' : '2px solid #D8B98A',
        backgroundColor: isActive ? '#FFD166' : '#FFF6DE',
        color: isActive ? '#111111' : '#7A6A58',
        fontFamily: isActive ? "'Luckiest Guy', cursive" : "'Be Vietnam Pro', sans-serif",
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 150ms ease',
        position: 'relative',
        boxShadow: isActive ? '3px 3px 0 #111111' : 'none',
        outline: 'none',
        letterSpacing: isActive ? '0.5px' : 0,
      };
    }
    // default
    return {
      padding: '10px 20px',
      borderRadius: 12,
      border: isActive ? '2px solid #111111' : '2px solid #D8B98A',
      backgroundColor: isActive ? '#FFD166' : '#FFF6DE',
      color: isActive ? '#111111' : '#7A6A58',
      fontFamily: isActive ? "'Luckiest Guy', cursive" : "'Be Vietnam Pro', sans-serif",
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 150ms ease',
      boxShadow: isActive ? '3px 3px 0 #111111' : 'none',
      outline: 'none',
      letterSpacing: isActive ? '0.5px' : 0,
    };
  };

  const tabListStyle: React.CSSProperties = {
    display: 'flex',
    gap: variant === 'ticket' ? 4 : 8,
    flexWrap: 'wrap',
    alignItems: variant === 'ticket' ? 'flex-end' : 'center',
    borderBottom: variant === 'ticket' ? 'none' : '2px solid #EBD8B7',
    paddingBottom: variant === 'ticket' ? 0 : 0,
    marginBottom: 0,
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: '#FFFDF3',
    border: '2px solid #111111',
    borderRadius: variant === 'ticket' ? '0 12px 12px 12px' : 12,
    borderTopLeftRadius: variant === 'ticket' && tabs.findIndex(t => t.id === activeId) === 0 ? 0 : undefined,
    padding: 20,
    boxShadow: '4px 4px 0 #111111',
    animation: 'tabFadeIn 200ms ease both',
  };

  return (
    <div className={className} style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <style>{`
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tw-tab-btn { transition: transform 120ms ease, box-shadow 120ms ease; }
        .tw-tab-btn:hover:not([aria-selected='true']) { transform: translateY(-2px); background-color: #FFF3C4 !important; }
        .tw-tab-btn[aria-selected='true'] { transform: translateY(-1px); }
        .ticket-notch::before {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 12px;
          background: #F7E7C6;
          border-radius: 50%;
          border: 2px solid #111111;
          z-index: 1;
        }
      `}</style>

      <div role="tablist" aria-label="tabs" style={tabListStyle}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === activeId}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={tab.id === activeId ? 0 : -1}
            className={`tw-tab-btn${variant === 'ticket' && tab.id === activeId ? ' ticket-notch' : ''}`}
            style={{ ...getTabStyle(tab.id, i), position: 'relative' }}
            onClick={() => handleSelect(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeContent !== undefined && (
        <div
          role="tabpanel"
          id={`tabpanel-${activeId}`}
          aria-labelledby={`tab-${activeId}`}
          key={activeId}
          style={panelStyle}
        >
          {activeContent}
        </div>
      )}
    </div>
  );
};
