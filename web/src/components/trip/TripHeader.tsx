import React, { useState } from 'react';

export interface TripHeaderProps {
  title: string;
  subtitle?: string;
  destination?: string;
  dateRange?: string;
  duration?: string;
  status?: 'planned' | 'optimized' | 'draft' | 'completed';
  onSave?: () => void;
  onShare?: () => void;
  onRegenerate?: () => void;
}

const statusConfig = {
  planned:   { label: 'Đã lên kế hoạch', bg: '#D6F1FB', borderColor: '#087CA7', color: '#087CA7' },
  optimized: { label: 'Tối ưu hoá ✨', bg: '#B8F24A', borderColor: '#111111', color: '#111111' },
  draft:     { label: 'Nháp', bg: '#F7E7C6', borderColor: '#7A6A58', color: '#7A6A58' },
  completed: { label: 'Hoàn thành ✓', bg: '#B8F24A', borderColor: '#111111', color: '#111111' },
};

const Chip: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: '#FFF6DE',
      border: '2px solid #111111',
      boxShadow: '2px 2px 0 #111111',
      borderRadius: 9999,
      padding: '3px 10px',
      fontSize: 12,
      fontWeight: 600,
      color: '#111111',
      fontFamily: "'Be Vietnam Pro', sans-serif",
    }}
  >
    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
    {label}
  </span>
);

const ActionBtn: React.FC<{
  label: string;
  icon: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
}> = ({ label, icon, variant = 'secondary', onClick }) => {
  const [hover, setHover] = useState(false);

  const varStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: hover ? '#087CA7' : '#20A7D8',
      color: '#FFF6DE',
      border: '3px solid #111111',
      boxShadow: hover ? '6px 6px 0 #111111' : '4px 4px 0 #111111',
      transform: hover ? 'translate(-2px,-2px)' : 'none',
    },
    secondary: {
      background: '#FFF6DE',
      color: '#111111',
      border: '2px solid #111111',
      boxShadow: hover ? '5px 5px 0 #111111' : '3px 3px 0 #111111',
      transform: hover ? 'translate(-2px,-2px)' : 'none',
    },
    ghost: {
      background: 'transparent',
      color: '#111111',
      border: '2px solid #D8B98A',
      boxShadow: 'none',
    },
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...varStyles[variant],
        borderRadius: 12,
        padding: '8px 16px',
        minHeight: 40,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: "'Be Vietnam Pro', sans-serif",
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'transform 150ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 150ms ease, background 100ms ease',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  );
};

export const TripHeader: React.FC<TripHeaderProps> = ({
  title,
  subtitle,
  destination,
  dateRange,
  duration,
  status = 'planned',
  onSave,
  onShare,
  onRegenerate,
}) => {
  const sc = statusConfig[status];

  return (
    <div
      style={{
        backgroundColor: '#FFFDF3',
        borderBottom: '2px solid #111111',
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        flexWrap: 'wrap',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {/* Left block */}
      <div>
        {/* Status badge */}
        <span
          style={{
            display: 'inline-block',
            background: sc.bg,
            border: `2px solid ${sc.borderColor}`,
            borderRadius: 9999,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: sc.color,
            marginBottom: 6,
          }}
        >
          {sc.label}
        </span>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 800,
            textShadow: '3px 3px 0 #FFD166',
            color: '#111111',
            margin: '4px 0 6px',
            lineHeight: 1.0,
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p style={{ color: '#3A2F2A', fontSize: 15, margin: '0 0 12px' }}>{subtitle}</p>
        )}

        {/* Info chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {destination && <Chip icon="location_on" label={destination} />}
          {dateRange && <Chip icon="calendar_today" label={dateRange} />}
          {duration && <Chip icon="schedule" label={duration} />}
        </div>
      </div>

      {/* Right — actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ActionBtn label="Lưu" icon="bookmark" variant="secondary" onClick={onSave} />
        <ActionBtn label="Chia sẻ" icon="share" variant="ghost" onClick={onShare} />
        <ActionBtn label="Tạo lại" icon="auto_awesome" variant="primary" onClick={onRegenerate} />
      </div>
    </div>
  );
};
