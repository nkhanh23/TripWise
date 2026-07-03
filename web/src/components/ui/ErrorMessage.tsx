import type { ReactNode } from "react";
import styles from "./ErrorMessage.module.css";

type ErrorMessageProps = {
  title?: string;
  message: string;
  actions?: ReactNode;
};

export function ErrorMessage({
  title = "Lo trinh tam thoi bi gian doan",
  message,
  actions
}: ErrorMessageProps) {
  return (
    <div className={styles.error} role="alert">
      <div className={styles.title}>
        <span aria-hidden="true">!</span>
        <span>{title}</span>
      </div>
      <p className={styles.body}>{message}</p>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
