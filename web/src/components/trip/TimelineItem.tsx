import React, { useState } from 'react';

export interface TimelineItemProps {
  time?: string;
  title: string;
  location?: string;
  duration?: string;
  cost?: string;
  tags?: string[];
  type?: 'place' | 'transfer' | 'meal' | 'accommodation';
  selected?: boolean;
  index?: number;
  onClick?: () => void;
}

const vehicleIcons: Record<string, string> = {
  walking: 'directions_walk',
  bike: 'two_wheeler',
  car: 'directions_car',
  bus: 'directions_bus',
};

export const TimelineItem: React.FC<TimelineItemProps> = ({
  time,
  title,
  location,
  duration,
  cost,
  tags = [],
  type = 'place',
  selected = false,
  index,
  onClick,
}) => {
  const [hover, setHover] = useState(false);

  const getLeftAccent = () => {
    if (type === 'meal') return '4px solid #F77F00';
    if (type === 'accommodation') return '4px solid #20A7D8';
    return undefined;
  };

  const getIndexBg = () => {
    if (type === 'transfer') return '#D8B98A';
    return '#20A7D8';
  };

  if (type === 'transfer') {
    return (
      <div
        onClick={onClick}
        style={{
          border: '2px dashed #D8B98A',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: 'transparent',
          cursor: onClick ? 'pointer' : 'default',
          fontFamily: "'Be Vietnam Pro', sans-serif",
          marginLeft: 24,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: getIndexBg(),
            border: '2px solid #111111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFDF3',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {vehicleIcons[location?.toLowerCase() || ''] || 'directions_car'}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#111111' }}>{title}</div>
          {duration && (
            <div style={{ fontSize: 11, color: '#7A6A58', fontWeight: 600 }}>
              {duration} {cost ? `• ${cost}` : ''}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: selected ? '#FFF3C4' : '#FFFDF3',
        border: selected ? '3px solid #20A7D8' : '2px solid #111111',
        boxShadow: selected
          ? '4px 4px 0 #20A7D8'
          : hover
          ? '5px 5px 0 #111111'
          : '3px 3px 0 #111111',
        borderRadius: 16,
        padding: 16,
        cursor: onClick ? 'pointer' : 'default',
        transform: hover && !selected ? 'translate(-2px,-2px)' : 'none',
        transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease, border-color 200ms ease, background-color 200ms ease',
        borderLeft: getLeftAccent(),
        display: 'flex',
        gap: 16,
        fontFamily: "'Be Vietnam Pro', sans-serif",
        position: 'relative',
      }}
    >
      {/* Index Number */}
      {index !== undefined && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#20A7D8',
            border: '2px solid #111111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF6DE',
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
            boxShadow: '1px 1px 0 #111111',
          }}
        >
          {index}
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <h4
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 700,
              color: '#111111',
              margin: 0,
            }}
          >
            {title}
          </h4>

          {time && (
            <span
              style={{
                background: '#FFD166',
                border: '2px solid #111111',
                boxShadow: '2px 2px 0 #111111',
                borderRadius: 9999,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#111111',
                whiteSpace: 'nowrap',
              }}
            >
              {time}
            </span>
          )}
        </div>

        {location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#3A2F2A', fontWeight: 500 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#20A7D8' }}>location_on</span>
            {location}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          {/* Metadata */}
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#7A6A58', fontWeight: 600 }}>
            {duration && <span>⏱ {duration}</span>}
            {cost && <span>💰 {cost}</span>}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    background: '#FFF6DE',
                    border: '1.5px solid #111111',
                    borderRadius: 6,
                    padding: '1px 6px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#3A2F2A',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
