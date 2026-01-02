import React from 'react';
import { HistoryItem, UserProfile } from '../types';
import { Clock, Lock, ChevronLeft, FileText, Heart } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSelectHistory: (item: HistoryItem) => void;
  onUpgrade: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, onSelectHistory, onUpgrade }) => {
  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Panel (Slides from Right) */}
      <div className={`fixed top-0 right-0 bottom-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
             <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Clock size={20} className="text-blue-500"/> History
             </h2>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
               <ChevronLeft />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {user.plan === 'free' ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                   <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-400">
                      <Lock size={20} />
                   </div>
                   <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-2">History is Locked</h3>
                   <p className="text-sm text-slate-500 mb-6">Upgrade to Premium to automatically save your summaries and revisit them anytime.</p>
                   <button 
                      onClick={onUpgrade}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                   >
                      Unlock History
                   </button>
                </div>
             ) : user.history.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                   <p>No history yet.</p>
                </div>
             ) : (
                user.history.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => { onSelectHistory(item); onClose(); }}
                    className="w-full text-left p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:border-slate-700 group"
                  >
                     <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                           {item.isFavorite ? <Heart size={16} className="text-red-500 fill-red-500"/> : <FileText size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start">
                               <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm line-clamp-1 mb-1">{item.fileName}</p>
                               {item.isFavorite && <Heart size={10} className="text-red-500 fill-red-500 ml-1 flex-shrink-0" />}
                           </div>
                           <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.summarySnippet}</p>
                           <p className="text-[10px] text-slate-400 mt-2">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                     </div>
                  </button>
                ))
             )}
          </div>
          
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
             <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <span>{user.history.length} Saved Items</span>
                {user.plan === 'premium' && <span>Cloud Sync On</span>}
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;