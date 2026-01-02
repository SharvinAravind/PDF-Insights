
import React, { useState, useEffect } from 'react';
import { ProcessingState, MultiFileProgress } from '../types';
import { Loader2, CheckCircle2, FileSearch, Sparkles, FileText, Timer } from 'lucide-react';

interface PipelineStatusProps {
  state: ProcessingState;
  multiProgress?: MultiFileProgress;
}

const PipelineStatus: React.FC<PipelineStatusProps> = ({ state, multiProgress }) => {
  const [timeLeft, setTimeLeft] = useState(5); // Default estimation

  // Reset timer logic based on batch size
  useEffect(() => {
    if (multiProgress) {
        // Estimate ~5-8 seconds per file remaining
        const remaining = (multiProgress.totalFiles - multiProgress.currentFileIndex + 1) * 6;
        setTimeLeft(remaining);
    }
  }, [multiProgress]);

  // Countdown effect
  useEffect(() => {
    if (state !== ProcessingState.COMPLETED && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, state]);

  const steps = [
    { id: ProcessingState.READING_FILE, label: 'Reading File', icon: FileText },
    { id: ProcessingState.EXTRACTING, label: 'Extracting Data', icon: FileSearch },
    { id: ProcessingState.SUMMARIZING, label: 'AI Analysis', icon: Sparkles },
  ];

  const getStatusIndex = (s: ProcessingState) => {
    if (s === ProcessingState.READING_FILE) return 0;
    if (s === ProcessingState.EXTRACTING) return 1;
    if (s === ProcessingState.SUMMARIZING) return 2;
    if (s === ProcessingState.COMPLETED) return 3;
    return -1;
  };

  const currentIndex = getStatusIndex(state);

  return (
    <div className="w-full max-w-2xl mx-auto my-12 z-20 relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700 animate-in zoom-in-95 duration-500">
      
      {/* Estimated Wait Indicator */}
      <div className="absolute top-4 right-6 flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-slate-800 rounded-full border border-blue-100 dark:border-slate-700 animate-in fade-in duration-700">
         <Timer size={14} className="text-blue-600 dark:text-blue-400" />
         <span className="text-xs font-mono font-semibold text-blue-900 dark:text-blue-200">
            Est: ~{timeLeft}s
         </span>
      </div>

      {/* Multi-File Progress Indicator */}
      {multiProgress && multiProgress.totalFiles > 1 && (
          <div className="absolute top-4 left-6 flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-slate-800 rounded-full border border-purple-100 dark:border-slate-700 animate-in fade-in">
             <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                Processing File {multiProgress.currentFileIndex + 1} of {multiProgress.totalFiles}
             </span>
          </div>
      )}

      <div className="relative flex justify-between mt-8">
        {/* Connecting Line Base */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0 rounded-full"></div>
        
        {/* Active Progress Line with Shimmer */}
        <div 
          className="absolute top-1/2 left-0 h-1 bg-blue-600 dark:bg-blue-500 -translate-y-1/2 z-0 rounded-full transition-all duration-700 ease-out overflow-hidden"
          style={{ width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%` }}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-white/30 animate-shimmer"></div>
        </div>

        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <div 
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center border-4 transition-all duration-500
                  ${isActive ? 'bg-white dark:bg-slate-800 border-blue-600 dark:border-blue-500 scale-110 shadow-lg shadow-blue-500/30' : ''}
                  ${isCompleted ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500' : ''}
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-7 h-7 animate-in zoom-in duration-300" />
                ) : isActive ? (
                  <Loader2 className="w-7 h-7 text-blue-600 dark:text-blue-500 animate-spin" />
                ) : (
                  <Icon className="w-6 h-6 transition-colors duration-300" />
                )}
              </div>
              <span 
                className={`
                  absolute top-16 text-sm font-bold whitespace-nowrap transition-colors duration-300
                  ${isActive || isCompleted ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}
                  ${isActive ? 'scale-105' : 'scale-100'}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-20 text-center h-8">
        <p className="text-slate-600 dark:text-slate-300 text-lg font-medium animate-pulse transition-all duration-500 key={state}">
          {state === ProcessingState.READING_FILE && `Reading document: ${multiProgress?.currentFileName || '...'}`}
          {state === ProcessingState.EXTRACTING && "Decrypting text & formatting..."}
          {state === ProcessingState.SUMMARIZING && "Generating deep AI insights..."}
        </p>
      </div>
    </div>
  );
};

export default PipelineStatus;
