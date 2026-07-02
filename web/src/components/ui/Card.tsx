import type { PropsWithChildren, ReactNode } from "react";
import styles from "./Card.module.css";

type CardProps = PropsWithChildren<{
  title?: string;
  description?: string;
  elevated?: boolean;
  interactive?: boolean;
  footer?: ReactNode;
  className?: string;
}>;

export function Card({
  children,
  title,
  description,
  elevated = false,
  interactive = false,
  footer,
  className
}: CardProps) {
  const classes = [
    styles.card,
    elevated ? styles.elevated : "",
    interactive ? styles.interactive : "",
    className ?? ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      {description ? <p className={styles.description}>{description}</p> : null}
      {children}
      {footer}
    </section>
  );
}
