import React, { useEffect, useRef } from "react";
import { ThinkingPanel, type LoadingState } from "./ThinkingPanel";

export interface LoadingOverlayProps {
  state: LoadingState;
  message?: string;
  isVisible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  state,
  message,
  isVisible,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isVisible) {
      // Lưu giữ tiêu điểm trước đó
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus vào overlay container để trình đọc màn hình bắt đầu thông báo
      if (containerRef.current) {
        containerRef.current.focus();
      }
    } else {
      // Phục hồi tiêu điểm khi kết thúc hiển thị lớp phủ
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#111111]/40 backdrop-blur-sm p-4 focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="Đang lập kế hoạch chuyến đi với AI..."
      tabIndex={-1}
    >
      <div className="w-full max-w-md transition-transform duration-200">
        <ThinkingPanel state={state} message={message} />
      </div>
    </div>
  );
};
export default LoadingOverlay;
