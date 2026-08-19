import React, { useRef, useEffect, useState } from "react";
import gsap from "gsap";

export type SnapPoint = "collapsed" | "half" | "expanded";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  initialSnap?: SnapPoint;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  headerContent,
  initialSnap = "half",
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const [activeSnap, setActiveSnap] = useState<SnapPoint>(initialSnap);

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTranslateYRef = useRef(0);
  const currentTranslateYRef = useRef(0);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Tính toán tọa độ dịch chuyển translateY dựa trên chiều cao trình duyệt
  const getSnapPositions = () => {
    const H = window.innerHeight;
    return {
      expanded: 0,
      half: H * 0.45,
      collapsed: H * 0.78,
    };
  };

  const getSnapFromPosition = (y: number): SnapPoint => {
    const snaps = getSnapPositions();
    const distExpanded = Math.abs(y - snaps.expanded);
    const distHalf = Math.abs(y - snaps.half);
    const distCollapsed = Math.abs(y - snaps.collapsed);

    const minDist = Math.min(distExpanded, distHalf, distCollapsed);
    if (minDist === distExpanded) return "expanded";
    if (minDist === distHalf) return "half";
    return "collapsed";
  };

  const animateToSnap = (snap: SnapPoint, duration = 0.4) => {
    if (!sheetRef.current) return;
    const snaps = getSnapPositions();
    const targetY = snaps[snap];

    currentTranslateYRef.current = targetY;
    setActiveSnap(snap);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      gsap.set(sheetRef.current, { y: targetY });
    } else {
      gsap.to(sheetRef.current, {
        y: targetY,
        duration: duration,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  };

  // Pointer Event Gesture Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetRef.current) return;
    isDraggingRef.current = true;
    startYRef.current = e.clientY;

    const style = window.getComputedStyle(sheetRef.current);
    const transform = style.transform;
    let currentY = getSnapPositions()[activeSnap];

    if (transform && transform !== "none") {
      const matrix = new DOMMatrix(transform);
      currentY = matrix.m42;
    }

    startTranslateYRef.current = currentY;
    currentTranslateYRef.current = currentY;

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !sheetRef.current) return;

    const deltaY = e.clientY - startYRef.current;
    const snaps = getSnapPositions();
    const nextY = Math.max(
      snaps.expanded,
      Math.min(snaps.collapsed + 50, startTranslateYRef.current + deltaY)
    );

    currentTranslateYRef.current = nextY;
    gsap.set(sheetRef.current, { y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const targetSnap = getSnapFromPosition(currentTranslateYRef.current);
    animateToSnap(targetSnap);
  };

  // Quản lý trạng thái đóng/mở & Phục hồi Focus
  useEffect(() => {
    if (isOpen) {
      // Lưu lại phần tử focus trước đó
      previousFocusRef.current = document.activeElement as HTMLElement;
      animateToSnap(initialSnap, 0.55);

      // Focus vào drag handle khi mở
      if (dragHandleRef.current) {
        dragHandleRef.current.focus();
      }
    } else {
      // Phục hồi focus khi đóng
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }

      if (sheetRef.current) {
        const H = window.innerHeight;
        gsap.to(sheetRef.current, {
          y: H,
          duration: 0.35,
          ease: "power2.in",
          onComplete: () => {
            if (onClose) onClose();
          },
        });
      }
    }
  }, [isOpen, initialSnap]);

  // Hỗ trợ đóng Bottom Sheet bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onClose) onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Xử lý khi resize cửa sổ trình duyệt
  useEffect(() => {
    const handleResize = () => {
      animateToSnap(activeSnap, 0.1);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeSnap]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] pointer-events-none flex flex-col justify-end"
      data-testid="bottom-sheet-container"
    >
      <div
        ref={sheetRef}
        className="w-full h-[90vh] bg-[#FFFDF3] border-t-3 border-x-3 border-[#111111] shadow-[0_-4px_0_#111111] rounded-t-3xl pointer-events-auto flex flex-col focus:outline-none"
        style={{ transform: `translateY(${window.innerHeight}px)` }}
        tabIndex={-1}
      >
        {/* Drag Handle & Header */}
        <div
          ref={dragHandleRef}
          className="w-full py-4 flex flex-col items-center cursor-ns-resize select-none touch-none focus:outline-none focus:ring-3 focus:ring-[#20A7D8] rounded-t-3xl"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          tabIndex={0}
          aria-label="Thanh kéo kéo thả bảng thông tin. Sử dụng phím Mũi Tên Lên và Xuống để điều chỉnh trạng thái."
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              if (activeSnap === "collapsed") animateToSnap("half");
              else if (activeSnap === "half") animateToSnap("expanded");
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              if (activeSnap === "expanded") animateToSnap("half");
              else if (activeSnap === "half") animateToSnap("collapsed");
            }
          }}
        >
          {/* Neobrutalism drag handle pin */}
          <div className="w-12 h-2 bg-[#111111] border border-[#111111] rounded-full mb-3" />
          {headerContent && <div className="w-full px-6">{headerContent}</div>}
        </div>

        {/* Vùng hiển thị nội dung bên trong */}
        <div
          ref={contentRef}
          className={`flex-1 px-6 pb-6 overflow-y-auto ${
            activeSnap === "expanded" ? "pointer-events-auto" : "pointer-events-none select-none"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
export default BottomSheet;
