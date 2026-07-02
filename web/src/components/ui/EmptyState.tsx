import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  ctaLabel?: string;
  onCta?: () => void;
  variant?: 'trips' | 'places' | 'generic';
  className?: string;
}

const variantConfig: Record<
  NonNullable<EmptyStateProps['variant']>,
  { icon: string; iconColor: string; decorEmoji: string[] }
> = {
  trips: {
    icon: 'map',
    iconColor: '#20A7D8',
    decorEmoji: ['✈️', '🗺️', '📍'],
  },
  places: {
    icon: 'explore',
    iconColor: '#B8F24A',
    decorEmoji: ['🏔️', '🌊', '🌿'],
  },
  generic: {
    icon: 'travel_explore',
    iconColor: '#FFD166',
    decorEmoji: ['🧳', '🌍', '⭐'],
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  ctaLabel,
  onCta,
  variant = 'generic',
  className = '',
}) => {
  const config = variantConfig[variant];
  const displayIcon = icon ?? config.icon;
  const iconColor = config.iconColor;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '64px 24px',
        width: '100%',
      }}
    >
      {/* Decorative stamps above the icon */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
          opacity: 0.8,
        }}
      >
        {config.decorEmoji.map((emoji, i) => (
          <span
            key={i}
            style={{
              fontSize: i === 1 ? '22px' : '16px',
              display: 'inline-block',
              transform: i === 0 ? 'rotate(-10deg)' : i === 2 ? 'rotate(8deg)' : 'none',
              filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.15))',
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      {/* Postcard outline decoration */}
      <div
        style={{
          width: '80px',
          height: '52px',
          border: '2px dashed #D8B98A',
          borderRadius: '8px',
          marginBottom: '8px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        {/* Postcard stamp area */}
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '8px',
            width: '18px',
            height: '20px',
            border: '1.5px dashed #D8B98A',
            borderRadius: '2px',
          }}
        />
        {/* Postcard line */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '8px',
            width: '35px',
            height: '2px',
            background: '#D8B98A',
            borderRadius: '1px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '8px',
            width: '28px',
            height: '2px',
            background: '#D8B98A',
            borderRadius: '1px',
          }}
        />
      </div>

      {/* Icon circle */}
      <div
        style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          background: '#F7E7C6',
          border: '3px solid #111111',
          boxShadow: '4px 4px 0 #111111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          flexShrink: 0,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '56px',
            color: iconColor,
            lineHeight: 1,
            fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 48",
          }}
        >
          {displayIcon}
        </span>
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: '28px',
          fontWeight: 800,
          margin: '0 0 12px',
          letterSpacing: '0.5px',
          lineHeight: 1.1,
          color: '#111111',
          textShadow: '2px 2px 0 #FFD166',
        } as React.CSSProperties}
      >
        {title}
      </h2>

      {/* Description */}
      {description && (
        <p
          style={{
            fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
            fontSize: '15px',
            color: '#7A6A58',
            maxWidth: '360px',
            lineHeight: 1.6,
            margin: '0 0 28px',
            fontWeight: 500,
          }}
        >
          {description}
        </p>
      )}

      {/* CTA */}
      {ctaLabel && onCta && (
        <Button variant="primary" size="md" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
