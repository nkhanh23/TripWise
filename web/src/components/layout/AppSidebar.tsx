"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppSidebar.module.css';

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/planner', label: 'Planner', icon: 'auto_awesome' },
    { path: '/trips', label: 'Trips', icon: 'map' },
    { path: '/explore', label: 'Explore', icon: 'explore' },
    { path: '/favorites', label: 'Favorites', icon: 'favorite' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <nav className={styles.sidebar}>
      {/* Logo */}
      <Link href="/" className={styles.logo}>
        <i className="material-symbols-outlined" style={{ fontSize: 30, color: '#20A7D8', fontWeight: 'bold' }}>
          explore
        </i>
        <span className={styles.logoText}>
          TripWise
        </span>
      </Link>

      {/* Navigation Items */}
      <div className={styles.navLinks}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={styles.navLink}
            >
              <div
                className={`${styles.iconBox} ${isActive ? styles.activeIconBox : ''}`}
              >
                <i
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 20,
                    fontVariationSettings: isActive ? "'FILL' 1" : undefined,
                  }}
                >
                  {item.icon}
                </i>
              </div>
              <span className={`${styles.navLabel} ${isActive ? styles.activeLabel : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Profile Avatar */}
      <Link href="/profile" className={styles.profileAvatar}>
        K
      </Link>
    </nav>
  );
};
