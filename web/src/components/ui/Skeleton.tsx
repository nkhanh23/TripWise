import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle' | 'timeline' | 'badge';
  lines?: number;
  className?: string;
  width?: string;
  height?: string;
}

const shimmerClass = 'skeleton-shimmer';

const lineWidths = ['100%', '80%', '60%', '90%', '70%'];

// ─── Text Skeleton ────────────────────────────────────────────────────────────
const TextSkeleton: React.FC<{ lines: number; width?: string }> = ({ lines, width }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: width ?? '100%' }}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={shimmerClass}
        style={{
          height: '16px',
          width: lineWidths[i % lineWidths.length],
          borderRadius: '8px',
        }}
      />
    ))}
  </div>
);

// ─── Card Skeleton ────────────────────────────────────────────────────────────
const CardSkeleton: React.FC<{ width?: string; height?: string }> = ({ width, height }) => (
  <div
    style={{
      width: width ?? '100%',
      height: height ?? 'auto',
      border: '2px solid #D8B98A',
      borderRadius: '20px',
      overflow: 'hidden',
    }}
  >
    {/* Header strip */}
    <div
      className={shimmerClass}
      style={{ height: '48px', width: '100%', borderRadius: 0 }}
    />
    {/* Body */}
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div
        className={shimmerClass}
        style={{ height: '16px', width: '70%', borderRadius: '8px' }}
      />
      <div
        className={shimmerClass}
        style={{ height: '16px', width: '90%', borderRadius: '8px' }}
      />
      <div
        className={shimmerClass}
        style={{ height: '16px', width: '55%', borderRadius: '8px' }}
      />
    </div>
  </div>
);

// ─── Circle Skeleton ──────────────────────────────────────────────────────────
const CircleSkeleton: React.FC<{ width?: string; height?: string }> = ({ width, height }) => (
  <div
    className={shimmerClass}
    style={{
      width: width ?? '48px',
      height: height ?? '48px',
      borderRadius: '50%',
      flexShrink: 0,
    }}
  />
);

// ─── Timeline Skeleton ────────────────────────────────────────────────────────
const TimelineSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Circle dot */}
        <div
          className={shimmerClass}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            flexShrink: 0,
            marginTop: '2px',
          }}
        />
        {/* Lines */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div
            className={shimmerClass}
            style={{ height: '14px', width: '60%', borderRadius: '6px' }}
          />
          <div
            className={shimmerClass}
            style={{ height: '12px', width: '85%', borderRadius: '6px' }}
          />
        </div>
      </div>
    ))}
  </div>
);

// ─── Badge Skeleton ───────────────────────────────────────────────────────────
const BadgeSkeleton: React.FC = () => (
  <div
    className={shimmerClass}
    style={{
      width: '80px',
      height: '24px',
      borderRadius: '9999px',
    }}
  />
);

// ─── Main Export ─────────────────────────────────────────────────────────────
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  lines = 3,
  className = '',
  width,
  height,
}) => {
  const wrapperStyle: React.CSSProperties = {};

  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return <TextSkeleton lines={lines} width={width} />;
      case 'card':
        return <CardSkeleton width={width} height={height} />;
      case 'circle':
        return <CircleSkeleton width={width} height={height} />;
      case 'timeline':
        return <TimelineSkeleton />;
      case 'badge':
        return <BadgeSkeleton />;
      default:
        return <TextSkeleton lines={lines} width={width} />;
    }
  };

  return (
    <div className={className} style={wrapperStyle} aria-hidden="true" role="presentation">
      {renderSkeleton()}
    </div>
  );
};

export default Skeleton;
