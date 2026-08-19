import React from "react";

// Common Shimmer styling
const shimmerClass =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent bg-[#E8E3D7] rounded-md";

export const TripSummarySkeleton: React.FC = () => {
  return (
    <div
      className="border-3 border-[#111111] shadow-[4px_4px_0_#111111] rounded-2xl p-6 bg-[#FFFDF3] space-y-4"
      aria-hidden="true"
    >
      <div className={`h-8 w-2/3 ${shimmerClass}`} />
      <div className="flex gap-2">
        <div className={`h-6 w-24 ${shimmerClass}`} />
        <div className={`h-6 w-32 ${shimmerClass}`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-2 border-[#111111] p-3 rounded-xl bg-[#FFF6DE] space-y-2"
          >
            <div className={`h-4 w-12 ${shimmerClass}`} />
            <div className={`h-6 w-16 ${shimmerClass}`} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const WeatherSkeleton: React.FC = () => {
  return (
    <div
      className="border-3 border-[#111111] shadow-[4px_4px_0_#111111] rounded-2xl p-4 bg-[#FFFDF3] flex items-center justify-between"
      aria-hidden="true"
    >
      <div className="space-y-2 flex-1">
        <div className={`h-5 w-24 ${shimmerClass}`} />
        <div className={`h-4 w-40 ${shimmerClass}`} />
      </div>
      <div className={`h-12 w-12 rounded-xl ${shimmerClass}`} />
    </div>
  );
};

export const TimelineItemSkeleton: React.FC = () => {
  return (
    <div
      className="border-2 border-[#111111] shadow-[2px_2px_0_#111111] rounded-xl p-4 bg-[#FFFDF3] flex gap-4 items-start"
      aria-hidden="true"
    >
      <div className={`h-6 w-14 rounded-full ${shimmerClass}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-6 w-3/4 ${shimmerClass}`} />
        <div className="flex gap-2">
          <div className={`h-4 w-16 ${shimmerClass}`} />
          <div className={`h-4 w-20 ${shimmerClass}`} />
        </div>
      </div>
    </div>
  );
};

export const TimelineSkeleton: React.FC = () => {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="flex gap-2 mb-2">
        <div className="h-10 w-24 border-3 border-[#111111] rounded-xl bg-[#FFF6DE] shadow-[2px_2px_0_#111111]" />
        <div className="h-10 w-24 border-3 border-[#111111] rounded-xl bg-[#FFFDF3] shadow-[2px_2px_0_#111111]" />
        <div className="h-10 w-24 border-3 border-[#111111] rounded-xl bg-[#FFFDF3] shadow-[2px_2px_0_#111111]" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <TimelineItemSkeleton key={i} />
      ))}
    </div>
  );
};

export const RouteSummarySkeleton: React.FC = () => {
  return (
    <div
      className="border-3 border-[#111111] shadow-[4px_4px_0_#111111] rounded-2xl p-4 bg-[#FFFDF3] space-y-2"
      aria-hidden="true"
    >
      <div className={`h-5 w-1/3 ${shimmerClass}`} />
      <div className={`h-4 w-2/3 ${shimmerClass}`} />
    </div>
  );
};

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full space-y-6" data-testid="loading-skeleton">
      <TripSummarySkeleton />
      <WeatherSkeleton />
      <RouteSummarySkeleton />
      <TimelineSkeleton />
    </div>
  );
};
