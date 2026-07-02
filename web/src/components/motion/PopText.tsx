import React from 'react';

export interface PopTextProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const PopText: React.FC<PopTextProps> = ({
  children,
  delay = 0,
  className = '',
}) => {
  const reduced = prefersReducedMotion();

  const style: React.CSSProperties = {
    display: 'inline-block',
    animationDelay: `${delay}ms`,
    animationFillMode: 'both',
  };

  return (
    <span
      className={[!reduced ? 'animate-pop-in' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </span>
  );
};

export default PopText;
