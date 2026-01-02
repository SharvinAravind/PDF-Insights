import React from 'react';
import { UserProfile, Theme, AudioPlayerTheme, FontTheme, AUDIO_THEMES } from '../types';
import { X, User, CreditCard, ShieldCheck, Palette, Headphones, Type } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpgrade: () => void;
  theme: Theme;
  onToggleTheme: (t: Theme) => void;
  customColor?: string;
  onCustomColorChange?: (color: string) => void;
  audioPlayerTheme: AudioPlayerTheme;
  onAudioPlayerThemeChange: (t: AudioPlayerTheme) => void;
  fontTheme: FontTheme;
  onFontThemeChange: (f: FontTheme) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, user, onUpgrade, theme, onToggleTheme, customColor, onCustomColorChange,
  audioPlayerTheme, onAudioPlayerThemeChange, fontTheme, onFontThemeChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User size={22} className="text-blue-600" />
            Profile & Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>
        
        {/* Single Scrollable Panel */}
        <div className="p-6 space-y-8">
          
          {/* Section 1: Account */}
          <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <User size={16} /> Account Overview
              </h3>
              <div className={`p-5 rounded-2xl border-2 ${user.plan === 'premium' ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : 'border-slate-100 bg-white dark:bg-slate-800 dark:border-slate-700'}`}>
                <div className="flex justify-between items-start mb-3">
                    <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${user.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.plan} Tier
                    </span>
                    <h4 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                        {user.plan === 'premium' ? 'Deep Insight Pro' : 'Free Starter'}
                    </h4>
                    </div>
                    {user.plan === 'premium' ? <ShieldCheck className="text-amber-500" size={28}/> : <CreditCard className="text-slate-400" size={28} />}
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Searches Used</span>
                    <span className="font-bold text-slate-900 dark:text-white">{user.creditsUsed} / {user.plan === 'premium' ? '∞' : user.creditsLimit}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${user.plan === 'premium' ? 'bg-amber-500' : 'bg-blue-600'}`} 
                        style={{ width: user.plan === 'premium' ? '100%' : `${(user.creditsUsed / user.creditsLimit) * 100}%` }}
                    ></div>
                    </div>
                    {user.plan === 'free' && (
                    <p className="text-xs text-slate-500 pt-1">
                        Upgrade to Premium for unlimited searches, multi-file uploads, and exclusive features.
                    </p>
                    )}
                </div>

                {user.plan === 'free' && (
                    <button 
                    onClick={() => { onClose(); onUpgrade(); }}
                    className="mt-4 w-full py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                    >
                    Upgrade Now
                    </button>
                )}
              </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

          {/* Section 2: Appearance */}
          <div className="space-y-6">
                 {/* App Theme Selection */}
                 <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Palette size={16} /> Color Mode
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => onToggleTheme('light')}
                            className={`p-3 rounded-xl border flex items-center gap-2 ${theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-200 dark:border-slate-700'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-white border border-slate-300"></div> Light
                        </button>
                        <button 
                            onClick={() => onToggleTheme('dark')}
                            className={`p-3 rounded-xl border flex items-center gap-2 ${theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-200 dark:border-slate-700'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700"></div> Dark
                        </button>
                    </div>
                 </div>

                 {/* Premium App Skins */}
                 <div>
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Premium Skins</h3>
                        {user.plan === 'free' && <span className="text-xs text-amber-500 font-bold">LOCKED</span>}
                     </div>
                     {user.plan === 'free' ? (
                         <button onClick={() => { onClose(); onUpgrade(); }} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-sm font-medium border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                             Upgrade to Unlock Skins
                         </button>
                     ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => onToggleTheme('amoled')}
                                className={`p-3 rounded-xl border flex items-center gap-2 ${theme === 'amoled' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <div className="w-4 h-4 rounded-full bg-black border border-slate-700"></div> AMOLED
                            </button>
                            <button 
                                onClick={() => onToggleTheme('gradient')}
                                className={`p-3 rounded-xl border flex items-center gap-2 ${theme === 'gradient' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 to-orange-400"></div> Gradient
                            </button>
                            <button 
                                onClick={() => onToggleTheme('midnight')}
                                className={`p-3 rounded-xl border flex items-center gap-2 ${theme === 'midnight' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <div className="w-4 h-4 rounded-full bg-slate-900 border border-blue-900"></div> Midnight
                            </button>
                            
                            {/* Custom Theme Button + Color Picker Inline */}
                            <button 
                                onClick={() => onToggleTheme('custom')}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-2 relative ${theme === 'custom' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: customColor || '#3b82f6'}}></div> 
                                    <span>Custom</span>
                                </div>
                                {theme === 'custom' && onCustomColorChange && (
                                    <input 
                                        type="color" 
                                        value={customColor}
                                        onChange={(e) => onCustomColorChange(e.target.value)}
                                        className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                                        onClick={(e) => e.stopPropagation()} // Prevent button toggle
                                    />
                                )}
                            </button>
                        </div>
                     )}
                 </div>

                 {/* Typography Settings (Premium) */}
                 <div>
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                             <Type size={14}/> Typography
                        </h3>
                        {user.plan === 'free' && <span className="text-xs text-amber-500 font-bold">LOCKED</span>}
                     </div>
                     {user.plan === 'free' ? (
                         <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500">
                             Upgrade to change fonts
                         </div>
                     ) : (
                         <div className="grid grid-cols-3 gap-2">
                             <button
                                onClick={() => onFontThemeChange('sans')}
                                className={`p-2 rounded-lg border text-sm font-sans ${fontTheme === 'sans' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-200 dark:border-slate-700'}`}
                             >
                                 Modern
                             </button>
                             <button
                                onClick={() => onFontThemeChange('serif')}
                                className={`p-2 rounded-lg border text-sm font-serif ${fontTheme === 'serif' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-200 dark:border-slate-700'}`}
                             >
                                 Elegant
                             </button>
                             <button
                                onClick={() => onFontThemeChange('mono')}
                                className={`p-2 rounded-lg border text-sm font-mono ${fontTheme === 'mono' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-200 dark:border-slate-700'}`}
                             >
                                 Tech
                             </button>
                         </div>
                     )}
                 </div>

                 {/* Audio Player Themes */}
                 <div>
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                             <Headphones size={14}/> Audio Player Theme
                        </h3>
                        {user.plan === 'free' && <span className="text-xs text-amber-500 font-bold">LOCKED</span>}
                     </div>
                     {user.plan === 'free' ? (
                         <button onClick={() => { onClose(); onUpgrade(); }} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-sm font-medium border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                             Upgrade to Customize Player
                         </button>
                     ) : (
                         <div className="space-y-2">
                             {AUDIO_THEMES.map((t) => (
                                 <button
                                    key={t.id}
                                    onClick={() => onAudioPlayerThemeChange(t.id)}
                                    className={`w-full p-3 rounded-xl border text-left transition-all ${audioPlayerTheme === t.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                 >
                                     <div className="flex justify-between items-center">
                                         <div>
                                             <div className="font-semibold text-slate-900 dark:text-white text-sm">{t.name}</div>
                                             <div className="text-xs text-slate-500 dark:text-slate-400">{t.description}</div>
                                         </div>
                                         {audioPlayerTheme === t.id && <div className="w-3 h-3 rounded-full bg-blue-500"></div>}
                                     </div>
                                 </button>
                             ))}
                         </div>
                     )}
                 </div>
             </div>
          
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;