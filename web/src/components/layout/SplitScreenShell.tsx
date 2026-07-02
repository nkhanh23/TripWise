import React from 'react';

export interface SplitScreenShellProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftWidth?: string;
  className?: string;
}

export const SplitScreenShell: React.FC<SplitScreenShellProps> = ({
  leftPanel,
  rightPanel,
  leftWidth = '440px',
  className = '',
}) => {
  return (
    <>
      <div
        className={['tripwise-split-shell', className].filter(Boolean).join(' ')}
      >
        {/* On mobile the map goes first (top), on desktop it's the right panel */}
        <div className="tripwise-split-right">{rightPanel}</div>
        <div className="tripwise-split-left">{leftPanel}</div>
      </div>

      <style>{`
        .tripwise-split-shell {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          width: 100%;
        }

        /* Left panel (sidebar) */
        .tripwise-split-left {
          background: #FFFDF3;
          overflow-y: auto;
          flex-shrink: 0;
          /* mobile: lower half */
          height: calc(100vh - 50vh);
          border-top: 2px solid #111111;
        }

        /* Right panel (map) */
        .tripwise-split-right {
          position: relative;
          overflow: hidden;
          /* mobile: top half */
          height: 50vh;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .tripwise-split-shell {
            flex-direction: row;
          }

          /* Restore desktop order: left sidebar | right map */
          .tripwise-split-left {
            order: -1;
            width: ${leftWidth};
            height: 100vh;
            border-top: none;
            border-right: 2px solid #111111;
          }

          .tripwise-split-right {
            flex: 1;
            height: 100vh;
          }
        }
      `}</style>
    </>
  );
};

export default SplitScreenShell;
