import React from 'react';

interface TripHeaderProps {
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

const statusConfig: Record<string, { label: string; bg: string; border: string; color: string }> = {
  planned: { label: 'Planned', bg: '#D6F1FB', border: '#20A7D8', color: '#087CA7' },
  optimized: { label: 'Optimized', bg: '#B8F24A', border: '#111111', color: '#111111' },
  draft: { label: 'Draft', bg: '#F7E7C6', border: '#111111', color: '#7A6A58' },
  completed: { label: 'Completed', bg: '#B8F24A', border: '#111111', color: '#111111' },
};

export const TripHeader: React.FC<TripHeaderProps> = ({
  title,
  subtitle,
  destination,
  dateRange,
  duration,
  status = 'draft',
  onSave,
  onShare,
  onRegenerate,
}) => {
  const s = statusConfig[status];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Bangers&family=Be+Vietnam+Pro:wght@400;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        .trip-header-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 12px;
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: transform 140ms ease, box-shadow 140ms ease;
          white-space: nowrap;
        }
        .trip-header-btn:hover {
          transform: translate(-2px, -2px);
        }
        .trip-header-btn-save {
          background: #FFF6DE;
          border: 2px solid #111111;
          box-shadow: 3px 3px 0 #111111;
          font-weight: 700;
          color: #111111;
        }
        .trip-header-btn-save:hover {
          box-shadow: 5px 5px 0 #111111;
        }
        .trip-header-btn-share {
          background: transparent;
          border: 2px solid #111111;
          box-shadow: none;
          font-weight: 600;
          color: #111111;
        }
        .trip-header-btn-share:hover {
          box-shadow: 3px 3px 0 #111111;
        }
        .trip-header-btn-regen {
          background: #20A7D8;
          border: 3px solid #111111;
          box-shadow: 4px 4px 0 #111111;
          font-weight: 700;
          color: #FFF6DE;
        }
        .trip-header-btn-regen:hover {
          box-shadow: 6px 6px 0 #111111;
        }
        .trip-info-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #FFF6DE;
          border: 2px solid #111111;
          box-shadow: 2px 2px 0 #111111;
          border-radius: 9999px;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Be Vietnam Pro', sans-serif;
          color: #111111;
        }
        .material-symbols-outlined {
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
        }
      `}</style>
      <header
        style={{
          width: '100%',
          background: '#FFFDF3',
          borderBottom: '2px solid #111111',
          padding: '20px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        {/* Left block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* Status badge */}
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              background: s.bg,
              border: `2px solid ${s.border}`,
              borderRadius: 9999,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              color: s.color,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {s.label}
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "'Luckiest Guy', 'Bangers', cursive",
              fontSize: 32,
              fontWeight: 800,
              textShadow: '3px 3px 0 #111111',
              color: '#111111',
              margin: '4px 0 0 0',
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p
              style={{
                fontFamily: "'Be Vietnam Pro', sans-serif",
                color: '#3A2F2A',
                fontSize: 15,
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          )}

          {/* Info chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {destination && (
              <span className="trip-info-chip">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  map
                </span>
                {destination}
              </span>
            )}
            {dateRange && (
              <span className="trip-info-chip">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  calendar_today
                </span>
                {dateRange}
              </span>
            )}
            {duration && (
              <span className="trip-info-chip">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  schedule
                </span>
                {duration}
              </span>
            )}
          </div>
        </div>

        {/* Right block: action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {onSave && (
            <button className="trip-header-btn trip-header-btn-save" onClick={onSave}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                save
              </span>
              Save
            </button>
          )}
          {onShare && (
            <button className="trip-header-btn trip-header-btn-share" onClick={onShare}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                share
              </span>
              Share
            </button>
          )}
          {onRegenerate && (
            <button className="trip-header-btn trip-header-btn-regen" onClick={onRegenerate}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                auto_awesome
              </span>
              Regenerate
            </button>
          )}
        </div>
      </header>
    </>
  );
};

export default TripHeader;
