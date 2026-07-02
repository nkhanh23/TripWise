import React, { useState } from 'react';

interface CardProps {
  variant?: 'default' | 'poster' | 'ticket' | 'speech' | 'mapOverlay';
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  posterColor?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  title,
  subtitle,
  children,
  className = '',
  hoverable = false,
  badge,
  action,
  onClick,
  posterColor = '#20A7D8',
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isClickable = !!onClick;

  const getHoverTransform = () => {
    if (!hoverable || !isHovered) return undefined;
    return 'translate(-3px, -3px)';
  };

  const getHoverShadow = (baseShadow: string) => {
    if (!hoverable || !isHovered) return baseShadow;
    return '8px 8px 0 #111111';
  };

  const baseTransition = 'transform 0.15s ease, box-shadow 0.15s ease';

  // ─── DEFAULT ────────────────────────────────────────────────────────────────
  if (variant === 'default') {
    const shadow = getHoverShadow('4px 4px 0 #111111');
    return (
      <div
        className={className}
        onClick={onClick}
        onMouseEnter={() => hoverable && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          background: '#FFFDF3',
          border: '2px solid #111111',
          borderRadius: '20px',
          boxShadow: shadow,
          padding: '20px',
          transform: getHoverTransform(),
          transition: baseTransition,
          cursor: isClickable ? 'pointer' : 'default',
          ...style,
        }}
      >
        {badge && (
          <div style={{ position: 'absolute', top: '12px', right: '12px' }}>{badge}</div>
        )}
        {(title || subtitle) && (
          <div style={{ marginBottom: children ? '12px' : 0 }}>
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#111111',
                  letterSpacing: '0.5px',
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                  fontSize: '13px',
                  color: '#7A6A58',
                  fontWeight: 500,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
        {action && <div style={{ marginTop: '16px' }}>{action}</div>}
      </div>
    );
  }

  // ─── POSTER ─────────────────────────────────────────────────────────────────
  if (variant === 'poster') {
    const shadow = getHoverShadow('6px 6px 0 #111111');
    return (
      <div
        className={className}
        onClick={onClick}
        onMouseEnter={() => hoverable && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          background: '#FFF6DE',
          border: '3px solid #111111',
          borderRadius: '20px',
          boxShadow: shadow,
          overflow: 'hidden',
          transform: getHoverTransform(),
          transition: baseTransition,
          cursor: isClickable ? 'pointer' : 'default',
          ...style,
        }}
      >
        {badge && (
          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2 }}>{badge}</div>
        )}
        {/* Header strip */}
        <div
          style={{
            background: posterColor,
            padding: '14px 20px',
            borderBottom: '3px solid #111111',
          }}
        >
          {title && (
            <h3
              style={{
                margin: 0,
                fontFamily: "'Luckiest Guy', 'Bangers', cursive",
                fontSize: '20px',
                fontWeight: 800,
                color: '#FFF6DE',
                letterSpacing: '0.5px',
                textShadow: '2px 2px 0 rgba(0,0,0,0.3)',
              }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              style={{
                margin: '4px 0 0',
                fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                fontSize: '13px',
                color: 'rgba(255,246,222,0.85)',
                fontWeight: 500,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {/* Body */}
        <div style={{ padding: '20px' }}>
          {children}
          {action && <div style={{ marginTop: '16px' }}>{action}</div>}
        </div>
      </div>
    );
  }

  // ─── TICKET ─────────────────────────────────────────────────────────────────
  if (variant === 'ticket') {
    const shadow = getHoverShadow('4px 4px 0 #111111');
    return (
      <div
        className={className}
        onClick={onClick}
        onMouseEnter={() => hoverable && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          background: '#FFFDF3',
          border: '2px solid #111111',
          borderLeft: '4px solid #FFD166',
          borderRadius: '16px',
          boxShadow: shadow,
          padding: '16px 20px 16px 28px',
          transform: getHoverTransform(),
          transition: baseTransition,
          cursor: isClickable ? 'pointer' : 'default',
          ...style,
        }}
      >
        {/* Punch hole */}
        <div
          style={{
            position: 'absolute',
            left: '-10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#F7E7C6',
            border: '2px solid #111111',
            zIndex: 1,
          }}
        />
        {badge && (
          <div style={{ position: 'absolute', top: '12px', right: '12px' }}>{badge}</div>
        )}
        {(title || subtitle) && (
          <div style={{ marginBottom: children ? '10px' : 0 }}>
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontFamily: "'Luckiest Guy', 'Bangers', cursive",
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#111111',
                  letterSpacing: '0.5px',
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                  fontSize: '13px',
                  color: '#7A6A58',
                  fontWeight: 500,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
        {action && <div style={{ marginTop: '12px' }}>{action}</div>}
      </div>
    );
  }

  // ─── SPEECH ─────────────────────────────────────────────────────────────────
  if (variant === 'speech') {
    const shadow = getHoverShadow('4px 4px 0 #111111');
    return (
      <div
        className={className}
        onClick={onClick}
        onMouseEnter={() => hoverable && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          marginBottom: '18px', // space for tail
          ...style,
        }}
      >
        <div
          style={{
            position: 'relative',
            background: '#FFF6DE',
            border: '2px solid #111111',
            borderRadius: '20px',
            boxShadow: shadow,
            padding: '18px 20px',
            transform: getHoverTransform(),
            transition: baseTransition,
            cursor: isClickable ? 'pointer' : 'default',
          }}
        >
          {badge && (
            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>{badge}</div>
          )}
          {(title || subtitle) && (
            <div style={{ marginBottom: children ? '10px' : 0 }}>
              {title && (
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Luckiest Guy', 'Bangers', cursive",
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#111111',
                  }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                    fontSize: '13px',
                    color: '#7A6A58',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {children}
          {action && <div style={{ marginTop: '12px' }}>{action}</div>}
        </div>
        {/* Speech bubble tail */}
        <div
          style={{
            position: 'absolute',
            bottom: '-16px',
            left: '28px',
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '16px solid #111111',
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-13px',
            left: '30px',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '13px solid #FFF6DE',
            zIndex: 2,
          }}
        />
      </div>
    );
  }

  // ─── MAP OVERLAY ────────────────────────────────────────────────────────────
  if (variant === 'mapOverlay') {
    const shadow = getHoverShadow('4px 4px 0 #111111');
    return (
      <div
        className={className}
        onClick={onClick}
        onMouseEnter={() => hoverable && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          background: 'rgba(255, 253, 243, 0.97)',
          border: '3px solid #111111',
          borderRadius: '16px',
          boxShadow: shadow,
          padding: '12px 16px',
          transform: getHoverTransform(),
          transition: baseTransition,
          cursor: isClickable ? 'pointer' : 'default',
          backdropFilter: 'blur(4px)',
          ...style,
        }}
      >
        {badge && (
          <div style={{ position: 'absolute', top: '8px', right: '8px' }}>{badge}</div>
        )}
        {(title || subtitle) && (
          <div style={{ marginBottom: children ? '8px' : 0 }}>
            {title && (
              <h4
                style={{
                  margin: 0,
                  fontFamily: "'Luckiest Guy', 'Bangers', cursive",
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#111111',
                  letterSpacing: '0.3px',
                }}
              >
                {title}
              </h4>
            )}
            {subtitle && (
              <p
                style={{
                  margin: '2px 0 0',
                  fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7A6A58',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
        {action && <div style={{ marginTop: '10px' }}>{action}</div>}
      </div>
    );
  }

  return null;
};

export default Card;
