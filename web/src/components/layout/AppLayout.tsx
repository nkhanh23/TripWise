"use client";
import React from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: React.ReactNode;
  noScroll?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, noScroll = false }) => {
  return (
    <div className={styles.layout}>
      <AppSidebar />
      <main className={styles.mainContent}>
        <AppHeader />
        <div className={`${styles.pageContent} ${noScroll ? styles.noScroll : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
