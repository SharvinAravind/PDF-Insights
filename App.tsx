import React, { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import PipelineStatus from './components/PipelineStatus';
import ResultsView from './components/ResultsView';
import MatrixBackground from './components/MatrixBackground';
import SettingsModal from './components/SettingsModal';
import UpgradeModal from './components/UpgradeModal';
import Sidebar from './components/Sidebar';
import AuthPage from './components/AuthPage';
import HistoryCarousel from './components/HistoryCarousel';
import LiveSessionModal from './components/LiveSessionModal';
import { ProcessingState, AnalysisResult, AudioState, UserProfile, HistoryItem, MultiFileProgress, Theme, AudioPlayerTheme, FontTheme } from './types';
import { fileToBase64, getFileMimeType, isOfficeFile, extractTextFromOfficeFile, extractTextFromPDF, blobToBase64 } from './services/fileHelpers';
import { analyzeDocument, generateAudio } from './services/geminiService';
import { BrainCircuit, Home, Sparkles, UserCircle, LogOut, Clock, FileText, AlertTriangle, Mic, Zap } from 'lucide-react';

function App() {
  // --- State Management ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [isFastMode, setIsFastMode] = useState(false);
  const [isLiveSessionOpen, setIsLiveSessionOpen] = useState(false);
  
  // Results Management for Multi-File
  const [multiAnalysisResults, setMultiAnalysisResults] = useState<AnalysisResult[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState<number>(0);
  const [multiFileProgress, setMultiFileProgress] = useState<MultiFileProgress | undefined>(undefined);

  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Audio State
  const [audioState, setAudioState] = useState<AudioState>({
    isLoading: false,
    audioUrl: null,
    currentType: null,
    cache: {}
  });

  // User & Settings State
  const [user, setUser] = useState<UserProfile>({
      name: '',
      email: '',
      plan: 'free',
      creditsUsed: 0,
      creditsLimit: 5,
      history: []
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<Theme>('light');
  const [fontTheme, setFontTheme] = useState<FontTheme>('sans');
  const [customColor, setCustomColor] = useState('#3b82f6');
  const [audioPlayerTheme, setAudioPlayerTheme] = useState<AudioPlayerTheme>('classic');

  // --- Effects ---

  // Check Local Storage for Session
  useEffect(() => {
    const savedUser = localStorage.getItem('documind_current_user');
    if (savedUser) {
        try {
            setUser(JSON.parse(savedUser));
            setIsAuthenticated(true);
        } catch (e) {
            console.error("Failed to restore user session, clearing corrupted data", e);
            localStorage.removeItem('documind_current_user');
        }
    }
    
    // Check Theme
    const savedTheme = localStorage.getItem('documind_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);
    const savedColor = localStorage.getItem('documind_custom_color');
    if (savedColor) setCustomColor(savedColor);
    const savedFont = localStorage.getItem('documind_font_theme') as FontTheme;
    if (savedFont) setFontTheme(savedFont);

    // Check Audio Theme
    const savedAudioTheme = localStorage.getItem('documind_audio_theme') as AudioPlayerTheme;
    if (savedAudioTheme) setAudioPlayerTheme(savedAudioTheme);
  }, []);

  // Persist User Session
  useEffect(() => {
    if (isAuthenticated) {
        localStorage.setItem('documind_current_user', JSON.stringify(user));
    }
  }, [user, isAuthenticated]);
  
  // Apply Theme
  useEffect(() => {
      document.documentElement.className = '';
      document.body.className = '';
      
      // Basic Dark Mode
      if (theme === 'dark' || theme === 'midnight' || theme === 'amoled' || theme === 'gradient') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
      
      // Premium Class injection
      if (theme !== 'light' && theme !== 'dark') {
          document.body.classList.add(`theme-${theme}`);
      }

      // Font Theme Injection
      document.body.classList.add(`font-theme-${fontTheme}`);
      
      // Custom Color Injection
      if (theme === 'custom') {
          document.documentElement.style.setProperty('--primary-color', customColor);
          document.body.classList.add('theme-custom');
      } else {
          document.documentElement.style.removeProperty('--primary-color');
      }
      
      localStorage.setItem('documind_theme', theme);
      localStorage.setItem('documind_custom_color', customColor);
      localStorage.setItem('documind_font_theme', fontTheme);
      
  }, [theme, customColor, fontTheme]);

  // Persist Audio Theme
  useEffect(() => {
      localStorage.setItem('documind_audio_theme', audioPlayerTheme);
  }, [audioPlayerTheme]);

  // Toast Timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // --- Handlers ---

  const handleLogin = (loggedInUser: UserProfile) => {
      setUser(loggedInUser);
      setIsAuthenticated(true);
  };

  const handleLogout = () => {
      localStorage.removeItem('documind_current_user');
      setIsAuthenticated(false);
      resetApp();
      setUser({ name: '', email: '', plan: 'free', creditsUsed: 0, creditsLimit: 5, history: [] });
  };

  const handleUpgrade = () => {
    setUser(prev => ({
      ...prev,
      plan: 'premium',
      creditsLimit: Infinity
    }));
    setShowUpgrade(false);
    alert("Welcome to Premium! Limits removed.");
  };

  const checkLimits = (): boolean => {
    if (user.plan === 'free' && user.creditsUsed >= user.creditsLimit) {
      setShowUpgrade(true);
      return false;
    }
    return true;
  };

  // Helper to process a single file
  const analyzeSingleFile = async (file: File): Promise<AnalysisResult> => {
      let base64Data = '';
      let mimeType = '';
      let extractedRawText = '';
      
      const textFormats = ['text/html', 'text/plain', 'text/markdown', 'text/csv', 'application/json'];
      const fileMime = getFileMimeType(file);

      // HYBRID PDF STRATEGY
      if (fileMime === 'application/pdf') {
          let pdfText = '';
          try {
             pdfText = await extractTextFromPDF(file);
             extractedRawText = pdfText.trim();
          } catch (e) {
             console.warn("PDF Extraction failed, falling back to binary", e);
          }

          if (extractedRawText && extractedRawText.length > 50) { // Threshold to catch actual text content
             base64Data = window.btoa(unescape(encodeURIComponent(extractedRawText)));
             mimeType = 'text/plain';
          } else {
             // Binary Fallback - Increased Limit
             if (file.size > 99 * 1024 * 1024) { // 100MB limit
                 throw new Error("Scanned PDF is too large (>100MB). Please compress it.");
             }
             base64Data = await fileToBase64(file);
             mimeType = 'application/pdf';
          }
      }
      else if (isOfficeFile(file)) {
          extractedRawText = await extractTextFromOfficeFile(file);
          base64Data = window.btoa(unescape(encodeURIComponent(extractedRawText)));
          mimeType = 'text/plain';
      }
      else if (textFormats.includes(fileMime)) {
          extractedRawText = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(new Error("Failed to read text file"));
                reader.readAsText(file);
          });
          base64Data = window.btoa(unescape(encodeURIComponent(extractedRawText)));
          mimeType = 'text/plain'; 
      } else {
          // Images
          if (file.size > 99 * 1024 * 1024) { // 100MB limit
              throw new Error("Image is too large (>100MB).");
          }
          base64Data = await fileToBase64(file);
          mimeType = fileMime;
      }
      
      // Pass fast mode param
      const result = await analyzeDocument(base64Data, mimeType, user.plan === 'premium', isFastMode);
      
      // Improve accuracy: If we have client-side text, use it for word count
      const safeText = extractedRawText || "";
      if (safeText.length > 0) {
          // Use a robust regex to split by whitespace and filter out empty strings for accurate count
          result.wordCount = safeText.trim().split(/[\s\n\r]+/).filter(w => w.length > 0).length;
          result.readingTimeMinutes = Math.ceil(result.wordCount / 200);
      }

      result.fileName = file.name;
      result.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return result;
  };

  const handleFilesProcessing = async (files: File[]) => {
    if (!checkLimits()) return;

    try {
      setError(null);
      setMultiAnalysisResults([]);
      setActiveResultIndex(0);
      
      const resultsAccumulator: AnalysisResult[] = [];
      const newHistoryItems: HistoryItem[] = [];

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          setMultiFileProgress({
              currentFileIndex: i,
              totalFiles: files.length,
              currentFileName: file.name
          });

          setProcessingState(ProcessingState.READING_FILE);
          await new Promise(r => setTimeout(r, 800)); 

          setProcessingState(ProcessingState.EXTRACTING);
          const result = await analyzeSingleFile(file);
          
          setProcessingState(ProcessingState.SUMMARIZING);
          await new Promise(r => setTimeout(r, 500));

          resultsAccumulator.push(result);

          const newHistoryId = result.id || `${Date.now()}-${i}`;
          newHistoryItems.push({
            id: newHistoryId,
            fileName: file.name,
            date: Date.now(),
            summarySnippet: result.shortSummary.slice(0, 100) + '...',
            result: result,
            isFavorite: false
          });
      }

      setMultiAnalysisResults(resultsAccumulator);
      setCurrentHistoryId(newHistoryItems[0].id);

      setUser(prev => {
        const newHistory = prev.plan === 'premium' 
            ? [...newHistoryItems, ...prev.history] 
            : [...newHistoryItems, ...prev.history].slice(0, 50);
        return {
          ...prev,
          creditsUsed: prev.creditsUsed + files.length,
          history: newHistory
        };
      });

      setProcessingState(ProcessingState.COMPLETED);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while processing the document.");
      setProcessingState(ProcessingState.ERROR);
    }
  };

  const handleAudioGeneration = async (text: string, type: 'short' | 'medium' | 'long', voice: string, forceRegenerate: boolean = false) => {
    if (!text) return;
    
    // Check Cache First (unless forced)
    if (!forceRegenerate && audioState.cache && audioState.cache[type]) {
      setAudioState(prev => ({
        ...prev,
        isLoading: false,
        audioUrl: prev.cache![type],
        currentType: type
      }));
      return;
    }

    setAudioState(prev => ({ ...prev, isLoading: true }));
    try {
      const url = await generateAudio(text, voice);
      
      // Update state AND cache
      setAudioState(prev => ({
        isLoading: false,
        audioUrl: url,
        currentType: type,
        cache: {
            ...(prev.cache || {}), // Safe spread in case cache is undefined
            [type]: url // Store this specific generation
        }
      }));
      
      if (currentHistoryId && url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const base64Audio = await blobToBase64(blob);

            setUser(prev => ({
                ...prev,
                history: prev.history.map(item => {
                    if (item.id === currentHistoryId) {
                        return {
                            ...item,
                            savedAudio: base64Audio,
                            savedAudioType: type
                        };
                    }
                    return item;
                })
            }));
        } catch (storageError) {
            console.warn("Failed to save audio to history", storageError);
            // Non-critical error, don't alert user
        }
      }

    } catch (err: any) {
      console.error(err);
      setAudioState(prev => ({ ...prev, isLoading: false }));
      // Use toast for error
      setToastMessage(err.message || "Failed to generate audio.");
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setMultiAnalysisResults([item.result]);
    setActiveResultIndex(0);
    setCurrentHistoryId(item.id);
    
    if (item.savedAudio) {
        try {
            const byteCharacters = atob(item.savedAudio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            
            const type = (item.savedAudioType as 'short' | 'medium' | 'long') || 'short';
            
            setAudioState({
                isLoading: false,
                audioUrl: url,
                currentType: type,
                cache: { [type]: url } // Initialize cache with saved audio
            });
        } catch (e) {
            console.error("Failed to restore saved audio", e);
            setAudioState({ isLoading: false, audioUrl: null, currentType: null, cache: {} });
        }
    } else {
        setAudioState({ isLoading: false, audioUrl: null, currentType: null, cache: {} });
    }

    setProcessingState(ProcessingState.COMPLETED);
    setShowSidebar(false);
  };

  const handleToggleFavorite = (id: string) => {
      setUser(prev => ({
          ...prev,
          history: prev.history.map(item => 
              item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          )
      }));
  };
  
  const handleToggleTheme = (newTheme: Theme) => {
      setTheme(newTheme);
  };

  const resetApp = () => {
    setProcessingState(ProcessingState.IDLE);
    setMultiAnalysisResults([]);
    setActiveResultIndex(0);
    setCurrentHistoryId(null);
    setAudioState({ isLoading: false, audioUrl: null, currentType: null, cache: {} });
    setError(null);
  };

  if (!isAuthenticated) {
      return (
          <>
             <AuthPage onLogin={handleLogin} />
          </>
      );
  }

  const isCurrentFavorite = user.history.find(h => h.id === currentHistoryId)?.isFavorite || false;
  const activeAnalysis = multiAnalysisResults[activeResultIndex];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500 bg-[#f8fafc] text-slate-900 dark:bg-slate-950 dark:text-white">
      
      {/* Background Ambience */}
      <div className="fixed top-[-10%] right-[-5%] w-96 h-96 bg-purple-200 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none"></div>

      {toastMessage && (
        <div className="fixed top-24 right-6 z-[60] animate-in slide-in-from-right fade-in bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 shadow-xl rounded-xl p-4 flex items-start gap-3 max-w-sm">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">Attention</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{toastMessage}</p>
            </div>
        </div>
      )}

      {(processingState === ProcessingState.EXTRACTING || processingState === ProcessingState.SUMMARIZING) && (
        <MatrixBackground />
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-50 transition-all duration-300 border-b border-white/40 dark:border-slate-800 glass-panel bg-white/70 dark:bg-slate-900/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div onClick={resetApp} className="flex items-center gap-3 cursor-pointer group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300 theme-custom:bg-blue-600">
                  <BrainCircuit size={24} />
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                      Deep Insights
                  </span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
             <button onClick={resetApp} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-blue-600 transition-all active:scale-95">
                <Home size={18} /><span>Home</span>
             </button>

             <button onClick={() => setShowSidebar(true)} className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-blue-600 transition-all active:scale-95">
                <Clock size={18} /><span className="hidden md:inline">History</span>
             </button>

             <div className="flex items-center gap-2">
                 <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:shadow-md transition-all">
                    <div className={`w-2 h-2 rounded-full ${user.plan === 'premium' ? 'bg-amber-400' : 'bg-green-400'}`}></div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
                    <UserCircle size={18} className="text-slate-400"/>
                 </button>
                 <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Log Out">
                     <LogOut size={18} />
                 </button>
             </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full relative z-10">
        
        {processingState === ProcessingState.IDLE && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-10 max-w-3xl mx-auto mt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-semibold mb-6 border border-blue-100 dark:border-blue-800 shadow-sm">
                <Sparkles size={16} />
                <span>Ready to analyze</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
                Hello, <span className="text-blue-600 dark:text-blue-400">{user.name.split(' ')[0]}</span>. <br />
                <span className="text-slate-500 dark:text-slate-400 text-3xl md:text-5xl">What are we learning today?</span>
              </h1>
            </div>
            
            {user.history.length > 0 && (
                <HistoryCarousel history={user.history} onSelect={handleHistorySelect} />
            )}

            <div className="w-full max-w-4xl mx-auto mb-4 flex justify-end">
                <button 
                  onClick={() => setIsFastMode(!isFastMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${isFastMode ? 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                >
                    <Zap size={16} className={isFastMode ? 'fill-current' : ''} />
                    Fast Mode (Lite) {isFastMode ? 'ON' : 'OFF'}
                </button>
            </div>

            <UploadZone 
                onFilesSelect={handleFilesProcessing} 
                onHtmlPaste={(html) => console.log(html)} 
                userPlan={user.plan}
                onUpgrade={() => setShowUpgrade(true)}
            />
            
            {/* Mobile Go Live Button */}
            <div className="mt-8 md:hidden">
                 <button 
                    onClick={() => setIsLiveSessionOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full font-bold shadow-lg shadow-red-500/30 w-full justify-center"
                 >
                    <Mic size={20} />
                    Start Live Voice Session
                 </button>
            </div>
          </div>
        )}

        {(processingState !== ProcessingState.IDLE && processingState !== ProcessingState.COMPLETED && processingState !== ProcessingState.ERROR) && (
          <div className="flex-1 flex items-center justify-center w-full relative">
            <PipelineStatus state={processingState} multiProgress={multiFileProgress} />
          </div>
        )}

        {processingState === ProcessingState.ERROR && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl text-center max-w-md border border-red-100 dark:border-red-900 shadow-2xl shadow-red-100/50">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400">
                <BrainCircuit size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8">{error}</p>
              <button onClick={resetApp} className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all">Try Again</button>
            </div>
          </div>
        )}

        {processingState === ProcessingState.COMPLETED && activeAnalysis && (
          <div className="space-y-6">
              
              {multiAnalysisResults.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                      {multiAnalysisResults.map((res, index) => (
                          <button
                              key={index}
                              onClick={() => { setActiveResultIndex(index); setAudioState({isLoading:false, audioUrl:null, currentType:null, cache:{}}); }}
                              className={`
                                flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap
                                ${activeResultIndex === index 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                    : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'}
                              `}
                          >
                              <FileText size={16} />
                              {res.fileName || `Document ${index + 1}`}
                          </button>
                      ))}
                  </div>
              )}

              <ResultsView 
                key={`${activeResultIndex}-${activeAnalysis.fileName}`}
                result={activeAnalysis} 
                onGenerateAudio={handleAudioGeneration}
                audioState={audioState}
                onReset={resetApp}
                userPlan={user.plan}
                onUpgrade={() => setShowUpgrade(true)}
                isFavorite={isCurrentFavorite}
                onToggleFavorite={() => currentHistoryId && handleToggleFavorite(currentHistoryId)}
                audioPlayerTheme={audioPlayerTheme}
              />
          </div>
        )}
      </main>

      <Sidebar 
        isOpen={showSidebar} 
        onClose={() => setShowSidebar(false)} 
        user={user}
        onSelectHistory={handleHistorySelect}
        onUpgrade={() => { setShowSidebar(false); setShowUpgrade(true); }}
      />

      <SettingsModal 
         isOpen={showSettings} 
         onClose={() => setShowSettings(false)}
         user={user}
         onUpgrade={() => { setShowSettings(false); setShowUpgrade(true); }}
         theme={theme}
         onToggleTheme={handleToggleTheme}
         customColor={customColor}
         onCustomColorChange={setCustomColor}
         audioPlayerTheme={audioPlayerTheme}
         onAudioPlayerThemeChange={setAudioPlayerTheme}
         fontTheme={fontTheme}
         onFontThemeChange={setFontTheme}
      />

      <UpgradeModal 
         isOpen={showUpgrade}
         onClose={() => setShowUpgrade(false)}
         onConfirm={handleUpgrade}
      />

      <LiveSessionModal 
         isOpen={isLiveSessionOpen}
         onClose={() => setIsLiveSessionOpen(false)}
         userName={user.name}
      />
    </div>
  );
}

export default App;
