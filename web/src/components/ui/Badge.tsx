import React from 'react';

interface BadgeProps {
  variant?: 'info' | 'success' | 'warn' | 'error' | 'neutral' | 'sticker';
  children: React.ReactNode;
  icon?: string; // material symbol name
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

type VariantStyle = {
  background: string;
  color: string;
  border: string;
  boxShadow?: string;
  transform?: string;
};

const variantStyles: Record<NonNullable<BadgeProps['variant']>, VariantStyle> = {
  info: {
    background: '#D6F1FB',
    color: '#087CA7',
    border: '2px solid #111111',
  },
  success: {
    background: '#B8F24A',
    color: '#111111',
    border: '2px solid #111111',
  },
  warn: {
    background: '#FFD166',
    color: '#111111',
    border: '2px solid #111111',
  },
  error: {
    background: '#E6392E',
    color: '#FFF6DE',
    border: '2px solid #111111',
  },
  neutral: {
    background: '#F7E7C6',
    color: '#3A2F2A',
    border: '2px solid #111111',
  },
  sticker: {
    background: '#FFD166',
    color: '#111111',
    border: '2px solid #111111',
    boxShadow: '2px 2px 0 #111111',
    transform: 'skewX(-1deg)',
  },
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, React.CSSProperties> = {
  sm: {
    fontSize: '12px',
    padding: '2px 8px',
  },
  md: {
    fontSize: '14px',
    padding: '4px 12px',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  size = 'md',
  className = '',
  style,
}) => {
  const vs = variantStyles[variant];
  const ss = sizeStyles[size];

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '9999px',
    fontWeight: 700,
    fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
    lineHeight: 1.3,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    ...vs,
    ...ss,
    ...style,
  };

  const iconSize = size === 'sm' ? '14px' : '16px';

  return (
    <span className={className} style={badgeStyle}>
      {icon && (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: iconSize,
            lineHeight: 1,
            fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20",
          }}
        >
          {icon}
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
