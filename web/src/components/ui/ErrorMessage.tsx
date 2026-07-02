import styles from "./ErrorMessage.module.css";

type ErrorMessageProps = {
  title?: string;
  message: string;
};

export function ErrorMessage({
  title = "Lo trinh tam thoi bi gian doan",
  message
}: ErrorMessageProps) {
  return (
    <div className={styles.error} role="alert">
      <div className={styles.title}>
        <span aria-hidden="true">!</span>
        <span>{title}</span>
      </div>
      <p className={styles.body}>{message}</p>
    </div>
  );
}
