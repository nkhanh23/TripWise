import React from 'react';

export interface BudgetBreakdown {
  label: string;
  amount: number;
  icon: string;
}

export interface BudgetCardProps {
  estimated: number;
  spent?: number;
  currency?: string;
  breakdown?: BudgetBreakdown[];
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  estimated,
  spent = 0,
  currency = '₫',
  breakdown = [],
}) => {
  const pct = Math.min((spent / estimated) * 100, 100);
  const isOver = spent >= estimated;
  const isTight = spent >= estimated * 0.8 && spent < estimated;

  const getStatusColor = () => {
    if (isOver) return '#E6392E';
    if (isTight) return '#FFD166';
    return '#B8F24A';
  };

  const getStatusLabel = () => {
    if (isOver) return 'Vượt ngân sách! ⚠️';
    if (isTight) return 'Gần giới hạn! ⚠️';
    return 'An toàn ✓';
  };

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ` ${currency}`;
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFDF3',
        border: '2px solid #111111',
        boxShadow: '4px 4px 0 #111111',
        borderRadius: 20,
        padding: 20,
        fontFamily: "'Be Vietnam Pro', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Header estimated */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#7A6A58', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Chi phí ước tính
          </span>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 800,
              color: '#111111',
              textShadow: '2px 2px 0 #FFD166',
              marginTop: 2,
              lineHeight: 1,
            }}
          >
            {formatMoney(estimated)}
          </div>
        </div>

        <span
          style={{
            background: getStatusColor(),
            border: '2px solid #111111',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 800,
            color: isOver ? '#FFF6DE' : '#111111',
          }}
        >
          {getStatusLabel()}
        </span>
      </div>

      {/* Progress Bar Spent */}
      {spent > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#3A2F2A' }}>
            <span>Đã dùng: {formatMoney(spent)}</span>
            <span>{Math.round((spent / estimated) * 100)}%</span>
          </div>

          <div
            style={{
              height: 12,
              backgroundColor: '#F7E7C6',
              border: '2px solid #111111',
              borderRadius: 9999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                backgroundColor: getStatusColor(),
                transition: 'width 300ms ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Breakdown breakdown list */}
      {breakdown.length > 0 && (
        <div
          style={{
            borderTop: '2px solid #EBD8B7',
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {breakdown.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
                color: '#3A2F2A',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#20A7D8' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              <span style={{ fontWeight: 800 }}>{formatMoney(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
