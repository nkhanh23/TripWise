import React, { useEffect, useRef } from "react";
import gsap from "gsap";

export type LoadingState =
  | "Initializing"
  | "Analyzing"
  | "Planning"
  | "Optimizing"
  | "Finalizing";

export interface ThinkingPanelProps {
  state: LoadingState;
  message?: string;
  animationDuration?: number; // Cấu hình thời lượng animation (s)
}

// Sub-component riêng biệt cho tin nhắn AI, được memoized để tránh re-render
// toàn bộ cấu trúc khi chỉ đổi text tin nhắn trạng thái.
const ThinkingMessage: React.FC<{ message?: string }> = React.memo(({ message }) => {
  return (
    <div
      className="text-sm md:text-md text-[#7A6A58] h-6 font-medium truncate"
      aria-live="polite"
      id="thinking-status-message"
    >
      {message || "Hệ thống đang điều phối dữ liệu..."}
    </div>
  );
});

ThinkingMessage.displayName = "ThinkingMessage";

export const ThinkingPanel: React.FC<ThinkingPanelProps> = ({
  state,
  message,
  animationDuration = 0.4,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const stages = [
    { key: "Initializing", label: "Khởi tạo dữ liệu bản đồ" },
    { key: "Analyzing", label: "Phân tích yêu cầu tự nhiên" },
    { key: "Planning", label: "Lập lịch trình địa điểm du lịch" },
    { key: "Optimizing", label: "Tối ưu hóa tuyến đường di chuyển" },
    { key: "Finalizing", label: "Hoàn tất chuyến đi" },
  ] as const;

  const currentIdx = stages.findIndex((s) => s.key === state);
  const percentComplete = Math.round(((currentIdx + 1) / stages.length) * 100);

  const getStageStatus = (stageKey: string) => {
    const stageIdx = stages.findIndex((s) => s.key === stageKey);
    if (stageIdx < currentIdx) return "completed";
    if (stageIdx === currentIdx) return "active";
    return "pending";
  };

  // GSAP Animation lifecycle quản lý hiệu ứng chuyển đổi trạng thái mượt mà
  useEffect(() => {
    // Hỗ trợ prefers-reduced-motion: giảm hoặc tắt animation khi hệ điều hành yêu cầu
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    if (!containerRef.current) return;

    // Sử dụng gsap.context để cô lập và dọn dẹp các timelines khi unmount
    const ctx = gsap.context(() => {
      const activeElement = containerRef.current?.querySelector(".stage-active");
      const completedElements = containerRef.current?.querySelectorAll(".stage-completed");

      // Animation cho bước hiện tại đang xử lý (Active)
      if (activeElement) {
        const activeTl = gsap.timeline();
        activeTl.fromTo(
          activeElement,
          { scale: 0.96, y: 4, opacity: 0.8 },
          {
            scale: 1,
            y: 0,
            opacity: 1,
            duration: animationDuration,
            ease: "back.out(1.5)",
          }
        );
      }

      // Stagger animation cho các bước đã hoàn tất (Completed)
      if (completedElements && completedElements.length > 0) {
        const icons = Array.from(completedElements).map((el) =>
          el.querySelector(".material-symbols-outlined")
        );

        gsap.fromTo(
          icons,
          { scale: 0.5, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: animationDuration * 0.75,
            stagger: 0.08,
            ease: "power2.out",
          }
        );
      }
    }, containerRef);

    // Dọn dẹp GSAP timeline chống rò rỉ bộ nhớ
    return () => ctx.revert();
  }, [state, animationDuration]);

  return (
    <div
      ref={containerRef}
      className="border-3 border-[#111111] shadow-[6px_6px_0_#111111] rounded-3xl p-6 bg-[#FFFDF3] max-w-md w-full mx-auto"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentComplete}
      aria-describedby="thinking-status-message"
    >
      <h2 className="text-xl md:text-2xl font-bold font-baloo text-[#111111] mb-6 flex items-center gap-3">
        <span className="animate-spin h-5 w-5 border-3 border-t-[#20A7D8] border-[#111111] rounded-full inline-block" />
        AI Đang Lên Kế Hoạch Chuyến Đi...
      </h2>

      <div className="space-y-3">
        {stages.map((stage) => {
          const status = getStageStatus(stage.key);

          let statusIcon = "radio_button_unchecked";
          let textColor = "text-[#7A6A58]";
          let itemBg = "bg-transparent";
          let borderStyle = "border-2 border-transparent";
          let animateClass = "";
          let statusClass = "stage-pending";

          if (status === "completed") {
            statusIcon = "check_circle";
            textColor = "text-[#20A7D8] font-semibold";
            statusClass = "stage-completed";
          } else if (status === "active") {
            statusIcon = "pending";
            textColor = "text-[#111111] font-bold";
            itemBg = "bg-[#FFF6DE]";
            borderStyle = "border-2 border-[#111111] shadow-[2px_2px_0_#111111]";
            animateClass = "animate-pulse";
            statusClass = "stage-active";
          }

          return (
            <div
              key={stage.key}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${itemBg} ${borderStyle} ${statusClass}`}
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  status === "completed"
                    ? "text-[#20A7D8]"
                    : status === "active"
                    ? "text-[#FFBE1A]"
                    : "text-[#7A6A58]"
                } ${animateClass}`}
              >
                {statusIcon}
              </span>
              <span className={`text-sm ${textColor}`}>{stage.label}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t-2 border-dashed border-[#E8E3D7] mt-6 pt-4 text-center">
        <ThinkingMessage message={message} />
      </div>
    </div>
  );
};
