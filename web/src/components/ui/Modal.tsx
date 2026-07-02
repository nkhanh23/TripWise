import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 480,
    md: 600,
    lg: 760,
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17,17,17,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFDF3',
          border: '3px solid #111111',
          boxShadow: '8px 8px 0 #111111',
          borderRadius: 24,
          width: '100%',
          maxWidth: maxWidths[size],
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          outline: 'none',
        }}
        className="animate-pop-in"
      >
        {/* Header */}
        <div
          style={{
            padding: 24,
            borderBottom: '2px solid #EBD8B7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {title && (
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 800,
                textShadow: '2px 2px 0 #FFD166',
                color: '#111111',
                margin: 0,
              }}
            >
              {title}
            </h3>
          )}

          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '2px solid #111111',
              boxShadow: '2px 2px 0 #111111',
              backgroundColor: '#FFF6DE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#111111',
              transition: 'transform 100ms ease, box-shadow 100ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-1px,-1px)';
              e.currentTarget.style.boxShadow = '3px 3px 0 #111111';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '2px 2px 0 #111111';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '2px solid #EBD8B7',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              backgroundColor: '#FFF6DE',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
