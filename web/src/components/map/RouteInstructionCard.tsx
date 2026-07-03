import React, { useState } from 'react';

export interface RouteInstructionCardProps {
  instruction: string;
  distance: string;
  eta: string;
  stepIndex: number;
  totalSteps: number;
  direction?: 'straight' | 'left' | 'right' | 'arrive';
  onPrev?: () => void;
  onNext?: () => void;
}

const directionIcons: Record<string, string> = {
  straight: 'north',
  left:     'turn_left',
  right:    'turn_right',
  arrive:   'flag',
};

const IconBtn: React.FC<{ icon: string; onClick?: () => void }> = ({ icon, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32,
        height: 32,
        border: '2px solid #D8B98A',
        borderRadius: 8,
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transform: hover ? 'translate(-1px,-1px)' : 'none',
        boxShadow: hover ? '2px 2px 0 #111111' : 'none',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#111111' }}>{icon}</span>
    </button>
  );
};

export const RouteInstructionCard: React.FC<RouteInstructionCardProps> = ({
  instruction,
  distance,
  eta,
  stepIndex,
  totalSteps,
  direction = 'straight',
  onPrev,
  onNext,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFDF3',
        border: '3px solid #111111',
        boxShadow: '4px 4px 0 #111111',
        borderRadius: 16,
        padding: '14px 16px',
        minWidth: 280,
        maxWidth: 340,
        fontFamily: "'Be Vietnam Pro', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Top row: direction + instruction */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 36, color: '#20A7D8', flexShrink: 0, marginTop: 2 }}
        >
          {directionIcons[direction]}
        </span>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111111', lineHeight: 1.4 }}>
          {instruction}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            background: '#FFD166',
            border: '2px solid #111111',
            borderRadius: 9999,
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 700,
            color: '#111111',
          }}
        >
          📍 {distance}
        </span>
        <span
          style={{
            background: '#D6F1FB',
            border: '2px solid #111111',
            borderRadius: 9999,
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 700,
            color: '#111111',
          }}
        >
          ⏱ {eta}
        </span>
      </div>

      {/* Bottom row: step counter + controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            background: '#111111',
            color: '#FFF6DE',
            border: 'none',
            borderRadius: 9999,
            padding: '3px 12px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {stepIndex} / {totalSteps}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn icon="arrow_back" onClick={onPrev} />
          <IconBtn icon="arrow_forward" onClick={onNext} />
        </div>
      </div>
    </div>
  );
};
