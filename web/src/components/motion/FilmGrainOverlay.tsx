"use client";
import React, { useEffect, useState } from 'react';

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const FilmGrainOverlay: React.FC = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  if (reduced) return null;

  return <div className="film-grain" aria-hidden="true" />;
};

export default FilmGrainOverlay;
