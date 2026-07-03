"use client";
import React, { useEffect, useRef, useState } from 'react';

export interface BounceCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const BounceCard: React.FC<BounceCardProps> = ({
  children,
  delay = 0,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [reduced]);

  const style: React.CSSProperties = {
    opacity: visible ? undefined : 0,
    animationDelay: visible && !reduced ? `${delay}ms` : undefined,
    animationFillMode: 'both',
  };

  const animClass = visible && !reduced ? 'animate-bounce-in' : '';

  return (
    <div
      ref={ref}
      className={[animClass, className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </div>
  );
};

export default BounceCard;
