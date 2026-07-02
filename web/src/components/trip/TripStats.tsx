import React from 'react';

interface StatItem {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}

interface TripStatsProps {
  stats: StatItem[];
  variant?: 'horizontal' | 'grid';
}

export const TripStats: React.FC<TripStatsProps> = ({ stats, variant = 'grid' }) => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Be+Vietnam+Pro:wght@400;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        .trip-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .trip-stats-horizontal {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .stat-block {
          background: #FFF6DE;
          border: 2px solid #111111;
          box-shadow: 3px 3px 0 #111111;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: transform 140ms ease, box-shadow 140ms ease;
        }
        .stat-block:hover {
          transform: translate(-2px, -2px);
          box-shadow: 5px 5px 0 #111111;
        }
        .stat-block.highlight {
          border: 2px solid #20A7D8;
          box-shadow: 3px 3px 0 #20A7D8;
        }
        .stat-block.highlight:hover {
          box-shadow: 5px 5px 0 #20A7D8;
        }
        .stat-icon {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
          color: #20A7D8;
          font-size: 24px;
        }
        .stat-label {
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 600;
          font-family: 'Be Vietnam Pro', sans-serif;
          color: #7A6A58;
          margin-bottom: 4px;
          letter-spacing: 0.07em;
        }
        .stat-value {
          font-family: 'Luckiest Guy', 'Bangers', cursive;
          font-size: 28px;
          font-weight: 800;
          color: #111111;
          line-height: 1;
        }
        .stat-value.highlight {
          color: #20A7D8;
        }
      `}</style>
      <div className={variant === 'horizontal' ? 'trip-stats-horizontal' : 'trip-stats-grid'}>
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`stat-block${stat.highlight ? ' highlight' : ''}`}
            style={variant === 'horizontal' ? { flex: '1 1 140px' } : undefined}
          >
            <span className="stat-icon">{stat.icon}</span>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-value${stat.highlight ? ' highlight' : ''}`}>{stat.value}</div>
          </div>
        ))}
      </div>
    </>
  );
};

export default TripStats;
