import React, { useState } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Loader2, 
  Maximize2, Minimize2, Square, 
  Activity, Settings2
} from 'lucide-react';

export interface PlaylistTrack {
  id: string; // 'short' | 'medium' | 'long'
  title: string;
  isGenerated: boolean;
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
  tracks: PlaylistTrack[];
  onSelectTrack: (trackId: string) => void;
  isGenerating?: boolean;
  isFloating: boolean;
  onToggleFloat: () => void;
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
  tracks = [], 
  onSelectTrack,
  isGenerating,
  isFloating,
  onToggleFloat
}) => {
  const [isMuted, setIsMuted] = useState(false);
  
  const safeCurrentTime = isNaN(currentTime) ? 0 : currentTime;
  const safeDuration = isNaN(duration) || duration === 0 ? 1 : duration; 
  const progressPercent = Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100));

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "00:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleToggleMute = () => {
      if (isMuted || volume === 0) {
          onVolumeChange(1);
          setIsMuted(false);
      } else {
          onVolumeChange(0);
          setIsMuted(true);
      }
  };

  return (
    <div className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl ${isFloating ? 'rounded-3xl' : 'rounded-2xl'} p-3 transition-all duration-500`}>
        <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Play/Pause Control */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={onPlayPause}
                    disabled={isGenerating || !audioUrl}
                    className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-0.5"/>}
                </button>
                <button onClick={() => onSeek(0)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Square size={16} fill="currentColor"/>
                </button>
            </div>

            {/* Seek Slider */}
            <div className="flex-1 flex items-center gap-3 w-full">
                <span className="font-mono text-[10px] text-slate-500 min-w-[35px]">{formatTime(safeCurrentTime)}</span>
                <div className="relative flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100" style={{width: `${progressPercent}%`}}></div>
                    <input 
                        type="range" min={0} max={safeDuration} step={0.1} value={safeCurrentTime} 
                        onChange={(e) => onSeek(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                </div>
                <span className="font-mono text-[10px] text-slate-500 min-w-[35px]">{formatTime(safeDuration)}</span>
            </div>

            {/* Options Bar */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                {/* Short, Medium, Long buttons */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {tracks.map(track => (
                        <button
                            key={track.id}
                            onClick={() => onSelectTrack(track.id)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currentType === track.id ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {track.title}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {/* Volume Control */}
                    <div className="flex items-center gap-2 group/vol min-w-[100px]">
                        <button onClick={handleToggleMute} className="text-slate-400 hover:text-blue-500">
                            {isMuted || volume === 0 ? <VolumeX size={16}/> : <Volume2 size={16}/>}
                        </button>
                        <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
                            <div className="h-full bg-blue-500" style={{width: `${volume * 100}%`}}></div>
                            <input 
                                type="range" min={0} max={1} step={0.1} value={volume} 
                                onChange={(e) => onVolumeChange(Number(e.target.value))}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                        <span className="text-[8px] font-black uppercase text-slate-400 min-w-[35px]">Volume</span>
                    </div>

                    {/* Pop-up / Dock Toggle */}
                    <button 
                        onClick={onToggleFloat}
                        className={`p-2 rounded-xl transition-all ${isFloating ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600'}`}
                        title={isFloating ? "Dock Player" : "Pop-up Player"}
                    >
                        {isFloating ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default BlizzyAudioPlayer;