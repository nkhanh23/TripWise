"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppHeader.module.css';

export const AppHeader: React.FC = () => {
  const pathname = usePathname();

  // Determine title and badge based on route
  const getHeaderInfo = () => {
    if (pathname.startsWith('/dashboard')) return { title: 'TripWise', badge: 'Dashboard' };
    if (pathname.startsWith('/planner')) return { title: 'Trip Planner', badge: 'BETA' };
    if (pathname.startsWith('/trips')) return { title: 'My Trips', badge: 'LIBRARY' };
    if (pathname.startsWith('/explore')) return { title: 'Explore Places', badge: 'GLOBAL' };
    if (pathname.startsWith('/favorites')) return { title: 'Saved Places', badge: 'MY LIST' };
    if (pathname.startsWith('/settings')) return { title: 'Settings', badge: 'PREF' };
    if (pathname.startsWith('/profile')) return { title: 'My Profile', badge: 'USER' };
    return { title: 'TripWise', badge: 'APP' };
  };

  const { title, badge } = getHeaderInfo();

  return (
    <div className={styles.headerContainer}>
      <header className={styles.header}>
        {/* Left Side */}
        <div className={styles.leftSide}>
          <i className="material-symbols-outlined" style={{ fontSize: 24, color: '#20A7D8', fontWeight: 'bold' }}>explore</i>
          <span className={styles.brandTitle}>
            {title}
          </span>
          <span className={styles.badge}>
            {badge}
          </span>
        </div>

        {/* Right Side */}
        <div className={styles.rightSide}>
          <button className={styles.notificationBtn} aria-label="Notifications">
            <i className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</i>
          </button>
          
          <Link href="/profile" className={styles.avatarLink} aria-label="View Profile">
            <div className={styles.avatar}>
              K
            </div>
          </Link>
        </div>
      </header>
    </div>
  );
};
