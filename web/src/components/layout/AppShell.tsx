import React from 'react';

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, className = '' }) => (
  <div
    className={className}
    style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#F7E7C6',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
    }}
  >
    {children}
  </div>
);
