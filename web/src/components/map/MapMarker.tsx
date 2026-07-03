import React, { useState } from 'react';

interface MapMarkerProps {
  number?: number;
  label?: string;
  type?: 'place' | 'accommodation' | 'origin' | 'search';
  selected?: boolean;
  visited?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const typeConfig: Record<string, { bg: string; icon?: string; textColor: string }> = {
  accommodation: { bg: '#D6F1FB', icon: 'hotel', textColor: '#111111' },
  origin: { bg: '#FFD166', icon: 'star', textColor: '#111111' },
  search: { bg: '#FFDDDB', icon: 'search', textColor: '#111111' },
  place: { bg: '#20A7D8', textColor: '#FFF6DE' },
};

export const MapMarker: React.FC<MapMarkerProps> = ({
  number,
  label,
  type = 'place',
  selected = false,
  visited = false,
  onClick,
  style,
}) => {
  const [hovered, setHovered] = useState(false);
  const config = typeConfig[type] ?? typeConfig.place;

  const circleBg = visited ? '#B8F24A' : config.bg;
  const textColor = visited ? '#111111' : config.textColor;

  const circleStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    background: circleBg,
    border: '3px solid #111111',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: "'Be Vietnam Pro', sans-serif",
    fontWeight: 800,
    fontSize: 14,
    color: textColor,
    transition: 'transform 160ms ease, box-shadow 160ms ease',
    transform: selected ? 'scale(1.25)' : hovered ? 'scale(1.1)' : 'scale(1)',
    boxShadow: selected
      ? '0 0 0 4px #FFD166, 0 0 0 6px #111111'
      : '2px 2px 0 #111111',
    position: 'relative',
    zIndex: selected ? 10 : 1,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        @keyframes marker-bounce {
          0%, 100% { transform: scale(1.25) translateY(0); }
          50% { transform: scale(1.25) translateY(-6px); }
        }
        .animate-marker-bounce {
          animation: marker-bounce 0.6s ease infinite;
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

      <div
        style={{
          position: 'absolute',
          transform: 'translate(-50%, -100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          ...style,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
      >
        {/* Tooltip */}
        {hovered && label && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#FFFDF3',
              border: '2px solid #111111',
              boxShadow: '2px 2px 0 #111111',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              color: '#111111',
              whiteSpace: 'nowrap',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        )}

        {/* Circle pin */}
        <div
          className={selected ? 'animate-marker-bounce' : ''}
          style={circleStyle}
        >
          {config.icon ? (
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
              {config.icon}
            </span>
          ) : (
            <span>{number}</span>
          )}
        </div>

        {/* Pin tail */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '10px solid #111111',
            margin: '0 auto',
          }}
        />
      </div>
    </>
  );
};

export default MapMarker;
