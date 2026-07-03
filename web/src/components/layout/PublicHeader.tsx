import React, { useState } from 'react';
import Link from 'next/link';

export interface PublicHeaderProps {
  onSignIn?: () => void;
  onGetStarted?: () => void;
}

const NAV_LINKS = ['Features', 'How it works', 'Destinations'] as const;

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  onSignIn,
  onGetStarted,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  /* ── styles ─────────────────────────────────────────── */

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#FFF6DE',
    borderBottom: '2px solid #111111',
    boxShadow: '0 2px 0 #111111',
    position: 'relative',
    zIndex: 100,
    fontFamily: "'Be Vietnam Pro', sans-serif",
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
  };

  const logoTextStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: '28px',
    color: '#20A7D8',
    textShadow: '2px 2px 0 #111111',
    letterSpacing: '0.04em',
    lineHeight: 1,
  };

  const navStyle: React.CSSProperties = {
    display: 'flex',
    gap: '32px',
    alignItems: 'center',
  };

  const rightStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const signInStyle: React.CSSProperties = {
    background: 'transparent',
    border: '2px solid #111111',
    borderRadius: '12px',
    padding: '6px 18px',
    fontFamily: "'Be Vietnam Pro', sans-serif",
    fontWeight: 700,
    fontSize: '14px',
    color: '#111111',
    cursor: 'pointer',
    transition: 'background 0.15s, box-shadow 0.15s',
  };

  const getStartedStyle: React.CSSProperties = {
    background: '#FFD166',
    border: '3px solid #111111',
    boxShadow: '3px 3px 0 #111111',
    borderRadius: '16px',
    padding: '6px 20px',
    fontFamily: "'Be Vietnam Pro', sans-serif",
    fontWeight: 700,
    fontSize: '14px',
    color: '#111111',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s, transform 0.15s',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFF6DE',
    borderTop: '2px solid #111111',
    borderBottom: '2px solid #111111',
    boxShadow: '0 4px 0 #111111',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 32px 20px',
    gap: '16px',
    zIndex: 99,
  };

  /* ── nav link renderer ───────────────────────────────── */

  const NavLink: React.FC<{ label: string }> = ({ label }) => {
    const [hovered, setHovered] = useState(false);
    return (
      <a
        href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
        style={{
          fontFamily: "'Be Vietnam Pro', sans-serif",
          fontWeight: 600,
          color: '#111111',
          textDecoration: 'none',
          fontSize: '15px',
          borderBottom: hovered ? '2px dashed #FFD166' : '2px solid transparent',
          paddingBottom: '2px',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {label}
      </a>
    );
  };

  /* ── render ──────────────────────────────────────────── */

  return (
    <>
      <header style={headerStyle}>
        <div style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
          {/* Logo */}
          <Link href="/" style={logoStyle}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '28px', color: '#20A7D8' }}
            >
              explore
            </span>
            <span style={logoTextStyle}>TripWise</span>
          </Link>

          {/* Desktop nav */}
          <nav
            style={navStyle}
            className="tripwise-desktop-nav"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => (
              <NavLink key={link} label={link} />
            ))}
          </nav>

          {/* Right actions */}
          <div style={rightStyle}>
            {/* Sign In – desktop only */}
            <button
              style={signInStyle}
              className="tripwise-desktop-nav"
              onClick={onSignIn}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,209,102,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'transparent';
              }}
            >
              Sign In
            </button>

            {/* Get Started */}
            <button
              style={getStartedStyle}
              onClick={onGetStarted}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '6px 6px 0 #111111';
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'translate(-2px, -2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '3px 3px 0 #111111';
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'translate(0, 0)';
              }}
            >
              Get Started
            </button>

            {/* Hamburger – mobile only */}
            <button
              className="tripwise-mobile-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'none', // shown via CSS
                padding: '4px',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '28px', color: '#111111' }}
              >
                {menuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={dropdownStyle} className="tripwise-mobile-dropdown">
          {NAV_LINKS.map((link) => (
            <NavLink key={link} label={link} />
          ))}
          <hr
            style={{
              border: 'none',
              borderTop: '2px dashed #111111',
              margin: '4px 0',
            }}
          />
          <button
            style={{ ...signInStyle, textAlign: 'left', width: 'fit-content' }}
            onClick={() => {
              setMenuOpen(false);
              onSignIn?.();
            }}
          >
            Sign In
          </button>
          <button
            style={{ ...getStartedStyle, width: 'fit-content' }}
            onClick={() => {
              setMenuOpen(false);
              onGetStarted?.();
            }}
          >
            Get Started
          </button>
        </div>
      )}

      {/* Responsive CSS injected once */}
      <style>{`
        @media (max-width: 768px) {
          .tripwise-desktop-nav { display: none !important; }
          .tripwise-mobile-menu-btn { display: block !important; }
        }
        @media (min-width: 769px) {
          .tripwise-mobile-dropdown { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default PublicHeader;
