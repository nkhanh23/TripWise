import React, { useState } from 'react';
import { Button } from './Button';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'banner';
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title,
  message,
  onRetry,
  onDismiss,
  variant = 'banner',
  className = '',
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isBanner = variant === 'banner';

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: '#FFDDDB',
    border: '2px solid #E6392E',
    boxShadow: '4px 4px 0 #111111',
    borderRadius: '16px',
    padding: isBanner ? '16px' : '10px 14px',
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div className={className} style={containerStyle} role="alert" aria-live="assertive">
      {/* Error icon */}
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '24px',
          color: '#E6392E',
          lineHeight: 1,
          flexShrink: 0,
          marginTop: '1px',
          fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24",
        }}
      >
        error
      </span>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <p
            style={{
              margin: '0 0 2px',
              fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: isBanner ? '14px' : '13px',
              color: '#111111',
              lineHeight: 1.3,
            }}
          >
            {title}
          </p>
        )}
        <p
          style={{
            margin: 0,
            fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
            fontSize: isBanner ? '14px' : '12px',
            color: '#3A2F2A',
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        {onRetry && (
          <div style={{ marginTop: '10px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '14px',
                  lineHeight: 1,
                  fontVariationSettings: "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20",
                  marginRight: '6px',
                }}
              >
                refresh
              </span>
              Thử lại
            </Button>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss error"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            color: '#7A6A58',
            lineHeight: 1,
            transition: 'color 0.12s ease, background 0.12s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#111111';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.07)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#7A6A58';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '18px',
              fontVariationSettings: "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20",
            }}
          >
            close
          </span>
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
