import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { type MapAdapter } from "../../lib/mapAdapter";

export type TransitionState = "loading" | "transitioning" | "editor";

interface TransitionControllerProps {
  state: TransitionState;
  adapter?: MapAdapter | null;
  onTransitionComplete?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const TransitionController: React.FC<TransitionControllerProps> = ({
  state,
  adapter,
  onTransitionComplete,
  children,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // prefers-reduced-motion check: bypass animations if user desires reduced movement
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      if (state === "transitioning" || state === "editor") {
        if (adapter) {
          adapter.resize();
        }
        if (onTransitionComplete) {
          onTransitionComplete();
        }
      }
      return;
    }

    if (!containerRef.current) return;

    // Khởi tạo GSAP context để quản lý dọn dẹp các tween
    const ctx = gsap.context(() => {
      if (state === "transitioning") {
        const overlay = containerRef.current?.querySelector(".loading-overlay-container");
        const map = containerRef.current?.querySelector(".map-container");
        const sidebar = containerRef.current?.querySelector(".sidebar-panel");

        // Sử dụng timeline duy nhất để đồng bộ hóa
        const tl = gsap.timeline({
          onComplete: () => {
            if (adapter) {
              adapter.resize();
            }
            if (onTransitionComplete) {
              onTransitionComplete();
            }
          },
        });

        // 1. Ẩn dần Loading Overlay
        if (overlay) {
          tl.to(
            overlay,
            {
              opacity: 0,
              duration: 0.4,
              ease: "power2.out",
              pointerEvents: "none",
            },
            0
          );
        }

        // 2. Phóng to và hiển thị rõ nét Bản đồ
        if (map) {
          tl.fromTo(
            map,
            { scale: 0.96, opacity: 0.8 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.6,
              ease: "power3.out",
            },
            0
          );
        }

        // 3. Trượt ngang và hiện dần Panel thông tin bên trái
        if (sidebar) {
          tl.fromTo(
            sidebar,
            { x: -40, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.5,
              ease: "back.out(1.1)",
            },
            0.1 // Trễ nhẹ 100ms tạo hiệu ứng chuyển động tự nhiên
          );
        }
      }
    }, containerRef);

    return () => ctx.revert();
  }, [state, adapter, onTransitionComplete]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden ${className}`}
      data-testid="transition-controller"
    >
      {children}
    </div>
  );
};
