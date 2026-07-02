import React, { useState, forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  variant?: 'default' | 'notepad';
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      variant = 'default',
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

    const inputId =
      id ?? (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const getBorderColor = () => {
      if (error) return '#E6392E';
      if (isFocused) return '#20A7D8';
      if (variant === 'notepad') return '#111111';
      return '#111111';
    };

    const getBoxShadow = () => {
      if (error) return variant === 'notepad' ? '4px 4px 0 #E6392E' : '3px 3px 0 #E6392E';
      if (isFocused) return variant === 'notepad' ? '6px 6px 0 #20A7D8' : '4px 4px 0 #20A7D8';
      return variant === 'notepad' ? '4px 4px 0 #111111' : '3px 3px 0 #111111';
    };

    const defaultStyle: React.CSSProperties = {
      width: '100%',
      background: '#FFFDF3',
      border: `2px solid ${getBorderColor()}`,
      borderRadius: '12px',
      boxShadow: getBoxShadow(),
      padding: '10px 14px',
      fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
      fontSize: '14px',
      fontWeight: 500,
      color: '#111111',
      outline: 'none',
      resize: 'vertical',
      minHeight: '100px',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      boxSizing: 'border-box',
    };

    const notepadStyle: React.CSSProperties = {
      width: '100%',
      background: `#FFF6DE`,
      backgroundImage: `repeating-linear-gradient(
        transparent,
        transparent 27px,
        #D8B98A 27px,
        #D8B98A 28px
      )`,
      backgroundPositionY: '32px',
      border: `3px solid ${getBorderColor()}`,
      borderRadius: '16px',
      boxShadow: getBoxShadow(),
      padding: '12px 16px',
      fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
      fontSize: '14px',
      fontWeight: 500,
      fontStyle: 'italic',
      color: '#111111',
      outline: 'none',
      resize: 'vertical',
      minHeight: '120px',
      lineHeight: '28px',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      boxSizing: 'border-box',
    };

    const computedStyle = variant === 'notepad' ? notepadStyle : defaultStyle;

    return (
      <div
        className={wrapperClassName}
        style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
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

        <textarea
          ref={ref}
          id={inputId}
          className={className}
          style={{ ...computedStyle, ...style }}
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

        {/* Placeholder color */}
        {inputId && (
          <style>{`
            #${inputId}::placeholder {
              color: #7A6A58;
              opacity: 1;
              font-style: ${variant === 'notepad' ? 'italic' : 'normal'};
            }
          `}</style>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
