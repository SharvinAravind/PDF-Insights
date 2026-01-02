import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Download, Loader2, Zap, Disc, Maximize2, Minimize2, ListMusic, Power, Square } from 'lucide-react';
import { AudioPlayerTheme } from '../types';

export interface PlaylistTrack {
  id: string; // 'short' | 'medium' | 'long'
  title: string;
  duration?: number;
  isGenerated: boolean;
  audioUrl?: string;
}

interface BlizzyAudioPlayerProps {
  audioUrl: string | null;
  currentType: string | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  playbackRate: number;
  onSetPlaybackRate: (rate: number) => void;
  
  volume: number;
  onVolumeChange: (v: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onNext: () => void;
  onPrev: () => void;

  tracks: PlaylistTrack[];
  onSelectTrack: (trackId: string) => void;
  
  coverImage?: string | null;
  isGenerating?: boolean;
  
  onGenerateAll?: () => void;
  isGeneratingAll?: boolean;
  
  defaultMinimized?: boolean;
  theme?: AudioPlayerTheme;
}

const BlizzyAudioPlayer: React.FC<BlizzyAudioPlayerProps> = ({
  audioUrl,
  currentType,
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
  playbackRate,
  onSetPlaybackRate,
  volume,
  onVolumeChange,
  isLooping,
  onToggleLoop,
  onNext,
  onPrev,
  tracks = [], 
  onSelectTrack,
  coverImage,
  isGenerating,
  onGenerateAll,
  isGeneratingAll,
  defaultMinimized = true,
  theme = 'classic'
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isOn, setIsOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  
  // Safe getters
  const safeCurrentTime = isNaN(currentTime) ? 0 : currentTime;
  const safeDuration = isNaN(duration) || duration === 0 ? 1 : duration; 
  const progressPercent = Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100));

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "00:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const getTrackLabel = (id: string | null) => {
    switch(id) {
        case 'short': return 'Short Summary';
        case 'medium': return 'Medium Overview';
        case 'long': return 'Deep Dive';
        default: return 'Select Track';
    }
  };

  const handleToggleMute = () => {
      if (isMuted) {
          onVolumeChange(1);
          setIsMuted(false);
      } else {
          onVolumeChange(0);
          setIsMuted(true);
      }
  };

  const handlePower = () => {
      if (isOn) {
          if (isPlaying) onPlayPause();
          setIsOn(false);
      } else {
          setIsOn(true);
      }
  };

  const handleStop = () => {
      if (isPlaying) onPlayPause();
      onSeek(0);
  };

  // --- THEME STYLES CONFIG ---
  const getThemeClasses = () => {
      switch(theme) {
          case 'cyberpunk':
              return {
                  container: "bg-slate-900 border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] rounded-xl",
                  display: "bg-black border border-cyan-900 font-mono text-cyan-400 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]",
                  accent: "cyan-400",
                  btnPrimary: "bg-cyan-600 hover:bg-cyan-500 text-black font-bold",
                  btnSecondary: "border border-cyan-800 text-cyan-400 hover:bg-cyan-900/30",
                  sliderTrack: "bg-slate-800",
                  sliderFill: "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]",
                  font: "font-mono"
              };
          case 'glass':
              return {
                  container: "bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl",
                  display: "bg-white/10 dark:bg-black/20 rounded-2xl",
                  accent: "blue-500",
                  btnPrimary: "bg-white/80 dark:bg-white/10 hover:bg-white text-blue-600 backdrop-blur-md shadow-lg",
                  btnSecondary: "text-slate-600 dark:text-slate-300 hover:bg-white/20",
                  sliderTrack: "bg-white/20",
                  sliderFill: "bg-blue-500/80",
                  font: "font-sans"
              };
           case 'cassette':
              return {
                  container: "bg-orange-100 dark:bg-amber-900/40 border-4 border-orange-200 dark:border-amber-800 rounded-[2rem] shadow-xl",
                  display: "bg-stone-800 border-2 border-stone-600 rounded-lg",
                  accent: "orange-500",
                  btnPrimary: "bg-orange-500 hover:bg-orange-600 text-white shadow-md border-b-4 border-orange-700 active:border-b-0 active:translate-y-1",
                  btnSecondary: "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 border-b-2 border-stone-400 dark:border-stone-900 hover:bg-stone-300 active:border-b-0 active:translate-y-0.5",
                  sliderTrack: "bg-stone-300 dark:bg-stone-800",
                  sliderFill: "bg-orange-500",
                  font: "font-mono"
              };
           case 'minimal':
              return {
                  container: "bg-white dark:bg-black border-2 border-black dark:border-white rounded-none shadow-none",
                  display: "bg-transparent text-black dark:text-white",
                  accent: "black dark:text-white",
                  btnPrimary: "bg-black dark:bg-white text-white dark:text-black hover:opacity-80 rounded-none",
                  btnSecondary: "text-gray-500 hover:text-black dark:hover:text-white rounded-none",
                  sliderTrack: "bg-gray-200 dark:bg-gray-800 h-0.5",
                  sliderFill: "bg-black dark:bg-white h-0.5",
                  font: "font-sans tracking-tight"
              };
          case 'classic':
          default:
              // Milky White / Cream Theme with Glowing Sliders
              return {
                  container: "bg-[#FDFBF7] dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-xl",
                  display: "bg-stone-900 border border-stone-300 dark:border-slate-700 shadow-inner rounded-xl",
                  accent: "amber-500",
                  btnPrimary: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30",
                  btnSecondary: "bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-500 hover:text-stone-700",
                  sliderTrack: "bg-stone-200 dark:bg-slate-800",
                  sliderFill: "bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]",
                  font: "font-sans"
              };
      }
  };

  const themeClasses = getThemeClasses();

  // --- COMPACT PLAYER VIEW ---
  if (isMinimized) {
      return (
          <div className={`w-full ${theme === 'minimal' ? 'border-b border-black dark:border-white bg-white dark:bg-black' : 'bg-[#fdfbf7] dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800'} shadow-md animate-in fade-in slide-in-from-top-2`}>
              <div className="w-full px-4 py-2 flex items-center gap-4">
                  
                  {/* Controls */}
                  <div className="flex items-center gap-2">
                       {/* Play/Pause */}
                      <button 
                          onClick={onPlayPause}
                          disabled={!isOn || isGenerating}
                          className={`w-10 h-10 flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'minimal' ? 'bg-black text-white dark:bg-white dark:text-black rounded-none' : 'rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`}
                      >
                           {isGenerating ? <Loader2 size={18} className="animate-spin" /> : isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-0.5"/>}
                      </button>

                      {/* Stop */}
                      <button 
                          onClick={handleStop}
                          disabled={!isOn || isGenerating}
                          className="p-2 text-stone-400 hover:text-red-500 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                          title="Stop"
                      >
                          <Square size={16} fill="currentColor" />
                      </button>
                  </div>

                  {/* Info & Progress */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      <div className="flex justify-between items-center text-xs">
                          <span className={`font-bold truncate pr-2 ${theme === 'minimal' ? 'text-black dark:text-white' : 'text-stone-700 dark:text-stone-200'}`}>
                              {getTrackLabel(currentType)}
                          </span>
                          <span className="font-mono text-stone-500">
                              {formatTime(safeCurrentTime)} / {formatTime(safeDuration)}
                          </span>
                      </div>
                      
                      {/* Slim Progress Bar */}
                      <div className={`relative h-1.5 rounded-full w-full group cursor-pointer overflow-hidden ${theme === 'minimal' ? 'bg-gray-200 dark:bg-gray-800 h-1 rounded-none' : 'bg-stone-200 dark:bg-slate-700'}`}>
                           <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-100 ${theme === 'minimal' ? 'bg-black dark:bg-white rounded-none' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'}`} style={{width: `${progressPercent}%`}}></div>
                           <input 
                                type="range" 
                                min={0} 
                                max={safeDuration} 
                                value={safeCurrentTime} 
                                onChange={(e) => onSeek(Number(e.target.value))}
                                disabled={!isOn || isGenerating}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                           />
                      </div>
                  </div>

                  {/* Extra Actions */}
                  <div className="flex items-center gap-2 border-l border-stone-200 dark:border-slate-700 pl-3">
                      
                      {/* Generate All Button */}
                      {onGenerateAll && (
                          <button 
                              onClick={onGenerateAll}
                              disabled={isGeneratingAll}
                              className="p-2 text-stone-400 hover:text-amber-600 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                              title="Generate All Audio"
                          >
                              {isGeneratingAll ? <Loader2 size={18} className="animate-spin text-amber-500"/> : <Zap size={18} className="text-amber-500"/>}
                          </button>
                      )}

                      {/* Download */}
                      {audioUrl && (
                          <a href={audioUrl} download={`DeepInsight_${currentType}.wav`} className="p-2 text-stone-400 hover:text-amber-600 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors">
                              <Download size={18} />
                          </a>
                      )}

                      {/* Expand */}
                      <button 
                          onClick={() => setIsMinimized(false)}
                          className="p-2 text-stone-400 hover:text-blue-500 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                          title="Expand Player"
                      >
                          <Maximize2 size={18} />
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- FULL PLAYER VIEW (THEMED) ---
  return (
    <div className={`w-full my-4 animate-in zoom-in-95 duration-500 relative ${themeClasses.font}`}>
        
        {/* Minimize Button */}
        <button 
            onClick={() => setIsMinimized(true)}
            className="absolute top-3 right-3 z-20 p-1.5 opacity-50 hover:opacity-100 transition-opacity"
            title="Minimize Player"
        >
            <Minimize2 size={14} className={theme === 'cyberpunk' ? 'text-cyan-400' : 'text-stone-500 dark:text-stone-400'} />
        </button>

        {/* CHASSIS */}
        <div className={`relative w-full ${themeClasses.container} overflow-hidden group`}>
            
            {/* Theme Specific Backgrounds */}
            {theme === 'classic' && (
                <div className="absolute inset-0 opacity-5 pointer-events-none" 
                     style={{backgroundImage: 'radial-gradient(circle, #000 0.5px, transparent 0.5px)', backgroundSize: '4px 4px'}}>
                </div>
            )}
            {theme === 'cyberpunk' && (
                 <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
            )}

            {/* TOP PANEL: DISPLAY & SPEAKER */}
            <div className="flex flex-col md:flex-row items-center p-4 md:p-6 gap-6">
                
                {/* Visualizer / Cover Art Area */}
                <div className="w-24 h-24 flex-shrink-0 relative hidden sm:block">
                    {theme === 'cassette' ? (
                         <div className="w-full h-full bg-stone-800 rounded-lg flex items-center justify-center border-2 border-stone-600">
                             <div className={`w-16 h-16 rounded-full border-4 border-white border-dashed ${isPlaying ? 'animate-spin' : ''}`}></div>
                         </div>
                    ) : (
                        <div className={`w-full h-full ${theme === 'minimal' ? '' : 'rounded-full shadow-inner border-2'} ${themeClasses.sliderTrack} relative flex items-center justify-center overflow-hidden`}>
                            {isOn && (
                                <div className={`relative z-10 w-full h-full overflow-hidden ${theme === 'minimal' ? '' : 'rounded-full'} ${isPlaying && theme !== 'minimal' ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                    {coverImage ? (
                                        <img src={coverImage} className="w-full h-full object-cover" alt="Album" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${theme === 'cyberpunk' ? 'bg-cyan-900/50' : 'bg-gradient-to-br from-amber-100 to-orange-100'}`}>
                                            <Disc className={theme === 'cyberpunk' ? 'text-cyan-400' : 'text-amber-300'} size={32} />
                                        </div>
                                    )}
                                    {theme !== 'minimal' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-sm"></div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Center: Display & Tuner */}
                <div className="flex-1 flex flex-col gap-3 min-w-0 w-full">
                    
                    {/* DISPLAY - INCREASED HEIGHT FOR BETTER ENGAGEMENT */}
                    <div className={`
                        relative w-full h-32 ${themeClasses.display} overflow-hidden
                        flex flex-col items-center justify-center px-4 transition-all duration-500
                    `}>
                        {isOn ? (
                            <>
                                <div className={`w-full flex justify-between items-end mb-2 border-b pb-1 ${theme === 'cyberpunk' ? 'border-cyan-800 text-cyan-600' : 'border-amber-900/10 text-stone-500'}`}>
                                    <span className="text-[10px] uppercase tracking-widest">{isPlaying ? 'PLAYING' : 'READY'}</span>
                                    <span className="text-[10px]">{playbackRate}x</span>
                                </div>
                                <div className={`text-2xl font-bold tracking-wider animate-pulse-slow text-center truncate w-full ${theme === 'cyberpunk' ? 'text-cyan-400' : theme === 'cassette' ? 'text-green-500 font-mono' : 'text-amber-500'}`}>
                                    {isGenerating ? "TUNING..." : (getTrackLabel(currentType) || "NO SIGNAL")}
                                </div>
                                <div className="w-full flex justify-between items-start mt-3">
                                     <span className={`font-mono text-sm ${theme === 'cyberpunk' ? 'text-cyan-700' : 'text-stone-400'}`}>{formatTime(safeCurrentTime)}</span>
                                     
                                     {/* Audio Wave Animation */}
                                     <div className="flex gap-1 items-end h-6">
                                         {[...Array(12)].map((_, i) => (
                                             <div key={i} className={`w-1 bg-current opacity-50 rounded-full ${isPlaying ? 'animate-bounce' : ''}`} style={{
                                                 height: isPlaying ? `${Math.random() * 100}%` : '20%',
                                                 animationDelay: `${i * 0.1}s`,
                                                 color: theme === 'cyberpunk' ? '#06b6d4' : theme === 'cassette' ? '#22c55e' : '#f59e0b'
                                             }}></div>
                                         ))}
                                     </div>

                                     <span className={`font-mono text-sm ${theme === 'cyberpunk' ? 'text-cyan-700' : 'text-stone-400'}`}>{formatTime(safeDuration)}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center opacity-30">
                                <span className="text-sm font-bold tracking-widest">OFFLINE</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MIDDLE: SLIDER */}
            <div className="px-4 md:px-6 pb-2">
                 <div className={`relative h-2 rounded-full w-full group cursor-pointer ${themeClasses.sliderTrack}`}>
                       <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-100 ${themeClasses.sliderFill}`} style={{width: `${progressPercent}%`}}></div>
                       <input 
                            type="range" 
                            min={0} 
                            max={safeDuration} 
                            value={safeCurrentTime} 
                            onChange={(e) => onSeek(Number(e.target.value))}
                            disabled={!isOn || isGenerating}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                       />
                       {/* Glowing Thumb Effect */}
                       {theme === 'classic' && (
                           <div 
                             className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)] pointer-events-none transition-all duration-100 border-2 border-amber-500"
                             style={{ left: `calc(${progressPercent}% - 8px)` }}
                           ></div>
                       )}
                 </div>
            </div>

            {/* BOTTOM: CONTROLS */}
            <div className="p-4 md:p-6 flex flex-wrap items-center justify-between gap-4">
                
                {/* Transport */}
                <div className="flex items-center gap-3">
                    <button onClick={onPrev} disabled={!isOn} className={`p-3 rounded-full transition-all active:scale-95 ${themeClasses.btnSecondary}`}>
                        <SkipBack size={20} />
                    </button>

                    <button 
                        onClick={onPlayPause}
                        disabled={!isOn || isGenerating}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.btnPrimary}`}
                    >
                         {isGenerating ? <Loader2 size={24} className="animate-spin" /> : isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor" className="ml-1"/>}
                    </button>

                    <button onClick={onNext} disabled={!isOn} className={`p-3 rounded-full transition-all active:scale-95 ${themeClasses.btnSecondary}`}>
                        <SkipForward size={20} />
                    </button>
                </div>
                
                {/* Presets / Tracks */}
                <div className={`flex items-center gap-2 p-1 rounded-xl overflow-x-auto hide-scrollbar ${theme === 'minimal' ? '' : 'bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700'}`}>
                    {tracks.map(track => (
                        <button
                            key={track.id}
                            onClick={() => { if(isOn) onSelectTrack(track.id); }}
                            disabled={!isOn}
                            className={`
                                relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 whitespace-nowrap
                                ${currentType === track.id 
                                    ? (theme === 'cyberpunk' ? 'bg-cyan-900 text-cyan-400 shadow-sm' : 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm') 
                                    : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}
                            `}
                        >
                            {track.id.charAt(0).toUpperCase() + track.id.slice(1)}
                            {!track.isGenerated && <Zap size={10} className={currentType === track.id ? 'text-amber-500' : 'text-stone-300'} />}
                        </button>
                    ))}
                    {audioUrl && isOn && (
                        <a href={audioUrl} download={`DeepInsight_${currentType}.wav`} className="p-1.5 text-stone-400 hover:text-amber-600 transition-colors" title="Download">
                            <Download size={14} />
                        </a>
                    )}
                </div>

                {/* Volume, Loop & Power */}
                <div className="flex items-center gap-3">
                     
                     <button onClick={handlePower} className={`p-2 rounded-full transition-colors ${isOn ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-red-400 bg-red-50 dark:bg-red-900/20'} hover:bg-opacity-80`} title={isOn ? "Turn Off" : "Turn On"}>
                         <Power size={18} />
                     </button>

                     <button onClick={onToggleLoop} disabled={!isOn} className={`p-2 rounded-full transition-colors disabled:opacity-30 ${isLooping ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-stone-400 hover:text-stone-600'}`}>
                         <Repeat size={18} />
                     </button>
                     
                     <div className={`flex items-center gap-2 group/vol ${!isOn ? 'opacity-30 pointer-events-none' : ''}`}>
                        <button onClick={handleToggleMute} className="text-stone-400 hover:text-stone-600">
                             {isMuted || volume === 0 ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                        </button>
                        <div className={`w-20 h-1.5 rounded-full overflow-hidden cursor-pointer ${themeClasses.sliderTrack}`}>
                             <div className={`h-full ${themeClasses.sliderFill}`} style={{width: `${volume * 100}%`}}></div>
                             <input 
                                type="range" 
                                min={0} 
                                max={1} 
                                step={0.1}
                                value={volume} 
                                onChange={(e) => onVolumeChange(Number(e.target.value))}
                                className="absolute opacity-0 w-20 h-4 -ml-6 -mt-1 cursor-pointer"
                             />
                        </div>
                     </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default BlizzyAudioPlayer;