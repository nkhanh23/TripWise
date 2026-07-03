import React, { useState } from 'react';

export interface NearestPlaceLabelProps {
  name: string;
  distance: string;
  category?: string;
  onClick?: () => void;
}

export const NearestPlaceLabel: React.FC<NearestPlaceLabelProps> = ({
  name,
  distance,
  category = 'place',
  onClick,
}) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: '#FFF6DE',
        border: '2px solid #111111',
        boxShadow: hover ? '4px 4px 0 #111111' : '2px 2px 0 #111111',
        borderRadius: 9999,
        padding: '6px 14px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: onClick ? 'pointer' : 'default',
        transform: hover ? 'translate(-2px,-2px)' : 'none',
        transition: 'transform 150ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 150ms ease',
        fontFamily: "'Be Vietnam Pro', sans-serif",
        maxWidth: 240,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#20A7D8', flexShrink: 0 }}>
        {category === 'hotel' ? 'hotel' : category === 'restaurant' ? 'restaurant' : 'place'}
      </span>
      <span
        style={{
          fontWeight: 600,
          fontSize: 12,
          color: '#111111',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      <span
        style={{
          background: '#D6F1FB',
          border: '1px solid #087CA7',
          borderRadius: 9999,
          padding: '1px 6px',
          fontSize: 10,
          fontWeight: 700,
          color: '#087CA7',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {distance}
      </span>
    </div>
  );
};
