import React from 'react';

export interface FilmGrainOverlayProps {
  disabled?: boolean;
  opacity?: number;
}

export const FilmGrainOverlay: React.FC<FilmGrainOverlayProps> = ({
  disabled = false,
  opacity = 0.035,
}) => {
  if (disabled) return null;

  return (
    <div
      className="film-grain"
      style={{ opacity }}
      aria-hidden="true"
    />
  );
};
