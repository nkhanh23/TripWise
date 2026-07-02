import React, { useMemo } from 'react';

export interface KineticTitleProps {
  text: string;
  size?: 'hero' | 'section' | 'card';
  variant?: 'pop' | 'slide' | 'bounce' | 'none';
  highlightWords?: string[];
  className?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'p';
  shadowVariant?: 'black' | 'red' | 'cyan';
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const ANIMATION_CLASS: Record<NonNullable<KineticTitleProps['variant']>, string> = {
  pop: 'animate-pop-in',
  slide: 'animate-slide-up',
  bounce: 'animate-bounce-in',
  none: '',
};

const SIZE_STYLES: Record<
  NonNullable<KineticTitleProps['size']>,
  React.CSSProperties
> = {
  hero: {
    fontSize: 'clamp(44px, 8vw, 72px)',
    fontFamily: "'Luckiest Guy', 'Bangers', cursive",
    fontWeight: 900,
    lineHeight: 0.95,
    textShadow: '4px 5px 0 #111111',
  },
  section: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontFamily: "'Luckiest Guy', 'Bangers', cursive",
    fontWeight: 800,
    textShadow: '3px 4px 0 #111111',
  },
  card: {
    fontSize: '28px',
    fontFamily: "'Luckiest Guy', 'Bangers', cursive",
    fontWeight: 700,
    textShadow: '2px 3px 0 #111111',
  },
};

const SHADOW_OVERRIDES: Record<
  NonNullable<KineticTitleProps['shadowVariant']>,
  string
> = {
  black: '4px 5px 0 #111111',
  red: '2px 2px 0 #E6392E, 4px 4px 0 #111111',
  cyan: '2px 2px 0 #20A7D8, 4px 4px 0 #111111',
};

export const KineticTitle: React.FC<KineticTitleProps> = ({
  text,
  size = 'section',
  variant = 'pop',
  highlightWords = [],
  className = '',
  tag: Tag = 'h2',
  shadowVariant,
}) => {
  const reduced = prefersReducedMotion();
  const animClass = reduced ? '' : ANIMATION_CLASS[variant];

  const sizeStyle = SIZE_STYLES[size];
  const textShadow = shadowVariant
    ? SHADOW_OVERRIDES[shadowVariant]
    : sizeStyle.textShadow;

  const highlightSet = useMemo(
    () => new Set((highlightWords ?? []).map((w) => w.toLowerCase())),
    [highlightWords],
  );

  const words = text.split(' ');

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.3em',
    margin: 0,
    padding: 0,
    ...sizeStyle,
    textShadow,
    letterSpacing: size === 'hero' ? '0.02em' : undefined,
  };

  return (
    <Tag style={containerStyle} className={className}>
      {words.map((word, index) => {
        const isHighlighted = highlightSet.has(word.toLowerCase());
        const spanStyle: React.CSSProperties = {
          display: 'inline-block',
          animationDelay: `${index * 80}ms`,
          animationFillMode: 'both',
        };

        const inner = isHighlighted ? (
          <mark
            style={{
              background: '#FFD166',
              borderRadius: '4px',
              padding: '0 6px',
              color: '#111111',
              textShadow: 'none',
            }}
          >
            {word}
          </mark>
        ) : (
          word
        );

        return (
          <span
            key={index}
            className={animClass}
            style={spanStyle}
          >
            {inner}
          </span>
        );
      })}
    </Tag>
  );
};

export default KineticTitle;
