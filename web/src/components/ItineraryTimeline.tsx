import type { ItineraryItem } from '../data/mockData';

export interface ItineraryTimelineProps {
  itinerary: ItineraryItem[];
  activeDay?: number;
  onDayClick?: (day: number) => void;
}

export const ItineraryTimeline: React.FC<ItineraryTimelineProps> = ({
  itinerary,
  activeDay = 1,
  onDayClick
}) => {
  return (
    <div className="relative pl-6 space-y-4 border-l-2 border-outline-variant ml-3">
      {itinerary.map((item) => {
        const isActive = activeDay === item.day;
        return (
          <div 
            key={item.day} 
            className="relative cursor-pointer group"
            onClick={() => onDayClick?.(item.day)}
          >
            {/* Timeline dot */}
            <div 
              className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 transition-colors ${
                isActive 
                  ? 'bg-surface-container-lowest border-primary scale-110 shadow-sm' 
                  : 'bg-surface-container-lowest border-outline-variant group-hover:border-primary'
              }`}
            />
            
            {/* Itinerary card */}
            <div 
              className={`p-3 rounded-xl border transition-all duration-300 ${
                isActive 
                  ? 'bg-surface border-primary shadow-md translate-x-1' 
                  : 'bg-surface border-outline-variant shadow-sm opacity-70 group-hover:opacity-100'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`font-bold text-label-md ${isActive ? 'text-primary' : 'text-on-background'}`}>
                  {item.title}
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  {item.spots.length} spots
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {item.spots.join(' • ')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
