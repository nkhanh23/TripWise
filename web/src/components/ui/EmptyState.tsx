import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

type EmptyStateProps = {
  title: string;
  message: string;
  actions?: ReactNode;
};

export function EmptyState({ title, message, actions }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.badge} aria-hidden="true">
        ...
      </div>
      <div className={styles.copy}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
