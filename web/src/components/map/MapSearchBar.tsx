import React, { useState } from 'react';

export interface MapSearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  onSearch?: (v: string) => void;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  placeholder = 'Tìm kiếm địa điểm...',
  value,
  onChange,
  onSearch,
}) => {
  const [focused, setFocused] = useState(false);
  const [internalVal, setInternalVal] = useState('');

  const controlled = value !== undefined;
  const inputVal = controlled ? value : internalVal;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setInternalVal(e.target.value);
    onChange?.(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch?.(inputVal);
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFDF3',
        border: `2px solid ${focused ? '#20A7D8' : '#111111'}`,
        boxShadow: focused ? '3px 3px 0 #20A7D8' : '3px 3px 0 #111111',
        borderRadius: 12,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#7A6A58', flexShrink: 0 }}>
        search
      </span>
      <input
        value={inputVal}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: "'Be Vietnam Pro', sans-serif",
          fontSize: 14,
          color: '#111111',
          minWidth: 0,
        }}
      />
      {inputVal && (
        <button
          onClick={() => { if (!controlled) setInternalVal(''); onChange?.(''); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            color: '#7A6A58',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      )}
    </div>
  );
};
