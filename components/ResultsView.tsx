import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Download, MessageSquare, HelpCircle, 
  Image as ImageIcon, Sparkles, Brain, 
  ChevronRight, Trash2, BookOpen, Send, Loader2, CheckCircle2,
  User, Globe, FileType,
  Maximize2, Minimize2, X, FileCode, RefreshCw, Mic, Clock, Hash, ExternalLink,
  ChevronDown, PlayCircle, Activity
} from 'lucide-react';
import { AnalysisResult, AudioState, SummaryLevel, PlanType, AudioPlayerTheme, SUPPORTED_LANGUAGES, ChatMessage, QuizQuestion, VOICE_OPTIONS } from '../types';
import BlizzyAudioPlayer, { PlaylistTrack } from './BlizzyAudioPlayer';
import { translateText, askDocument, generateQuiz, generateConceptImages } from '../services/geminiService';

declare global {
  interface Window {
    mermaid: any;
    html2canvas: any;
    jspdf: any;
  }
}

interface ResultsViewProps {
  result: AnalysisResult;
  onGenerateAudio: (text: string, type: 'short' | 'medium' | 'long', voice: string, forceRegenerate?: boolean) => void;
  audioState: AudioState;
  onReset: () => void;
  userPlan: PlanType;
  onUpgrade: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  audioPlayerTheme: AudioPlayerTheme;
}

const ResultsView: React.FC<ResultsViewProps> = ({
  result, onGenerateAudio, audioState, onReset, userPlan, onUpgrade, 
  isFavorite, onToggleFavorite, audioPlayerTheme
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'chat' | 'quiz'>('summary');
  const [summaryLevel, setSummaryLevel] = useState<SummaryLevel>(SummaryLevel.MEDIUM);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [targetLang, setTargetLang] = useState('en');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isAudioFloating, setIsAudioFloating] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [conceptImages, setConceptImages] = useState<string[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isRoadmapMaximized, setIsRoadmapMaximized] = useState(false);

  const [maximizedImage, setMaximizedImage] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  const mermaidRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentSummaryText = translatedContent || (
    summaryLevel === SummaryLevel.SHORT ? result.shortSummary : 
    summaryLevel === SummaryLevel.MEDIUM ? result.mediumSummary : result.longSummary
  );
  
  const currentWordCount = (currentSummaryText || "").trim().split(/[\s\u2000-\u200B\u202F\u205F\u3000]+/).filter(w => w.length > 0).length;
  const currentReadTime = Math.max(1, Math.ceil(currentWordCount / 200));

  useEffect(() => {
    if (conceptImages.length === 0 && !isGeneratingImages && userPlan === 'premium') {
      handleGenerateImages();
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying && audio.src) {
        audio.play().catch(() => setIsPlaying(false));
    } else {
        audio.pause();
    }
  }, [isPlaying, audioState.audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = volume;
      audioRef.current.loop = isLooping;
    }
  }, [playbackRate, volume, isLooping]);

  useEffect(() => {
    if (result.diagramDefinition && window.mermaid && activeTab === 'summary') {
      try {
        window.mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
        setTimeout(() => {
          if (mermaidRef.current) window.mermaid.contentLoaded();
        }, 100);
      } catch (e) { console.error(e); }
    }
  }, [result.diagramDefinition, activeTab, summaryLevel, isRoadmapMaximized]);

  const handleTranslate = async (langCode: string = targetLang) => {
    if (langCode === 'en') { setTranslatedContent(null); return null; }
    setIsTranslating(true);
    try {
      const content = summaryLevel === SummaryLevel.SHORT ? result.shortSummary : 
                      summaryLevel === SummaryLevel.MEDIUM ? result.mediumSummary : result.longSummary;
      const translated = await translateText(content, SUPPORTED_LANGUAGES.find(l => l.code === langCode)?.name || 'English');
      setTranslatedContent(translated);
      return translated;
    } finally { setIsTranslating(false); }
  };

  const handleGenerateImages = async () => {
    setIsGeneratingImages(true);
    try {
      const imgs = await generateConceptImages(result.shortSummary || "Intelligent Analysis", 4);
      setConceptImages(imgs);
    } finally { setIsGeneratingImages(false); }
  };

  const handleSyncNarrator = async () => {
    const translatedText = await handleTranslate(targetLang);
    const textToUse = translatedText || (summaryLevel === SummaryLevel.SHORT ? result.shortSummary : summaryLevel === SummaryLevel.MEDIUM ? result.mediumSummary : result.longSummary);
    const type = summaryLevel === SummaryLevel.SHORT ? 'short' : 
                 summaryLevel === SummaryLevel.MEDIUM ? 'medium' : 'long';
    onGenerateAudio(textToUse, type, selectedVoice, true);
    setIsPlaying(true);
  };

  const handleGenerateQuiz = async () => {
    if (isGeneratingQuiz) return;
    setIsGeneratingQuiz(true);
    try {
      const questions = await generateQuiz(result.extractedText);
      setQuiz(questions);
    } finally { setIsGeneratingQuiz(false); }
  };

  const tracks: PlaylistTrack[] = [
    { id: 'short', title: 'Short', isGenerated: !!audioState.cache?.['short'] },
    { id: 'medium', title: 'Medium', isGenerated: !!audioState.cache?.['medium'] },
    { id: 'long', title: 'Long', isGenerated: !!audioState.cache?.['long'] },
  ];

  return (
    <div className="flex flex-col gap-6 pb-20 relative">
      <audio 
        ref={audioRef} 
        src={audioState.audioUrl || undefined} 
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} 
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} 
        onEnded={() => setIsPlaying(false)} 
      />

      {/* FULL SCREEN LIGHTBOXES */}
      {isRoadmapMaximized && (
        <div className="fixed inset-0 z-[250] bg-white dark:bg-slate-950 flex flex-col animate-in fade-in zoom-in-95">
           <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                 <Brain size={20} className="text-blue-600"/>
                 <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Neural Logic Roadmap</h2>
              </div>
              <button onClick={() => setIsRoadmapMaximized(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X size={24} /></button>
           </div>
           <div className="flex-1 overflow-auto p-4 flex items-center justify-center custom-scrollbar">
             <div ref={mermaidRef} className="mermaid w-full max-w-full transform scale-[2.2] origin-center">{result.diagramDefinition}</div>
           </div>
        </div>
      )}

      {maximizedImage && (
        <div className="fixed inset-0 z-[250] bg-black/95 flex flex-col items-center justify-center animate-in fade-in zoom-in-95" onClick={() => setMaximizedImage(null)}>
           <button onClick={() => setMaximizedImage(null)} className="absolute top-6 right-6 p-4 text-white hover:scale-110 transition-transform"><X size={32} /></button>
           <img src={maximizedImage} className="max-w-[90%] max-h-[90%] object-contain rounded-2xl shadow-2xl" alt="Asset" />
        </div>
      )}

      {/* 1. AUDIO PLAYER AT TOP */}
      {!isAudioFloating && (
        <div className="w-full animate-in slide-in-from-top-4 duration-500">
            <BlizzyAudioPlayer 
                audioUrl={audioState.audioUrl} currentType={audioState.currentType} isPlaying={isPlaying} 
                onPlayPause={() => setIsPlaying(!isPlaying)} currentTime={currentTime} duration={duration} 
                onSeek={(t) => { if(audioRef.current) audioRef.current.currentTime = t; }} 
                playbackRate={playbackRate} onSetPlaybackRate={setPlaybackRate} volume={volume} onVolumeChange={setVolume} 
                isLooping={isLooping} onToggleLoop={() => setIsLooping(!isLooping)} 
                tracks={tracks} onSelectTrack={(id) => onGenerateAudio(result[id === 'short' ? 'shortSummary' : id === 'medium' ? 'mediumSummary' : 'longSummary'], id as any, selectedVoice)} 
                isGenerating={audioState.isLoading}
                isFloating={isAudioFloating} onToggleFloat={() => setIsAudioFloating(!isAudioFloating)}
            />
        </div>
      )}

      {/* 2. VOICE & LANGUAGE SETTINGS BELOW PLAYER */}
      <div className="glass-panel bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
          <div className="flex-1 min-w-[200px] flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><Globe size={16} /></div>
              <div className="flex-1 relative">
                <select 
                    value={targetLang} 
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                >
                    {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
          </div>

          <div className="flex-1 min-w-[200px] flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg"><User size={16} /></div>
              <div className="flex-1 relative">
                <select 
                    value={selectedVoice} 
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none appearance-none cursor-pointer focus:border-purple-500 transition-colors"
                >
                    {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
          </div>

          <button 
            onClick={handleSyncNarrator}
            disabled={audioState.isLoading || isTranslating}
            className="px-8 py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg flex items-center gap-3 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {audioState.isLoading || isTranslating ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
            Let's Go
          </button>
      </div>

      {/* 3. SUMMARY TABS & MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit shadow-inner">
                  {[
                    { id: 'summary', label: 'Summary', icon: BookOpen },
                    { id: 'insights', label: 'Findings', icon: Brain },
                    { id: 'chat', label: 'AI Analyst', icon: MessageSquare },
                    { id: 'quiz', label: 'Test', icon: HelpCircle }
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                      <tab.icon size={14} /> {tab.label}
                    </button>
                  ))}
            </div>

            <div className="glass-panel bg-white dark:bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl relative min-h-[600px]">
              {activeTab === 'summary' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
                    <div className="flex gap-2">
                      {Object.values(SummaryLevel).map(level => (
                        <button key={level} onClick={() => { setSummaryLevel(level); setTranslatedContent(null); }} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${summaryLevel === level ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}>
                          {level}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-6 px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <div className="flex items-center gap-2">
                            <Hash size={12} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentWordCount} words</span>
                        </div>
                        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-6">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentReadTime} min read</span>
                        </div>
                    </div>
                  </div>

                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <div className="text-2xl leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap font-medium tracking-tight">
                      {isTranslating ? (
                        <div className="space-y-4 animate-pulse">
                          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-full"></div>
                          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-[95%]"></div>
                          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-[80%]"></div>
                        </div>
                      ) : currentSummaryText}
                    </div>
                  </div>

                  {/* AI VISUALS */}
                  <div className="pt-12 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-8">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg"><ImageIcon size={18} /></div>
                          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Conceptual Intelligence Visuals</h3>
                      </div>
                      {conceptImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {conceptImages.map((img, i) => (
                                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden cursor-zoom-in shadow-sm border-4 border-white dark:border-slate-800 hover:scale-[1.03] transition-all" onClick={() => setMaximizedImage(img)}>
                                    <img src={img} className="w-full h-full object-cover" alt="AI Logic" />
                                    <div className="absolute inset-0 bg-blue-600/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize2 size={24} className="text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>
                      ) : (
                        <div className="h-48 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                            {isGeneratingImages ? <Loader2 className="animate-spin text-slate-400" /> : <ImageIcon className="text-slate-300" />}
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processing Visual Media...</span>
                        </div>
                      )}
                  </div>

                  {/* LOGIC ROADMAP */}
                  {result.diagramDefinition && (
                    <div className="pt-12 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg"><Activity size={18} /></div>
                          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Logic Structural Roadmap</h3>
                        </div>
                        <button onClick={() => setIsRoadmapMaximized(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
                          <Maximize2 size={12} /> Expand Map
                        </button>
                      </div>
                      <div onClick={() => setIsRoadmapMaximized(true)} className="bg-slate-50 dark:bg-slate-800/50 p-12 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-inner flex justify-center items-center min-h-[450px] cursor-zoom-in relative group">
                        <div ref={mermaidRef} className="mermaid w-full transform scale-[1.5] transition-transform group-hover:scale-[1.6] duration-700">{result.diagramDefinition}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                  {result.insights.map((insight, idx) => (
                    <div key={idx} className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 hover:border-blue-400 transition-all flex flex-col group overflow-hidden shadow-sm">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-6 font-black text-base shadow-md group-hover:scale-110 transition-transform">{idx + 1}</div>
                      <p className="text-slate-900 dark:text-white font-black text-xl mb-4 tracking-tight leading-tight flex-1">{insight.point}</p>
                      <div className="p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-800">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Context</p>
                         <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">"{insight.reference}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="flex flex-col h-[650px] animate-in fade-in duration-500">
                   <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-800/20 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                    {chatHistory.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30 grayscale hover:grayscale-0 transition-all">
                         <MessageSquare size={40} className="text-blue-600 mb-4 animate-pulse"/>
                         <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase">Neural Analyst Chat</h3>
                         <p className="text-[10px] font-bold text-slate-500 max-w-xs uppercase tracking-widest">State your inquiry regarding the document core.</p>
                      </div>
                    )}
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[85%] p-5 rounded-[1.5rem] shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'}`}>
                          <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    {isAsking && <div className="flex justify-start"><div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center shadow-md"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></div><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-300"></div></div></div>}
                    <div ref={chatEndRef}></div>
                  </div>
                  <form onSubmit={async (e) => { e.preventDefault(); if(!chatInput.trim() || isAsking) return; const uM:ChatMessage={role:'user',text:chatInput,timestamp:Date.now()}; setChatHistory(p=>[...p,uM]); setChatInput(''); setIsAsking(true); try { const r=await askDocument(result.extractedText,chatHistory,chatInput,false); setChatHistory(p=>[...p,{role:'ai',text:r,timestamp:Date.now()}]); } finally { setIsAsking(false); } }} className="relative">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Query technical document logic..." className="w-full p-4 pl-6 pr-20 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-500 outline-none transition-all dark:text-white font-bold text-base shadow-md" />
                    <button type="submit" disabled={isAsking || !chatInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl shadow-md active:scale-95 disabled:opacity-50"><Send size={18} /></button>
                  </form>
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="animate-in fade-in duration-500">
                  {quiz.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <HelpCircle size={56} className="text-orange-600 mb-6 animate-bounce-slow"/>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">Retention Check</h3>
                      <p className="text-xs font-bold text-slate-500 mb-8 max-w-xs uppercase tracking-widest">Validate your neural grasp of the summarized content.</p>
                      <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz} className="px-8 py-3 bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg flex items-center gap-3 active:scale-95 disabled:opacity-50">{isGeneratingQuiz ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Initiate Audit</button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       {quiz.map((q, qIdx) => (
                         <div key={qIdx} className="p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                            <div className="font-black text-slate-900 dark:text-white text-xl flex gap-4"><span className="text-blue-600 opacity-20 font-mono">0{qIdx + 1}</span> {q.question}</div>
                            <div className="grid grid-cols-1 gap-3 mt-8">
                               {q.options.map((opt, oIdx) => {
                                 const isSelected = userAnswers[qIdx] === oIdx;
                                 const isCorrect = q.correctAnswerIndex === oIdx;
                                 let style = "bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 hover:border-blue-400";
                                 if (showQuizResults) { if (isCorrect) style = "bg-green-600 border-green-600 text-white scale-[1.01] shadow-md"; else if (isSelected) style = "bg-red-600 border-red-600 text-white"; else style = "opacity-40 grayscale"; } else if (isSelected) style = "bg-blue-600 border-blue-600 text-white scale-[1.01] shadow-md";
                                 return (<button key={oIdx} disabled={showQuizResults} onClick={() => setUserAnswers(prev => ({ ...prev, [qIdx]: oIdx }))} className={`p-5 rounded-[1.2rem] text-left text-base font-black transition-all ${style}`}>{opt}</button>);
                               })}
                            </div>
                         </div>
                       ))}
                       {!showQuizResults && <button onClick={() => setShowQuizResults(true)} disabled={Object.keys(userAnswers).length < quiz.length} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl shadow-xl disabled:opacity-50 hover:scale-[1.01] transition-all">Submit Neural Audit</button>}
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* SIDEBAR COMMAND PANEL */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="p-8 bg-slate-900 dark:bg-black rounded-[2.5rem] text-white space-y-6 shadow-2xl border border-white/5 relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
               <div className="relative z-10">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-6">Neural Hub Commands</h3>
                   <div className="space-y-4">
                       <button onClick={() => window.print()} className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><FileText size={18} /></div>
                            <span className="text-[11px] font-black uppercase tracking-widest">Generate Strategic PDF</span>
                          </div>
                          <Download size={16} className="text-white/20" />
                       </button>

                       <button onClick={onReset} className="w-full flex items-center justify-between p-5 bg-red-500/5 rounded-2xl hover:bg-red-500/20 transition-all border border-red-500/10 group/btn">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-xl text-red-400 group-hover/btn:scale-110 transition-transform"><Trash2 size={18} /></div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-red-400">Purge Workspace</span>
                          </div>
                       </button>
                   </div>
               </div>
            </div>

            <div className="glass-panel bg-white/50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-amber-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Workspace Health</h4>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400">Analysis Depth</span>
                        <span className="text-blue-600">Advanced 2.5</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400">Language Link</span>
                        <span className="text-green-600">Active - {SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* DETACHED / FLOATING PLAYER */}
      {isAudioFloating && audioState.audioUrl && (
          <div className="fixed bottom-8 right-8 z-[200] w-full max-w-sm animate-in slide-in-from-bottom-8">
               <div className="relative glass-panel bg-white/95 dark:bg-slate-900/95 p-1 rounded-[2.5rem] shadow-2xl border-2 border-blue-500/30 overflow-hidden backdrop-blur-xl ring-8 ring-blue-500/5">
                    <BlizzyAudioPlayer 
                       audioUrl={audioState.audioUrl} currentType={audioState.currentType} isPlaying={isPlaying} 
                       onPlayPause={() => setIsPlaying(!isPlaying)} currentTime={currentTime} duration={duration} 
                       onSeek={(t) => { if(audioRef.current) audioRef.current.currentTime = t; }} 
                       playbackRate={playbackRate} onSetPlaybackRate={setPlaybackRate} volume={volume} onVolumeChange={setVolume} 
                       isLooping={isLooping} onToggleLoop={() => setIsLooping(!isLooping)} 
                       tracks={tracks} onSelectTrack={(id) => onGenerateAudio(result[id === 'short' ? 'shortSummary' : id === 'medium' ? 'mediumSummary' : 'longSummary'], id as any, selectedVoice)} 
                       isGenerating={audioState.isLoading}
                       isFloating={isAudioFloating} onToggleFloat={() => setIsAudioFloating(!isAudioFloating)}
                    />
               </div>
          </div>
      )}
    </div>
  );
};

export default ResultsView;