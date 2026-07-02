import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TRAVEL_STYLES, 
  TRANSPORT_OPTIONS, 
  FOOD_PREFERENCES, 
  SAMPLE_TRIP 
} from '../data/mockData';

export interface PlanTripPageProps {}

export const PlanTripPage: React.FC<PlanTripPageProps> = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('Nha Trang, Vietnam');
  const [startDate, setStartDate] = useState('Jul 12, 2026');
  const [endDate, setEndDate] = useState('Jul 14, 2026');
  const [traveler, setTraveler] = useState('Couple');
  const [budget, setBudget] = useState('Standard');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Food Tour', 'Culture', 'Check-in']);
  const [selectedTransport, setSelectedTransport] = useState('Motorbike');
  const [selectedFood, setSelectedFood] = useState<string[]>(['Seafood', 'Local food']);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStyleToggle = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const handleFoodToggle = (food: string) => {
    setSelectedFood(prev => 
      prev.includes(food) ? prev.filter(f => f !== food) : [...prev, food]
    );
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate API generation delay
    setTimeout(() => {
      navigate('/trip/nha-trang-123');
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Preference Form */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-display-sm text-on-background mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">tune</span>
            Trip Preferences
          </h2>

          <div className="space-y-5">
            {/* Destination */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Destination</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">location_on</span>
                <input 
                  type="text" 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-xl font-body-md text-body-md text-on-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">calendar_month</span>
                  <input 
                    type="text" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-xl font-body-md text-body-md text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">calendar_month</span>
                  <input 
                    type="text" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-xl font-body-md text-body-md text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Travelers */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Travelers</label>
              <div className="flex flex-wrap gap-2">
                {['Solo', 'Couple', 'Family', 'Friends'].map(t => {
                  const isSelected = traveler === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTraveler(t)}
                      className={`px-4 py-2 rounded-full border font-semibold text-label-md transition-all ${
                        isSelected 
                          ? 'border-2 border-primary bg-primary-fixed-dim text-on-primary-fixed'
                          : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">
                Budget <span className="text-on-surface font-normal text-xs ml-2">$150 - $250</span>
              </label>
              <div className="flex bg-surface-container rounded-xl p-1">
                {['Budget', 'Standard', 'Premium'].map(b => {
                  const isSelected = budget === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBudget(b)}
                      className={`flex-1 py-2 rounded-lg font-semibold text-label-md transition-all ${
                        isSelected
                          ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                          : 'text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Travel Style */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Travel Style</label>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_STYLES.map(style => {
                  const isSelected = selectedStyles.includes(style.label);
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleStyleToggle(style.label)}
                      className={`px-3 py-1.5 rounded-lg border font-body-sm text-body-sm transition-all ${
                        isSelected
                          ? 'border-2 border-primary bg-primary-fixed text-on-primary-fixed font-medium'
                          : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transportation */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Transportation</label>
              <div className="grid grid-cols-4 gap-3">
                {TRANSPORT_OPTIONS.map(opt => {
                  const isSelected = selectedTransport === opt.label;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedTransport(opt.label)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-2 border-primary bg-primary-fixed text-primary font-medium'
                          : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined mb-1">{opt.icon}</span>
                      <span className="font-semibold text-[10px] leading-none">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Food Preference */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Food Preference</label>
              <div className="flex flex-wrap gap-2">
                {FOOD_PREFERENCES.map(food => {
                  const isSelected = selectedFood.includes(food.label);
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => handleFoodToggle(food.label)}
                      className={`px-3 py-1.5 rounded-lg border font-body-sm text-body-sm transition-all ${
                        isSelected
                          ? 'border-2 border-primary bg-primary-fixed text-on-primary-fixed font-medium'
                          : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {food.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Notes */}
            <div>
              <label className="block font-semibold text-label-md text-on-surface-variant mb-2">Special Notes</label>
              <textarea 
                placeholder="E.g., We want to avoid crowded places during noon..."
                rows={3}
                className="w-full p-3 bg-surface border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4 pt-6 border-t border-outline-variant">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 bg-tripwise-blue hover:bg-primary-container disabled:bg-primary/50 text-white py-3 rounded-xl font-bold text-label-md shadow-md transition-all hover:-translate-y-0.5 flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isGenerating ? 'pending' : 'magic_button'}
              </span>
              {isGenerating ? 'Optimizing Itinerary...' : 'Generate AI Itinerary'}
            </button>
            <button 
              type="button"
              className="px-6 py-3 bg-surface border border-outline-variant text-on-surface-variant rounded-xl font-semibold text-label-md hover:bg-surface-container transition-colors"
            >
              Save Draft
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Preview Panel */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 h-full flex flex-col hover:scale-[1.01] transition-transform duration-300 shadow-sm">
          <h2 className="font-bold text-display-sm text-on-background mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tripwise-lime">visibility</span>
            AI Trip Preview
          </h2>

          {/* Map Preview Static Image Placeholder */}
          <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6 border border-outline-variant group">
            <img 
              alt="Map Preview"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZl-b4O8uE5F02letlae5D7LiMmm8M9ftFv09JxI9Y-FI5waGnmVNC_ULC8gbahg1OTA-HysTS-Fsi8HE_5AUeVaZh29w60haMKFjTZuz5W-xN7VO75DMg40Lm4O53zHdzgUfMjm67G-_WFbMIYYGiIPIMLrM1G49NzzHDzrnRV14Ij-3F3dbDONNlXzML15y8Fxelfkx9vhLi2y8MqmD9q9cNfri_yS5SpkR2lk6J4oeqk2-h51mW5YfKZQUi_8agC5fl0B4SIRgw"
            />
            <div className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-outline-variant shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tripwise-blue animate-pulse"></span>
              <span className="font-semibold text-[10px] text-on-surface font-semibold">Optimized Route</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-surface p-3 rounded-xl border border-outline-variant flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-tertiary-fixed-dim mb-1">light_mode</span>
              <span className="font-semibold text-[10px] text-on-surface-variant">Sunny</span>
              <span className="font-bold text-on-background">{SAMPLE_TRIP.weatherTemp}</span>
            </div>
            <div className="bg-surface p-3 rounded-xl border border-outline-variant flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-primary mb-1">route</span>
              <span className="font-semibold text-[10px] text-on-surface-variant">Distance</span>
              <span className="font-bold text-on-background">{SAMPLE_TRIP.distance}</span>
            </div>
            <div className="bg-surface p-3 rounded-xl border border-outline-variant flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-secondary mb-1">payments</span>
              <span className="font-semibold text-[10px] text-on-surface-variant">Est. Cost</span>
              <span className="font-bold text-on-background">{SAMPLE_TRIP.estCost}</span>
            </div>
          </div>

          {/* Timeline Draft */}
          <div className="flex-1">
            <h3 className="font-semibold text-label-md text-on-surface-variant mb-3 uppercase tracking-wider">Draft Itinerary</h3>
            <div className="relative pl-6 space-y-4 border-l-2 border-outline-variant ml-3">
              {SAMPLE_TRIP.itinerary.map((item, idx) => (
                <div key={item.day} className={`relative ${idx > 0 ? 'opacity-80' : ''}`}>
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-surface-container-lowest border-2 ${idx === 0 ? 'border-primary' : 'border-outline-variant'}`} />
                  <div className="bg-surface p-3 rounded-xl border border-outline-variant shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-label-md text-on-background">{item.title}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{item.spots.join(' • ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimization score bar */}
          <div className="mt-6 bg-on-background text-on-primary rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tripwise-lime/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-tripwise-lime">psychology</span>
              </div>
              <div>
                <div className="font-semibold text-label-sm text-outline-variant mb-0.5">AI Optimization Score</div>
                <div className="font-bold text-[18px] text-tripwise-lime">{SAMPLE_TRIP.optimizationScore}% Highly Efficient</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
