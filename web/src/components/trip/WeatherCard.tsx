import React from 'react';

export interface WeatherCardProps {
  location: string;
  temperature: number;
  condition: string; // 'sunny' | 'cloudy' | 'rainy' | 'storm'
  humidity?: number;
  rainChance?: number;
  wind?: number;
  warn?: boolean;
}

const conditionIcons: Record<string, { icon: string; color: string; label: string }> = {
  sunny: { icon: 'light_mode', color: '#F77F00', label: 'Nắng đẹp' },
  cloudy: { icon: 'cloud', color: '#7A6A58', label: 'Nhiều mây' },
  rainy: { icon: 'umbrella', color: '#20A7D8', label: 'Có mưa' },
  storm: { icon: 'thunderstorm', color: '#E6392E', label: 'Bão lớn' },
};

const StatChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      flex: 1,
      background: '#FFF6DE',
      border: '2px solid #111111',
      boxShadow: '2px 2px 0 #111111',
      borderRadius: 8,
      padding: '6px 8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
    }}
  >
    <span style={{ fontSize: 9, fontWeight: 700, color: '#7A6A58', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 800, color: '#111111' }}>{value}</span>
  </div>
);

export const WeatherCard: React.FC<WeatherCardProps> = ({
  location,
  temperature,
  condition,
  humidity = 65,
  rainChance = 10,
  wind = 12,
  warn = false,
}) => {
  const cond = conditionIcons[condition.toLowerCase()] || conditionIcons.sunny;

  return (
    <div
      style={{
        backgroundColor: warn ? '#FFDDDB' : '#FFFDF3',
        border: warn ? '3px solid #E6392E' : '2px solid #111111',
        boxShadow: '4px 4px 0 #111111',
        borderRadius: 20,
        padding: 20,
        fontFamily: "'Be Vietnam Pro', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
      }}
    >
      {/* Alert Warning Sticker */}
      {warn && (
        <span
          style={{
            position: 'absolute',
            top: -12,
            right: 12,
            background: '#E6392E',
            border: '2px solid #111111',
            boxShadow: '2px 2px 0 #111111',
            borderRadius: 8,
            padding: '2px 10px',
            fontSize: 10,
            fontWeight: 800,
            color: '#FFF6DE',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            transform: 'rotate(2deg)',
          }}
        >
          Cảnh báo thời tiết ⚠️
        </span>
      )}

      {/* Header Info row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Thời tiết hiện tại
          </span>
          <h4 style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 16, color: '#111111' }}>{location}</h4>
        </div>
        <span
          style={{
            background: cond.color + '20',
            border: `1.5px solid ${cond.color}`,
            borderRadius: 9999,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 800,
            color: cond.color === '#FFF6DE' ? '#111111' : cond.color,
          }}
        >
          {cond.label}
        </span>
      </div>

      {/* Temp and Icon middle block */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '10px 0' }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 56, color: cond.color }}
        >
          {cond.icon}
        </span>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 52,
            fontWeight: 900,
            color: '#111111',
            textShadow: '3px 3px 0 #FFD166',
            lineHeight: 1,
          }}
        >
          {temperature}°C
        </div>
      </div>

      {/* Details Row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatChip label="Độ ẩm" value={`${humidity}%`} />
        <StatChip label="Khả năng mưa" value={`${rainChance}%`} />
        <StatChip label="Sức gió" value={`${wind} km/h`} />
      </div>
    </div>
  );
};
