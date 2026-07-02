import React, { useState } from 'react';

export interface StatItem {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}

export interface TripStatsProps {
  stats: StatItem[];
  variant?: 'horizontal' | 'grid';
}

export const TripStats: React.FC<TripStatsProps> = ({ stats, variant = 'grid' }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: variant === 'horizontal'
          ? `repeat(${stats.length}, minmax(0, 1fr))`
          : 'repeat(2, minmax(0, 1fr))',
        gap: 12,
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {stats.map((stat, i) => (
        <StatBlock key={i} stat={stat} />
      ))}
    </div>
  );
};

const StatBlock: React.FC<{ stat: StatItem }> = ({ stat }) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: '#FFF6DE',
        border: stat.highlight ? '2px solid #20A7D8' : '2px solid #111111',
        boxShadow: hover
          ? (stat.highlight ? '5px 5px 0 #20A7D8' : '5px 5px 0 #111111')
          : (stat.highlight ? '3px 3px 0 #20A7D8' : '3px 3px 0 #111111'),
        borderRadius: 12,
        padding: 16,
        transform: hover ? 'translate(-2px,-2px)' : 'none',
        transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 24, color: stat.highlight ? '#20A7D8' : '#20A7D8' }}
      >
        {stat.icon}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#7A6A58',
        }}
      >
        {stat.label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 800,
          color: stat.highlight ? '#20A7D8' : '#111111',
          lineHeight: 1.1,
        }}
      >
        {stat.value}
      </span>
    </div>
  );
};
