import styles from "./Loading.module.css";

type LoadingProps = {
  label?: string;
};

export function Loading({
  label = "TripWise dang khoi dong buong lai de goi y chuyen di..."
}: LoadingProps) {
  return (
    <div className={styles.loading} aria-live="polite" aria-busy="true">
      <div aria-hidden="true" className={styles.dots}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <span>{label}</span>
    </div>
  );
}
