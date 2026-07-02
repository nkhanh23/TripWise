import React, { useState } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'sticker';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: '#20A7D8',
    color: '#FFF6DE',
    border: '3px solid #111111',
    boxShadow: '4px 4px 0 #111111',
  },
  secondary: {
    background: '#FFF6DE',
    color: '#111111',
    border: '3px solid #111111',
    boxShadow: '4px 4px 0 #111111',
  },
  danger: {
    background: '#E6392E',
    color: '#FFF6DE',
    border: '3px solid #111111',
    boxShadow: '4px 4px 0 #111111',
  },
  ghost: {
    background: 'transparent',
    color: '#111111',
    border: '2px solid #D8B98A',
    boxShadow: 'none',
  },
  sticker: {
    background: '#FFD166',
    color: '#111111',
    border: '3px solid #111111',
    boxShadow: '4px 4px 0 #111111',
    transform: 'skewX(-1deg)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: '12px',
    minHeight: '32px',
  },
  md: {
    padding: '10px 20px',
    fontSize: '14px',
    minHeight: '40px',
  },
  lg: {
    padding: '14px 28px',
    fontSize: '16px',
    minHeight: '48px',
  },
};

const loadingDotsStyle = `
  @keyframes btn-dot-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
    40% { transform: translateY(-4px); opacity: 1; }
  }
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  style,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...rest
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const isDisabled = disabled || loading;
  const isGhost = variant === 'ghost';

  const getInteractionStyle = (): React.CSSProperties => {
    if (isDisabled) return {};
    if (isActive && !isGhost) {
      return {
        transform: variant === 'sticker'
          ? 'skewX(-1deg) translate(2px, 2px)'
          : 'translate(2px, 2px)',
        boxShadow: '2px 2px 0 #111111',
      };
    }
    if (isHovered && !isGhost) {
      return {
        transform: variant === 'sticker'
          ? 'skewX(-1deg) translate(-2px, -2px)'
          : 'translate(-2px, -2px)',
        boxShadow: '6px 6px 0 #111111',
      };
    }
    return {};
  };

  const computedStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    borderRadius: '16px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.4 : 1,
    pointerEvents: loading ? 'none' : undefined,
    transition: 'transform 0.08s ease, box-shadow 0.08s ease',
    lineHeight: 1,
    letterSpacing: '0.01em',
    userSelect: 'none',
    position: 'relative',
    whiteSpace: 'nowrap',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...getInteractionStyle(),
    ...style,
  };

  return (
    <>
      <style>{loadingDotsStyle}</style>
      <button
        className={className}
        disabled={isDisabled}
        style={computedStyle}
        onMouseEnter={(e) => {
          if (!isDisabled) setIsHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setIsHovered(false);
          setIsActive(false);
          onMouseLeave?.(e);
        }}
        onMouseDown={(e) => {
          if (!isDisabled) setIsActive(true);
          onMouseDown?.(e);
        }}
        onMouseUp={(e) => {
          setIsActive(false);
          onMouseUp?.(e);
        }}
        {...rest}
      >
        {loading ? (
          <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', height: '14px' }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'currentColor',
                  display: 'inline-block',
                  animation: `btn-dot-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </span>
        ) : (
          <>
            {leftIcon && (
              <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
};

export default Button;
