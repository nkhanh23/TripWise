import React, { useState } from 'react';

export interface DestinationCardProps {
  name: string;
  location: string;
  imageUrl?: string;
  tags?: string[];
  rating?: number;
  price?: string;
  onAdd?: () => void;
  onSave?: () => void;
  category?: string;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  name,
  location,
  imageUrl,
  tags = [],
  rating,
  price,
  onAdd,
  onSave,
  category,
}) => {
  const [hover, setHover] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(!saved);
    onSave?.();
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 280,
        backgroundColor: '#FFFDF3',
        border: '3px solid #111111',
        boxShadow: hover ? '10px 10px 0 #111111' : '6px 6px 0 #111111',
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hover ? 'translate(-4px,-4px) rotate(-0.5deg)' : 'none',
        transition: 'transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 240ms ease',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {/* Image / Thumbnail Top portion */}
      <div
        style={{
          height: 160,
          position: 'relative',
          backgroundColor: '#F3C99B',
          borderBottom: '2px solid #111111',
          overflow: 'hidden',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #F3C99B 0%, #FFD166 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#111111', opacity: 0.6 }}>
              camera_alt
            </span>
          </div>
        )}

        {/* Decorative Postage Stamp Badge overlay */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 40,
            height: 48,
            border: '2px solid #111111',
            borderRadius: 4,
            backgroundColor: '#FFF6DE',
            padding: 2,
            boxShadow: '1px 1px 0 #111111',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', color: '#7A6A58' }}>TripWise</span>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#20A7D8', margin: '2px 0' }}>explore</span>
          <span style={{ fontSize: 8, fontWeight: 900, color: '#111111' }}>1930</span>
        </div>

        {/* Category sticker */}
        {category && (
          <span
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: '#FFF6DE',
              border: '1.5px solid #111111',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 800,
              color: '#111111',
              boxShadow: '1px 1px 0 #111111',
            }}
          >
            {category}
          </span>
        )}
      </div>

      {/* Content Area */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <h4
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 700,
              textShadow: '2px 2px 0 #FFD166',
              color: '#111111',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {name}
          </h4>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: '#7A6A58',
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#20A7D8' }}>location_on</span>
            {location}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  background: idx % 2 === 0 ? '#D6F1FB' : '#EDFCC8',
                  border: '1.5px solid #111111',
                  borderRadius: 6,
                  padding: '1px 6px',
                  fontSize: 9,
                  fontWeight: 800,
                  color: '#111111',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Rating and Price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {rating !== undefined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#F77F00', fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111111' }}>{rating}</span>
            </div>
          ) : (
            <div />
          )}

          {price && (
            <span
              style={{
                background: '#B8F24A',
                border: '1.5px solid #111111',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 800,
                color: '#111111',
              }}
            >
              {price}
            </span>
          )}
        </div>

        {/* Action Button Row */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderTop: '1.5px solid #EBD8B7',
            paddingTop: 12,
            marginTop: 4,
          }}
        >
          {onAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              style={{
                flex: 1,
                background: '#20A7D8',
                border: '2px solid #111111',
                boxShadow: '2px 2px 0 #111111',
                borderRadius: 10,
                padding: '6px 12px',
                color: '#FFF6DE',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
              Thêm vào trip
            </button>
          )}

          <button
            onClick={handleSaveClick}
            style={{
              width: 34,
              height: 34,
              background: '#FFF6DE',
              border: '2px solid #111111',
              boxShadow: '2px 2px 0 #111111',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: saved ? '#E6392E' : '#7A6A58',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                fontVariationSettings: saved ? "'FILL' 1" : undefined,
              }}
            >
              favorite
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
