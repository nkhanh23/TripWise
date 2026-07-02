import React, { useState, forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: string;  // material symbol name
  rightIcon?: string; // material symbol name
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      wrapperClassName = '',
      className = '',
      style,
      onFocus,
      onBlur,
      id,
      ...rest
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const getBorderColor = () => {
      if (error) return '#E6392E';
      if (isFocused) return '#20A7D8';
      return '#111111';
    };

    const getBoxShadow = () => {
      if (error) return '3px 3px 0 #E6392E';
      if (isFocused) return '4px 4px 0 #20A7D8';
      return '3px 3px 0 #111111';
    };

    const inputStyle: React.CSSProperties = {
      width: '100%',
      background: '#FFFDF3',
      border: `2px solid ${getBorderColor()}`,
      borderRadius: '12px',
      boxShadow: getBoxShadow(),
      padding: `10px 14px`,
      paddingLeft: leftIcon ? '42px' : '14px',
      paddingRight: rightIcon ? '42px' : '14px',
      fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
      fontSize: '14px',
      fontWeight: 500,
      color: '#111111',
      outline: 'none',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      boxSizing: 'border-box',
      ...style,
    };

    return (
      <div
        className={wrapperClassName}
        style={{ display: 'flex', flexDirection: 'column', gap: '0', width: '100%' }}
      >
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              color: '#111111',
              marginBottom: '6px',
              display: 'block',
              userSelect: 'none',
            }}
          >
            {label}
          </label>
        )}

        <div style={{ position: 'relative', width: '100%' }}>
          {leftIcon && (
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '20px',
                color: error ? '#E6392E' : isFocused ? '#20A7D8' : '#7A6A58',
                pointerEvents: 'none',
                lineHeight: 1,
                transition: 'color 0.15s ease',
                fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
              }}
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={className}
            style={{
              ...inputStyle,
              // placeholder color via a workaround using CSS variable trick
            }}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />

          {rightIcon && (
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '20px',
                color: error ? '#E6392E' : isFocused ? '#20A7D8' : '#7A6A58',
                pointerEvents: 'none',
                lineHeight: 1,
                transition: 'color 0.15s ease',
                fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
              }}
            >
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '5px',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '14px',
                color: '#E6392E',
                lineHeight: 1,
                fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20",
              }}
            >
              error
            </span>
            <span
              style={{
                color: '#E6392E',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
              }}
            >
              {error}
            </span>
          </div>
        )}

        {helperText && !error && (
          <span
            style={{
              color: '#7A6A58',
              fontSize: '12px',
              fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
              marginTop: '5px',
            }}
          >
            {helperText}
          </span>
        )}

        {/* Scoped style for placeholder */}
        {inputId && (
          <style>{`
            #${inputId}::placeholder {
              color: #7A6A58;
              opacity: 1;
            }
          `}</style>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
