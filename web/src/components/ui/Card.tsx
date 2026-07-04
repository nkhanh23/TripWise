import type { PropsWithChildren, ReactNode, CSSProperties } from "react";
import React from "react";
import styles from "./Card.module.css";

type CardProps = PropsWithChildren<{
  variant?: 'default' | 'poster' | 'ticket' | 'speech' | 'mapOverlay';
  title?: string;
  subtitle?: string;
  description?: string;
  elevated?: boolean;
  interactive?: boolean;
  hoverable?: boolean;
  badge?: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
  posterColor?: string;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}>;

export function Card({
  children,
  variant = 'default',
  title,
  subtitle,
  description,
  elevated = false,
  interactive = false,
  hoverable = false,
  badge,
  action,
  onClick,
  posterColor = '#20A7D8',
  footer,
  className = '',
  style
}: CardProps) {
  const isClickable = !!onClick;

  // ─── POSTER VARIANT ────────────────────────────────────────────────────────
  if (variant === 'poster') {
    return (
      <div
        className={`${className} ${hoverable ? `${styles.hoverable} ${styles.posterHover}` : ''}`}
        onClick={onClick}
        style={{
          position: 'relative',
          background: '#FFF6DE',
          border: '3px solid #111111',
          borderRadius: '20px',
          boxShadow: '6px 6px 0 #111111',
          overflow: 'hidden',
          cursor: isClickable ? 'pointer' : 'default',
          ...style,
        }}
      >
        {badge && (
          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2 }}>{badge}</div>
        )}
        <div
          style={{
            background: posterColor,
            padding: '14px 20px',
            borderBottom: '3px solid #111111',
          }}
        >
          {title && (
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: '20px',
                fontWeight: 800,
                color: '#FFF6DE',
                letterSpacing: '0.5px',
                textShadow: '2px 2px 0 rgba(0,0,0,0.3)',
              }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              style={{
                margin: '4px 0 0',
                fontFamily: "var(--font-body)",
                fontSize: '13px',
                color: 'rgba(255,246,222,0.85)',
                fontWeight: 500,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div style={{ padding: '20px' }}>
          {children}
          {action && <div style={{ marginTop: '16px' }}>{action}</div>}
        </div>
      </div>
    );
  }

  // ─── TICKET VARIANT ────────────────────────────────────────────────────────
  if (variant === 'ticket') {
    return (
      <div
        className={`${className} ${hoverable ? `${styles.hoverable} ${styles.ticketHover}` : ''}`}
        onClick={onClick}
        style={{
          position: 'relative',
          background: '#FFFDF3',
          border: '2px solid #111111',
          borderLeft: '4px solid #FFD166',
          borderRadius: '16px',
          boxShadow: '4px 4px 0 #111111',
          padding: '16px 20px 16px 28px',
          cursor: isClickable ? 'pointer' : 'default',
          ...style,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '-10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#F7E7C6',
            border: '2px solid #111111',
            zIndex: 1,
          }}
        />
        {badge && (
          <div style={{ position: 'absolute', top: '12px', right: '12px' }}>{badge}</div>
        )}
        {(title || subtitle) && (
          <div style={{ marginBottom: children ? '10px' : 0 }}>
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#111111',
                  letterSpacing: '0.5px',
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontFamily: "var(--font-body)",
                  fontSize: '13px',
                  color: '#7A6A58',
                  fontWeight: 500,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
        {action && <div style={{ marginTop: '12px' }}>{action}</div>}
      </div>
    );
  }

  // ─── SPEECH VARIANT ────────────────────────────────────────────────────────
  if (variant === 'speech') {
    return (
      <div
        className={`${className} ${hoverable ? `${styles.hoverable} ${styles.speechHover}` : ''}`}
        onClick={onClick}
        style={{
          position: 'relative',
          marginBottom: '18px',
          ...style,
        }}
      >
        <div
          style={{
            position: 'relative',
            background: '#FFF6DE',
            border: '2px solid #111111',
            borderRadius: '20px',
            boxShadow: '4px 4px 0 #111111',
            padding: '18px 20px',
            cursor: isClickable ? 'pointer' : 'default',
          }}
        >
          {badge && (
            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>{badge}</div>
          )}
          {(title || subtitle) && (
            <div style={{ marginBottom: children ? '10px' : 0 }}>
              {title && (
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#111111',
                  }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontFamily: "var(--font-body)",
                    fontSize: '13px',
                    color: '#7A6A58',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {children}
          {action && <div style={{ marginTop: '12px' }}>{action}</div>}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '-16px',
            left: '28px',
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '16px solid #111111',
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-13px',
            left: '30px',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '13px solid #FFF6DE',
            zIndex: 2,
          }}
        />
      </div>
    );
  }

  // ─── MAP OVERLAY VARIANT ───────────────────────────────────────────────────
  if (variant === 'mapOverlay') {
    return (
      <div
        className={`${className} ${hoverable ? `${styles.hoverable} ${styles.mapOverlayHover}` : ''}`}
        onClick={onClick}
        style={{
          position: 'relative',
          background: 'rgba(255, 253, 243, 0.97)',
          border: '3px solid #111111',
          borderRadius: '16px',
          boxShadow: '4px 4px 0 #111111',
          padding: '12px 16px',
          cursor: isClickable ? 'pointer' : 'default',
          backdropFilter: 'blur(4px)',
          ...style,
        }}
      >
        {badge && (
          <div style={{ position: 'absolute', top: '8px', right: '8px' }}>{badge}</div>
        )}
        {(title || subtitle) && (
          <div style={{ marginBottom: children ? '8px' : 0 }}>
            {title && (
              <h4
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#111111',
                  letterSpacing: '0.3px',
                }}
              >
                {title}
              </h4>
            )}
            {subtitle && (
              <p
                style={{
                  margin: '2px 0 0',
                  fontFamily: "var(--font-body)",
                  fontSize: '12px',
                  color: '#7A6A58',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
        {action && <div style={{ marginTop: '10px' }}>{action}</div>}
      </div>
    );
  }

  // ─── DEFAULT VARIANT (NEXT.JS STANDARD) ────────────────────────────────────
  const classes = [
    styles.card,
    elevated ? styles.elevated : "",
    interactive ? styles.interactive : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} style={style} onClick={onClick}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      {description ? <p className={styles.description}>{description}</p> : null}
      {children}
      {footer}
    </section>
  );
}
