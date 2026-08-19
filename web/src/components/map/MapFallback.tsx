import React from "react";

interface MapFallbackProps {
  error: string;
  onRetry: () => void;
  isLoading?: boolean;
}

export const MapFallback: React.FC<MapFallbackProps> = ({
  error,
  onRetry,
  isLoading = false,
}) => {
  return (
    <div
      className="w-full h-full min-h-[450px] bg-[#FFF5E5] border-3 border-[#E6392E] shadow-[4px_4px_0_#111111] rounded-2xl flex flex-col items-center justify-center p-6 text-center"
      data-testid="map-fallback"
    >
      <span className="material-symbols-outlined text-[#E6392E] text-5xl mb-4">
        report_problem
      </span>
      <h3 className="text-xl font-bold text-[#111111] mb-2 font-baloo">
        Lỗi Khởi Động Bản Đồ
      </h3>
      <p className="text-sm text-[#7A6A58] max-w-md mb-6">{error}</p>
      <button
        onClick={onRetry}
        disabled={isLoading}
        className="px-6 py-3 bg-[#FFBE1A] border-3 border-[#111111] shadow-[3px_3px_0_#111111] rounded-xl font-bold text-sm text-[#111111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_#111111] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none"
      >
        {isLoading ? "Đang Thử Lại..." : "Thử Lại"}
      </button>
    </div>
  );
};
export default MapFallback;
