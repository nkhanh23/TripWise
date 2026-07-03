import React, { useState } from 'react';

interface RetroImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackIcon?: string;
  fallbackText?: string;
  aspectRatio?: string;
}

export const RetroImage: React.FC<RetroImageProps> = ({ 
  src, 
  alt, 
  fallbackIcon = 'image', 
  fallbackText = 'No image available',
  className = '',
  aspectRatio = '16/9',
  style,
  ...rest 
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-surface-container border-ink border-[1.5px] rounded-xl shadow-comic-sm p-4 ${className}`}
        style={{ aspectRatio, backgroundColor: '#FFF6DE', ...style }}
      >
        <span className="material-symbols-outlined text-outline" style={{ fontSize: 32 }}>
          {fallbackIcon}
        </span>
        <span className="text-[10px] font-bold text-outline mt-2 uppercase text-center font-body-ui">
          {fallbackText}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', aspectRatio, ...style }} className={className}>
      {loading && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: '#F3C99B' }}
        >
          <div className="skeleton-shimmer w-full h-full opacity-50" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        style={{ visibility: loading ? 'hidden' : 'visible' }}
        {...rest}
      />
    </div>
  );
};
