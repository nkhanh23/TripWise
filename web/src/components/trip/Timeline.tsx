import React, { useState } from 'react';
import { TimelineItem } from './TimelineItem';
import type { TimelineItemProps } from './TimelineItem';

export interface TimelineProps {
  days: number;
  selectedDay: number;
  onDayChange: (day: number) => void;
  items?: TimelineItemProps[];
  selectedItemIndex?: number;
  onItemClick?: (index: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  days,
  selectedDay,
  onDayChange,
  items = [],
  selectedItemIndex,
  onItemClick,
}) => {
  const [hoveredTab, setHoveredTab] = useState<number | null>(null);

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Day Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 12,
          borderBottom: '2px solid #111111',
          marginBottom: 20,
        }}
      >
        {Array.from({ length: days }).map((_, idx) => {
          const dayNum = idx + 1;
          const isActive = selectedDay === dayNum;
          const isHovered = hoveredTab === dayNum;

          return (
            <button
              key={dayNum}
              onClick={() => onDayChange(dayNum)}
              onMouseEnter={() => setHoveredTab(dayNum)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: 12,
                border: '2px solid #111111',
                cursor: 'pointer',
                backgroundColor: isActive ? '#FFD166' : '#FFF6DE',
                boxShadow: isActive
                  ? '3px 3px 0 #111111'
                  : isHovered
                  ? '3px 3px 0 #111111'
                  : '2px 2px 0 #D8B98A',
                transform: (isActive || isHovered) ? 'translate(-1px,-1px)' : 'none',
                transition: 'transform 150ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 150ms ease, background-color 100ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              Day {dayNum}
            </button>
          );
        })}
      </div>

      {/* Timeline Items List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          paddingLeft: 12,
        }}
      >
        {/* Dashed vertical connector line */}
        <div
          style={{
            position: 'absolute',
            left: 27,
            top: 20,
            bottom: 20,
            width: 0,
            borderLeft: '2px dashed #D8B98A',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        {items.map((item, idx) => (
          <div key={idx} style={{ position: 'relative', zIndex: 1 }}>
            <TimelineItem
              {...item}
              index={item.type === 'transfer' ? undefined : (item.index ?? idx + 1)}
              selected={selectedItemIndex === idx}
              onClick={onItemClick ? () => onItemClick(idx) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
