import React from 'react';

type AppContentVariant = 'standard' | 'wide' | 'map' | 'form' | 'full';

interface AppContentProps {
  children: React.ReactNode;
  variant?: AppContentVariant;
  className?: string;
}

export const AppContent: React.FC<AppContentProps> = ({ 
  children, 
  variant = 'standard',
  className = '' 
}) => {
  // Fluid width by default matching /admin/places spacing
  const baseClasses = 'w-full max-w-none mx-0 px-4 sm:px-5 lg:px-8 py-4 sm:py-5 lg:py-6';
  
  const variantClasses = {
    standard: baseClasses,
    wide: baseClasses,
    form: baseClasses,
    full: baseClasses,
    map: 'w-full max-w-none mx-0 px-4 sm:px-5 lg:px-6 py-4 flex flex-col relative h-full', // Less padding, suitable for map/split views
  };

  return (
    <div className={`w-full h-full ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};
