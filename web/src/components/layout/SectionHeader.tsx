import React from 'react';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  titleSize?: 'section' | 'page';
  badge?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  align = 'left',
  titleSize = 'section',
  badge,
  action,
}) => {
  const isCenter = align === 'center';

  const containerStyle: React.CSSProperties = {
    marginBottom: '40px',
    textAlign: isCenter ? 'center' : 'left',
    fontFamily: "'Be Vietnam Pro', sans-serif",
  };

  const innerBlockStyle: React.CSSProperties = action
    ? {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }
    : {};

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#FFD166',
    border: '2px solid #111111',
    boxShadow: '2px 2px 0 #111111',
    fontWeight: 700,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '2px 10px',
    borderRadius: '9999px',
    marginBottom: '8px',
    color: '#111111',
    fontFamily: "'Be Vietnam Pro', sans-serif",
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: titleSize === 'section' ? '48px' : '32px',
    fontWeight: 800,
    color: '#111111',
    textShadow:
      titleSize === 'section'
        ? '3px 4px 0 #FFD166'
        : '2px 3px 0 #FFD166',
    lineHeight: 1.05,
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontFamily: "'Be Vietnam Pro', sans-serif",
    color: '#7A6A58',
    marginTop: '8px',
    fontSize: '16px',
    lineHeight: 1.6,
    fontWeight: 400,
  };

  return (
    <div style={containerStyle}>
      {badge && <span style={badgeStyle}>{badge}</span>}

      <div style={innerBlockStyle}>
        {/* Title + subtitle block */}
        <div style={{ flex: 1 }}>
          <h2 style={titleStyle}>{title}</h2>
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        </div>

        {/* Optional action slot */}
        {action && (
          <div style={{ flexShrink: 0, alignSelf: 'center' }}>{action}</div>
        )}
      </div>
    </div>
  );
};

export default SectionHeader;
