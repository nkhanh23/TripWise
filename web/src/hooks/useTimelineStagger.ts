import { useEffect, useRef } from "react";
import gsap from "gsap";

export interface StaggerOptions {
  itemSelector?: string;
  staggerAmount?: number;
  duration?: number;
  yOffset?: number;
  delay?: number;
}

/**
 * Custom Hook tạo hiệu ứng xuất hiện tuần tự (staggered list animation) cho danh sách.
 * Đóng gói hoàn toàn logic GSAP, đảm bảo không rò rỉ bộ nhớ và tương thích Reduced Motion.
 *
 * @param dependency Sự kiện kích hoạt lại hiệu ứng (ví dụ: đổi ngày du lịch, dữ liệu danh sách thay đổi)
 * @param options Các tham số cấu hình hiệu ứng
 * @returns React.RefObject gán vào thẻ cha chứa danh sách
 */
export const useTimelineStagger = (
  dependency: any,
  options: StaggerOptions = {}
) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hỗ trợ prefers-reduced-motion: bỏ qua animation nếu hệ thống yêu cầu
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    if (!containerRef.current) return;

    const {
      itemSelector = ".stagger-item",
      staggerAmount = 0.06,
      duration = 0.45,
      yOffset = 20,
      delay = 0,
    } = options;

    // Giới hạn trong container ref, không truy vấn DOM toàn cục
    const ctx = gsap.context(() => {
      const items = containerRef.current?.querySelectorAll(itemSelector);
      if (items && items.length > 0) {
        // Tối ưu hoá hiệu năng cho danh sách siêu dài:
        // Chỉ áp dụng stagger animation cho 20 phần tử đầu tiên hiển thị trên màn hình
        const animateTargets = Array.from(items).slice(0, 20);

        gsap.fromTo(
          animateTargets,
          { opacity: 0, y: yOffset, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration,
            stagger: staggerAmount,
            delay,
            ease: "power2.out",
          }
        );
      }
    }, containerRef);

    // Xoá bỏ GSAP context khi unmount hoặc đổi dependency
    return () => ctx.revert();
  }, [
    dependency,
    options.itemSelector,
    options.staggerAmount,
    options.duration,
    options.yOffset,
    options.delay,
  ]);

  return containerRef;
};
export default useTimelineStagger;
