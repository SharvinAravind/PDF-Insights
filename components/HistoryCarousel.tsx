import React from 'react';
import { HistoryItem } from '../types';
import { Clock, FileText, ChevronRight } from 'lucide-react';

interface HistoryCarouselProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

const HistoryCarousel: React.FC<HistoryCarouselProps> = ({ history, onSelect }) => {
  if (!history || history.length === 0) return null;

  // Duplicate items for infinite scroll effect if list is short
  const items = history.length < 5 ? [...history, ...history, ...history, ...history] : [...history, ...history];

  return (
    <div className="w-full max-w-7xl mx-auto mb-8 overflow-hidden relative group">
      <div className="flex items-center gap-2 mb-3 px-4">
        <Clock size={16} className="text-blue-500" />
        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recent Activity</span>
      </div>
      
      {/* Gradient Masks */}
      <div className="absolute left-0 top-8 bottom-0 w-20 bg-gradient-to-r from-[#f8fafc] dark:from-[#0f172a] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-8 bottom-0 w-20 bg-gradient-to-l from-[#f8fafc] dark:from-[#0f172a] to-transparent z-10 pointer-events-none"></div>

      <div className="flex gap-4 animate-scroll w-max py-2 pl-4">
        {items.map((item, idx) => (
          <button
            key={`${item.id}-${idx}`}
            onClick={() => onSelect(item)}
            className="w-64 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 text-left flex flex-col gap-2 group/card"
          >
            <div className="flex items-start justify-between w-full">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <FileText size={18} />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {new Date(item.date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{item.fileName}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                {item.summarySnippet}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HistoryCarousel;