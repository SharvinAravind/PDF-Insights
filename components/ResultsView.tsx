import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, SummaryLevel, AudioState, SUPPORTED_LANGUAGES, VOICE_OPTIONS, PlanType, ChatMessage, QuizQuestion, AudioPlayerTheme } from '../types';
import { translateText, generateConceptImages, askDocument, generateQuiz, transcribeAudio } from '../services/geminiService';
import { blobToBase64 } from '../services/fileHelpers';
import BlizzyAudioPlayer, { PlaylistTrack } from './BlizzyAudioPlayer';
import { Play, Pause, Download, Lightbulb, FileText, RefreshCw, Loader2, Globe, Mic, ChevronDown, ChevronUp, Zap, Image as ImageIcon, Sparkles, Lock, GitGraph, Timer, Maximize2, X, Share2, FileType, Camera, Heart, Settings2, MessageCircle, Send, Bot, BrainCircuit, SkipBack, SkipForward, Gem, ArrowRight, ListMusic, FileJson, FileType2, LogOut, FileImage, MicOff, Brain } from 'lucide-react';

declare global {
  interface Window {
    mermaid: any;
    html2canvas: any;
    jspdf: any;
    MediaMetadata: any; 
  }
}

interface ResultsViewProps {
  result: AnalysisResult;
  onGenerateAudio: (text: string, type: 'short' | 'medium' | 'long', voice: string, forceRegenerate?: boolean) => Promise<void>;
  audioState: AudioState;
  onReset: () => void;
  userPlan: PlanType;
  onUpgrade: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  audioPlayerTheme?: AudioPlayerTheme;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, onGenerateAudio, audioState, onReset, userPlan, onUpgrade, isFavorite, onToggleFavorite, audioPlayerTheme = 'classic' }) => {
  const [activeTab, setActiveTab] = useState<SummaryLevel | 'ask' | 'quiz' | 'keylights'> (SummaryLevel.SHORT);
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoGenRan = useRef(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const keepAliveRef = useRef<number | null>(null);
  
  // Customization Configuration
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [selectedVoiceKey, setSelectedVoiceKey] = useState<string>('voice1'); 
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Dropdown States
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  
  // Refs for click outside
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const voiceMenuRef = useRef<HTMLDivElement>(null);
  
  // Applied States
  const [appliedLanguage, setAppliedLanguage] = useState<string>('English');
  const [isProcessingCustom, setIsProcessingCustom] = useState(false);
  
  // Content Caches
  const [translatedContent, setTranslatedContent] = useState<Record<string, string>>({});
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // UI State
  const [isSourceTextOpen, setIsSourceTextOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const exportMermaidRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
              setShowExportMenu(false);
          }
          if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
              setIsLanguageOpen(false);
          }
          if (voiceMenuRef.current && !voiceMenuRef.current.contains(event.target as Node)) {
              setIsVoiceOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
          document.removeEventListener("mousedown", handleClickOutside);
      };
  }, []);

  // Premium "Active All Time" Keep-Alive
  useEffect(() => {
    if (userPlan === 'premium') {
        keepAliveRef.current = window.setInterval(() => {
            const t = Date.now();
        }, 10000);
    }
    return () => {
        if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    }
  }, [userPlan]);

  // Initialize Mermaid
  useEffect(() => {
    if (result.diagramDefinition && window.mermaid) {
        window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
        
        // Main view
        setTimeout(() => {
            if (mermaidRef.current) {
                try {
                    mermaidRef.current.innerHTML = result.diagramDefinition || '';
                    window.mermaid.run({ nodes: [mermaidRef.current] });
                } catch (e) {
                    console.error("Mermaid Render Error", e);
                }
            }
            // Hidden export view
            if (exportMermaidRef.current) {
                try {
                    exportMermaidRef.current.innerHTML = result.diagramDefinition || '';
                    window.mermaid.run({ nodes: [exportMermaidRef.current] });
                } catch (e) {}
            }
        }, 800);
    }
  }, [result.diagramDefinition]);

  // Premium Auto-Generate Image
  useEffect(() => {
    if (userPlan === 'premium' && generatedImages.length === 0 && !isGeneratingImage) {
        setIsGeneratingImage(true);
        generateConceptImages(result.shortSummary || "Document Summary", 4)
            .then(imgs => {
                if(imgs.length > 0) setGeneratedImages(imgs);
            })
            .catch(e => console.warn("Auto image gen failed", e))
            .finally(() => setIsGeneratingImage(false));
    }
  }, [userPlan, result.shortSummary]);

  // --- AUDIO PLAYER REFACTOR (ROBUSTNESS + SMOOTH TRANSITIONS) ---

  useEffect(() => {
      if (!audioState.audioUrl) return;

      const audio = new Audio(audioState.audioUrl);
      audioRef.current = audio;

      // Start silent to allow for fade-in effect
      audio.volume = 0;
      audio.playbackRate = playbackRate;
      audio.loop = isLooping;

      const onTimeUpdate = () => {
          if (audio && Number.isFinite(audio.currentTime)) {
              setCurrentTime(audio.currentTime);
          }
      };

      const onEnded = () => {
          if (!isLooping) setIsPlaying(false);
      };

      const onLoadedMetadata = () => {
          if (audio && Number.isFinite(audio.duration)) {
              setDuration(audio.duration);
          }
      };

      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
          playPromise
            .then(() => {
                setIsPlaying(true);
                
                // Smooth Fade In Logic (Linear ramp over 500ms)
                if (volume > 0) {
                    let currentVol = 0;
                    const fadeDuration = 500;
                    const stepTime = 50; 
                    const stepVol = volume / (fadeDuration / stepTime);
                    
                    const fadeInterval = setInterval(() => {
                        // Safety check if audio ref still exists and matches this instance
                        if (!audioRef.current || audioRef.current !== audio) {
                            clearInterval(fadeInterval);
                            return;
                        }
                        
                        currentVol = Math.min(volume, currentVol + stepVol);
                        audio.volume = currentVol;
                        
                        if (currentVol >= volume) {
                            clearInterval(fadeInterval);
                            audio.volume = volume; // Ensure final target is met
                        }
                    }, stepTime);
                } else {
                    audio.volume = 0;
                }
            })
            .catch(e => {
                console.warn("Autoplay blocked or failed", e);
                setIsPlaying(false);
            });
      }

      try {
        if ('mediaSession' in navigator) {
            const MediaMetadataConstructor = window.MediaMetadata || (window as any).MediaMetadata;
            if (MediaMetadataConstructor) {
                navigator.mediaSession.metadata = new MediaMetadataConstructor({
                    title: `${audioState.currentType ? (audioState.currentType.charAt(0).toUpperCase() + audioState.currentType.slice(1)) : 'Document'} Summary`,
                    artist: 'Deep Insights AI',
                    album: result.fileName || 'Analysis Result',
                    artwork: [] 
                });

                navigator.mediaSession.setActionHandler('play', () => { 
                    audio.play().catch(console.warn); 
                    setIsPlaying(true); 
                });
                navigator.mediaSession.setActionHandler('pause', () => { 
                    audio.pause(); 
                    setIsPlaying(false); 
                });
                navigator.mediaSession.setActionHandler('previoustrack', handlePrevTrack);
                navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
            }
        }
      } catch (e) {
         console.warn("Media Session API failed", e);
      }

      return () => {
          audio.pause();
          audio.removeEventListener('timeupdate', onTimeUpdate);
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('loadedmetadata', onLoadedMetadata);
          audioRef.current = null;
          setIsPlaying(false);
      };

  }, [audioState.audioUrl, audioState.currentType]); 

  // Volume update listener - only affects active audio after fade-in
  useEffect(() => {
      if (audioRef.current) {
          // If playing and duration > 1s, apply volume instantly (assuming fade in finished)
          if (audioRef.current.currentTime > 0.6) {
             audioRef.current.volume = volume;
          }
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.loop = isLooping;
      }
  }, [volume, playbackRate, isLooping]);

  useEffect(() => {
      if (autoGenRan.current) return; 
      autoGenRan.current = true;

      const autoGenerateAll = async () => {
          setIsGeneratingAll(true);
          const types: ('short' | 'medium' | 'long')[] = ['short', 'medium', 'long'];
          const voice = VOICE_OPTIONS.find(v => v.key === selectedVoiceKey)?.id || 'Kore';

          for (const type of types) {
              if (audioState.cache && audioState.cache[type]) continue;
              
              let text = type === 'short' ? result.shortSummary : type === 'medium' ? result.mediumSummary : result.longSummary;
              if (appliedLanguage !== 'English' && translatedContent[type]) {
                  text = translatedContent[type];
              }

              if (text && text.length > 5) {
                 try {
                    await onGenerateAudio(text, type, voice);
                    await new Promise(r => setTimeout(r, 800));
                 } catch (e) {
                    console.error(`Auto-gen failed for ${type}`, e);
                 }
              }
          }
          setIsGeneratingAll(false);
      };
      
      const timer = setTimeout(autoGenerateAll, 1000);
      return () => clearTimeout(timer);
  }, [result, appliedLanguage, translatedContent]);


  const handlePlayPause = () => {
      if (audioRef.current) {
          if (isPlaying) {
              audioRef.current.pause();
              setIsPlaying(false);
          } else {
              audioRef.current.play().catch(console.error);
              setIsPlaying(true);
          }
      }
  };

  const handleSeek = (time: number) => {
      if (audioRef.current && Number.isFinite(time)) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const handleTrackSelect = async (trackId: string) => {
      // 1. Determine active content
      const type = trackId as 'short' | 'medium' | 'long';
      let textToRead = type === 'short' ? result.shortSummary : type === 'medium' ? result.mediumSummary : result.longSummary;
      
      if (appliedLanguage !== 'English' && translatedContent[type]) {
          textToRead = translatedContent[type];
      }
      
      if (!textToRead || textToRead.length < 5) return;

      // 2. Stop current immediately
      if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
      }

      // 3. Generate & Play
      const voice = VOICE_OPTIONS.find(v => v.key === selectedVoiceKey)?.id || 'Kore';
      try {
        await onGenerateAudio(textToRead, type, voice); 
      } catch (e) {
        console.error("Track select failed", e);
      }
  };
  
  const handleNextTrack = () => {
      if (audioState.currentType === 'short') handleTrackSelect('medium');
      else if (audioState.currentType === 'medium') handleTrackSelect('long');
      else if (audioState.currentType === 'long') handleTrackSelect('short');
  };

  const handlePrevTrack = () => {
      if (audioState.currentType === 'short') handleTrackSelect('long');
      else if (audioState.currentType === 'medium') handleTrackSelect('short');
      else if (audioState.currentType === 'long') handleTrackSelect('medium');
  };

  const handleGenerateAllAudio = async () => {
      setIsGeneratingAll(true);
      try {
          const types: ('short' | 'medium' | 'long')[] = ['short', 'medium', 'long'];
          const voice = VOICE_OPTIONS.find(v => v.key === selectedVoiceKey)?.id || 'Kore';

          for (const type of types) {
              let text = type === 'short' ? result.shortSummary : type === 'medium' ? result.mediumSummary : result.longSummary;
              if (appliedLanguage !== 'English' && translatedContent[type]) {
                  text = translatedContent[type];
              }
              
              if (text && text.length > 5) {
                 await onGenerateAudio(text, type, voice, true);
                 await new Promise(r => setTimeout(r, 1000));
              }
          }
      } catch (e) {
          console.error("Generate all failed", e);
      } finally {
          setIsGeneratingAll(false);
      }
  };

  const handleApplySettings = async () => {
      setIsProcessingCustom(true);
      
      try {
          const voice = VOICE_OPTIONS.find(v => v.key === selectedVoiceKey)?.id || 'Kore';
          
          let newShort = result.shortSummary || "";
          let newMedium = result.mediumSummary || "";
          let newLong = result.longSummary || "";

          // 1. Translate if necessary
          if (selectedLanguage !== 'English') {
              const [tShort, tMedium, tLong] = await Promise.all([
                  translateText(newShort, selectedLanguage),
                  translateText(newMedium, selectedLanguage),
                  translateText(newLong, selectedLanguage)
              ]);
              
              setTranslatedContent({
                  short: tShort,
                  medium: tMedium,
                  long: tLong
              });
              
              newShort = tShort;
              newMedium = tMedium;
              newLong = tLong;
          } else {
              setTranslatedContent({});
          }
          
          setAppliedLanguage(selectedLanguage);

          // 2. Determine what active tab to play immediately
          const activeType = (['short', 'medium', 'long'].includes(activeTab.toLowerCase()) 
                            ? activeTab.toLowerCase() 
                            : 'short') as 'short' | 'medium' | 'long';

          const textToPlay = activeType === 'short' ? newShort : activeType === 'medium' ? newMedium : newLong;

          // 3. Generate ACTIVE Audio IMMEDIATELY
          if (textToPlay && textToPlay.length > 5) {
              await onGenerateAudio(textToPlay, activeType, voice, true);
              setIsPlaying(true);
          }

          // 4. Trigger BACKGROUND Generation for other tabs
          (async () => {
              setIsGeneratingAll(true);
              try {
                  const types: ('short' | 'medium' | 'long')[] = ['short', 'medium', 'long'];
                  for (const type of types) {
                      if (type === activeType) continue;

                      const text = type === 'short' ? newShort : type === 'medium' ? newMedium : newLong;
                      if (text && text.length > 5) {
                          await new Promise(r => setTimeout(r, 800));
                          await onGenerateAudio(text, type, voice, true);
                      }
                  }
              } catch(e) {
                  console.warn("Background audio generation partial failure", e);
              } finally {
                  setIsGeneratingAll(false);
              }
          })();

      } catch (error) {
          console.error("Failed to apply settings", error);
      } finally {
          setIsProcessingCustom(false);
      }
  };

  // --- DOWNLOAD / EXPORT HANDLERS ---
  const downloadAsWord = async () => {
      setShowExportMenu(false);
      const originalElement = exportRef.current;
      if (!originalElement) return;

      // Force render mermaid to image if needed
      let mermaidReplacement = null;
      if (exportMermaidRef.current && result.diagramDefinition) {
          try {
              // Re-render Mermaid into the hidden div to ensure it's fresh
              exportMermaidRef.current.innerHTML = result.diagramDefinition;
              await window.mermaid.run({ nodes: [exportMermaidRef.current] });
              
              // Wait a tick for SVG render
              await new Promise(r => setTimeout(r, 100));
              
              // Capture high-res image
              const canvas = await window.html2canvas(exportMermaidRef.current, { backgroundColor: '#ffffff', scale: 2 });
              mermaidReplacement = canvas.toDataURL('image/png');
          } catch (e) { console.error("Mermaid conversion failed", e); }
      }

      // Clone content to manipulate without affecting DOM
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      // Inject Mermaid Image
      const mermaidContainer = clone.querySelector('.export-mermaid-container');
      if (mermaidContainer && mermaidReplacement) {
          mermaidContainer.innerHTML = `<img src="${mermaidReplacement}" style="width:100%; height:auto; display:block; margin: 20px auto;" />`;
      } else if (mermaidContainer) {
          // If no replacement, try to keep text or remove
          mermaidContainer.innerHTML = `<p style="color:gray; font-style:italic;">[Diagram could not be rendered for export]</p>`;
      }
      
      // Ensure all images fit page width in Word
      const images = clone.querySelectorAll('img');
      images.forEach(img => {
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
      });
      
      const content = clone.innerHTML;
      const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
      <meta charset='utf-8'>
      <title>Deep Insight Report</title>
      <style>
        @page { size: A4; margin: 1in; }
        body { font-family: 'Arial', sans-serif; color: #000000; line-height: 1.6; font-size: 11pt; }
        h1 { font-size: 24pt; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px; }
        h2 { font-size: 16pt; font-weight: bold; color: #2563EB; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; page-break-after: avoid; }
        h3 { font-size: 14pt; font-weight: bold; color: #374151; margin-top: 20px; margin-bottom: 10px; page-break-after: avoid; }
        p { margin-bottom: 12px; text-align: justify; widows: 3; orphans: 3; }
        .export-section { page-break-inside: avoid; break-inside: avoid; margin-bottom: 30px; }
        img { max-width: 100%; height: auto; display: block; margin: 20px auto; }
        ul, ol { margin-bottom: 15px; }
        li { margin-bottom: 5px; }
      </style>
      </head><body>`;
      const footer = "</body></html>";
      
      const sourceHTML = header + content + footer;
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `${result.fileName || 'document'}_full_report.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
  };

  const downloadAsPDF = async () => {
      setShowExportMenu(false);
      if (!window.jspdf) return;
      const element = exportRef.current;
      if (!element) return;
      
      try {
          // Prepare Mermaid for PDF (render explicitly if needed)
          if (exportMermaidRef.current && result.diagramDefinition) {
             exportMermaidRef.current.innerHTML = result.diagramDefinition;
             await window.mermaid.run({ nodes: [exportMermaidRef.current] });
             await new Promise(r => setTimeout(r, 100)); // Render wait
          }

          const pdf = new window.jspdf.jsPDF('p', 'pt', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth(); // ~595 pts
          const margin = 40; 
          const contentWidth = pdfWidth - (margin * 2);

          // We use the .html() method which is smarter about page breaks
          await pdf.html(element, {
              callback: function(doc) {
                  doc.save(`${result.fileName || 'document'}_report.pdf`);
              },
              x: margin,
              y: margin,
              width: contentWidth, 
              windowWidth: 800, 
              margin: [margin, margin, margin, margin],
              autoPaging: 'text', // Critical: tries to break at text lines
              html2canvas: {
                  scale: 3, // High resolution scaling
                  useCORS: true,
                  logging: false,
                  letterRendering: true,
                  allowTaint: true,
                  scrollY: 0
              }
          });
      } catch (e) {
          console.error("PDF Export failed", e);
          alert("Could not generate PDF. Please try downloading as Word.");
      }
  };

  const downloadAsImage = async () => {
      setShowExportMenu(false);
      if (!window.html2canvas) return;
      
      const element = exportRef.current;
      if (!element) return;
      
      try {
          const canvas = await window.html2canvas(element, { 
              scale: 2, 
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = imgData;
          link.download = `${result.fileName || 'document'}_report.png`;
          link.click();
      } catch (e) {
          console.error("Image Export failed", e);
      }
  };

  const downloadAsText = () => {
      setShowExportMenu(false);
      const text = exportRef.current?.innerText || "";
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${result.fileName || 'document'}_summary.txt`;
      link.click();
  };

  // ... (Chat, Mic, Quiz handlers remain unchanged) ...
  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!chatInput.trim()) return;
      
      const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
      setChatMessages(prev => [...prev, userMsg]);
      setChatInput('');
      setIsChatLoading(true);

      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      try {
        const responseText = await askDocument(result.extractedText || "", [...chatMessages, userMsg], userMsg.text, isThinkingMode);
        const aiMsg: ChatMessage = { role: 'ai', text: responseText, timestamp: Date.now() };
        setChatMessages(prev => [...prev, aiMsg]);
      } catch (err) {
        setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error.", timestamp: Date.now() }]);
      } finally {
        setIsChatLoading(false);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
  };

  const handleMicClick = async () => {
      if (isRecording) {
          try {
             if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                 mediaRecorderRef.current.stop();
             }
          } catch (e) {
             console.warn("Failed to stop media recorder", e);
          }
          setIsRecording(false);
      } else {
          try {
              if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                  throw new Error("Microphone not supported in this browser.");
              }
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mediaRecorder = new MediaRecorder(stream);
              const chunks: BlobPart[] = [];
              
              mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
              mediaRecorder.onstop = async () => {
                  const blob = new Blob(chunks, { type: 'audio/webm' });
                  try {
                    setIsChatLoading(true);
                    const base64 = await blobToBase64(blob);
                    const text = await transcribeAudio(base64, 'audio/webm');
                    setChatInput(text);
                  } catch (e) {
                    console.error("Transcription failed", e);
                    setChatMessages(prev => [...prev, { role: 'ai', text: "[System]: Audio transcription failed.", timestamp: Date.now() }]);
                  } finally {
                    setIsChatLoading(false);
                    stream.getTracks().forEach(track => track.stop());
                  }
              };

              mediaRecorder.start();
              setIsRecording(true);
              mediaRecorderRef.current = mediaRecorder;
          } catch (e: any) {
              console.error("Mic access denied", e);
              let msg = "Could not access microphone.";
              if (e.name === 'NotFoundError') msg = "No microphone found on this device.";
              if (e.name === 'NotAllowedError') msg = "Microphone permission denied.";
              
              setChatMessages(prev => [...prev, { role: 'ai', text: `[System]: ${msg}`, timestamp: Date.now() }]);
          }
      }
  };

  const handleGenerateQuiz = async () => {
      setIsQuizLoading(true);
      try {
          const questions = await generateQuiz(result.extractedText || "");
          setQuizQuestions(questions);
          setQuizAnswers({});
          setShowQuizResults(false);
      } catch (e) {
          console.error(e);
      } finally {
          setIsQuizLoading(false);
      }
  };
  
  const displayShort = (appliedLanguage !== 'English' && translatedContent.short) ? translatedContent.short : (result.shortSummary || "");
  const displayMedium = (appliedLanguage !== 'English' && translatedContent.medium) ? translatedContent.medium : (result.mediumSummary || "");
  const displayLong = (appliedLanguage !== 'English' && translatedContent.long) ? translatedContent.long : (result.longSummary || "");
  
  const currentWordCount = activeTab === SummaryLevel.SHORT ? displayShort.split(/\s+/).length 
                         : activeTab === SummaryLevel.MEDIUM ? displayMedium.split(/\s+/).length 
                         : activeTab === SummaryLevel.LONG ? displayLong.split(/\s+/).length 
                         : 0;
                         
  const playlistTracks: PlaylistTrack[] = [
      { id: 'short', title: 'Short Summary', isGenerated: !!audioState.cache?.['short'], audioUrl: audioState.cache?.['short'] },
      { id: 'medium', title: 'Medium Overview', isGenerated: !!audioState.cache?.['medium'], audioUrl: audioState.cache?.['medium'] },
      { id: 'long', title: 'Deep Dive Analysis', isGenerated: !!audioState.cache?.['long'], audioUrl: audioState.cache?.['long'] },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
      {/* ... (Previous UI Components remain same) ... */}
      
      {/* 1. Header Card with Top Controls */}
      <div className="glass-panel bg-white/70 dark:bg-slate-900/70 rounded-3xl p-6 md:p-8 mb-6 shadow-xl relative overflow-visible">
         
         <div className="relative z-10">
             <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                 <div className="flex-1">
                     <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-tight mb-2">
                         {result.fileName || 'Analysis Result'}
                     </h2>
                     <div className="flex items-center gap-3 flex-wrap">
                        {currentWordCount > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">
                                <FileText size={14} />
                                <span>{currentWordCount} words</span>
                                <span className="opacity-50">|</span>
                                <Timer size={14} />
                                <span>{Math.ceil(currentWordCount / 200)} min</span>
                            </div>
                        )}
                        <button onClick={onToggleFavorite} className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                             <Heart size={18} className={isFavorite ? "text-red-500 fill-red-500" : "text-slate-400"} />
                        </button>
                     </div>
                 </div>

                 {/* Top Controls Container - Right Aligned and responsive */}
                 <div className="flex flex-wrap items-center justify-end gap-3 bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl border border-white/60 dark:border-slate-700 backdrop-blur-sm shadow-sm md:max-w-2xl w-full md:w-auto">
                     
                     {/* Language Dropdown */}
                     <div className="relative z-[100] flex-shrink-0" ref={languageMenuRef}>
                         <button 
                             onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                             className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-950 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all min-w-[140px] justify-between shadow-sm relative z-50"
                         >
                             <div className="flex items-center gap-2 truncate">
                                 <Globe size={16} className="text-blue-600"/>
                                 {selectedLanguage}
                             </div>
                             <ChevronDown size={14} className={`text-slate-400 transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`}/>
                         </button>
                         {isLanguageOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto z-[100] ring-1 ring-black/5">
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => { setSelectedLanguage(lang.name); setIsLanguageOpen(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${selectedLanguage === lang.name ? 'text-blue-700 font-bold bg-blue-50 dark:bg-blue-900/20' : 'text-slate-700 dark:text-slate-200'}`}
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                         )}
                     </div>
                     
                     {/* Voice Dropdown */}
                     <div className="relative z-[100] flex-shrink-0" ref={voiceMenuRef}>
                         <button 
                             onClick={() => setIsVoiceOpen(!isVoiceOpen)}
                             className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-950 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all min-w-[160px] justify-between shadow-sm relative z-50"
                         >
                             <div className="flex items-center gap-2 truncate">
                                 <Mic size={16} className="text-purple-600"/>
                                 {VOICE_OPTIONS.find(v => v.key === selectedVoiceKey)?.name || 'Select Voice'}
                             </div>
                             <ChevronDown size={14} className={`text-slate-400 transition-transform ${isVoiceOpen ? 'rotate-180' : ''}`}/>
                         </button>
                         {isVoiceOpen && (
                             <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto z-[100] ring-1 ring-black/5">
                                 {VOICE_OPTIONS.map(voice => (
                                     <button
                                        key={voice.key}
                                        onClick={() => {
                                            if (voice.premium && userPlan !== 'premium') {
                                                onUpgrade();
                                                return;
                                            }
                                            setSelectedVoiceKey(voice.key);
                                            setIsVoiceOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group/voice ${selectedVoiceKey === voice.key ? 'text-blue-700 font-bold bg-blue-50 dark:bg-blue-900/20' : 'text-slate-700 dark:text-slate-200'}`}
                                     >
                                         <div>
                                             <div className="flex items-center gap-2">
                                                 {voice.name}
                                                 {(voice.premium && userPlan !== 'premium') && <Lock size={12} className="text-amber-500" />}
                                             </div>
                                             <div className="text-[10px] text-slate-500 font-normal">{voice.style}</div>
                                         </div>
                                         {selectedVoiceKey === voice.key && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                                     </button>
                                 ))}
                             </div>
                         )}
                     </div>
                     
                    <button
                        onClick={handleApplySettings}
                        disabled={isProcessingCustom}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0 z-20"
                    >
                        {isProcessingCustom ? <Loader2 size={18} className="animate-spin" /> : "Let's Go"}
                        {!isProcessingCustom && <ArrowRight size={18} />}
                    </button>
                 </div>
             </div>
             
             <div className="flex flex-wrap gap-2 mt-6 border-b border-slate-200 dark:border-slate-700 pb-1">
                 {[SummaryLevel.SHORT, SummaryLevel.MEDIUM, SummaryLevel.LONG].map((level) => (
                     <button
                        key={level}
                        onClick={() => setActiveTab(level)}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all relative top-0.5 ${activeTab === level ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-slate-800' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                     >
                         {level} Summary
                     </button>
                 ))}
                 
                 <button
                    onClick={() => setActiveTab('keylights')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all relative top-0.5 flex items-center gap-1 ${activeTab === 'keylights' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 bg-teal-50/50 dark:bg-slate-800' : 'text-slate-500 hover:text-teal-600'}`}
                 >
                     <Gem size={16}/> Keylights
                 </button>

                 <button
                    onClick={() => setActiveTab('ask')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all relative top-0.5 flex items-center gap-1 ${activeTab === 'ask' ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 bg-purple-50/50 dark:bg-slate-800' : 'text-slate-500 hover:text-purple-600'}`}
                 >
                     <MessageCircle size={16}/> Ask AI
                 </button>
                 <button
                    onClick={() => setActiveTab('quiz')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all relative top-0.5 flex items-center gap-1 ${activeTab === 'quiz' ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 bg-orange-50/50 dark:bg-slate-800' : 'text-slate-500 hover:text-orange-600'}`}
                 >
                     <Lightbulb size={16}/> Quiz
                 </button>
             </div>
         </div>
      </div>

      {/* 2. Audio Player */}
      <div className="mb-6 sticky top-24 z-30 transition-all">
          <div className="rounded-[2rem] shadow-2xl backdrop-blur-xl overflow-hidden bg-transparent w-full">
             <BlizzyAudioPlayer 
                audioUrl={audioState.audioUrl}
                currentType={audioState.currentType}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                playbackRate={playbackRate}
                onSetPlaybackRate={setPlaybackRate}
                volume={volume}
                onVolumeChange={setVolume}
                isLooping={isLooping}
                onToggleLoop={() => setIsLooping(!isLooping)}
                onNext={handleNextTrack}
                onPrev={handlePrevTrack}
                tracks={playlistTracks}
                onSelectTrack={handleTrackSelect}
                coverImage={generatedImages?.[0] || null}
                isGenerating={audioState.isLoading}
                onGenerateAll={handleGenerateAllAudio}
                isGeneratingAll={isGeneratingAll}
                defaultMinimized={true}
                theme={audioPlayerTheme}
             />
          </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="flex flex-col gap-6">
          {/* Text Content */}
          <div className="w-full space-y-6">
              
              {(activeTab === SummaryLevel.SHORT || activeTab === SummaryLevel.MEDIUM || activeTab === SummaryLevel.LONG) && (
                  <div className="glass-panel bg-white/50 dark:bg-slate-900/50 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px]">
                      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                         <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                               {activeTab === SummaryLevel.SHORT && <Zap className="text-amber-500" size={20}/>}
                               {activeTab === SummaryLevel.MEDIUM && <FileText className="text-blue-500" size={20}/>}
                               {activeTab === SummaryLevel.LONG && <Sparkles className="text-purple-500" size={20}/>}
                               {activeTab} Summary
                            </h3>
                            {isProcessingCustom && <Loader2 className="animate-spin text-slate-400" size={16} />}
                         </div>
                         
                         <div className="flex items-center gap-2 relative" ref={exportMenuRef}>
                             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                             
                             <button onClick={() => setIsSourceTextOpen(!isSourceTextOpen)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500" title="View Source Text">
                                 <FileType size={18} />
                             </button>

                             <button 
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all font-medium text-sm relative z-50"
                             >
                                 <Share2 size={16} /> Export
                             </button>

                             {showExportMenu && (
                                 <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-[60] animate-in fade-in zoom-in-95">
                                     <button onClick={downloadAsWord} className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                         <FileJson size={16} className="text-blue-600"/> Word Document
                                     </button>
                                     <button onClick={downloadAsPDF} className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                         <FileType2 size={16} className="text-red-600"/> PDF Report
                                     </button>
                                     <button onClick={downloadAsImage} className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                         <FileImage size={16} className="text-purple-600"/> Image (PNG)
                                     </button>
                                     <button onClick={downloadAsText} className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                         <FileText size={16} className="text-slate-500"/> Plain Text
                                     </button>
                                 </div>
                             )}
                         </div>
                      </div>
                      
                      <div id="summary-content" className="prose prose-slate dark:prose-invert max-w-none leading-relaxed text-slate-700 dark:text-slate-300 p-4 bg-white/40 dark:bg-slate-800/20 rounded-xl" ref={contentRef}>
                          {activeTab === SummaryLevel.SHORT && (
                              <div className="text-lg md:text-xl font-medium whitespace-pre-line animate-in fade-in">
                                  {displayShort}
                              </div>
                          )}
                          {activeTab === SummaryLevel.MEDIUM && (
                              <div className="whitespace-pre-line animate-in fade-in text-lg">
                                  {displayMedium}
                              </div>
                          )}
                          {activeTab === SummaryLevel.LONG && (
                              <div className="whitespace-pre-line animate-in fade-in text-base">
                                  {displayLong}
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {/* ... (Chat, Quiz, Keylights logic remains same) ... */}
              {activeTab === 'ask' && (
                  <div className="glass-panel bg-white/50 dark:bg-slate-900/50 rounded-3xl overflow-hidden h-[600px] flex flex-col animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                          {chatMessages.length === 0 && (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                  <Bot size={48} className="mb-4" />
                                  <p>Ask anything about this document.</p>
                              </div>
                          )}
                          {chatMessages.map((msg, idx) => (
                              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 shadow-sm rounded-bl-none border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
                                      {msg.text}
                                  </div>
                              </div>
                          ))}
                          {isChatLoading && (
                              <div className="flex justify-start">
                                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                      <Loader2 size={16} className="animate-spin text-blue-600" />
                                      <span className="text-sm text-slate-500">Thinking...</span>
                                  </div>
                              </div>
                          )}
                          <div ref={chatEndRef} />
                      </div>
                      
                      {/* Chat Settings Bar */}
                      <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
                         <button 
                            onClick={() => setIsThinkingMode(!isThinkingMode)}
                            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-all border ${isThinkingMode ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'}`}
                         >
                            <Brain size={14} />
                            Thinking Mode {isThinkingMode ? 'ON' : 'OFF'}
                         </button>
                      </div>

                      <form onSubmit={handleSendMessage} className="p-4 bg-white/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                          <button 
                             type="button" 
                             onClick={handleMicClick}
                             className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600'}`}
                             title="Speak to type"
                          >
                             {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                          </button>

                          <input 
                              type="text" 
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Type your question..."
                              className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                          />
                          <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                              <Send size={20} />
                          </button>
                      </form>
                  </div>
              )}

              {activeTab === 'quiz' && (
                  <div className="glass-panel bg-white/50 dark:bg-slate-900/50 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 min-h-[400px]">
                      {!quizQuestions.length ? (
                          <div className="text-center py-12">
                              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <Lightbulb size={32} />
                              </div>
                              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Test Your Knowledge</h3>
                              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">Generate a quick 5-question quiz to verify your understanding of the document.</p>
                              <button 
                                  onClick={handleGenerateQuiz} 
                                  disabled={isQuizLoading}
                                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 mx-auto"
                              >
                                  {isQuizLoading ? <Loader2 className="animate-spin"/> : <Zap size={18} />}
                                  Generate Quiz
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-8">
                              <div className="flex justify-between items-center">
                                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Quiz</h3>
                                  <button onClick={() => setQuizQuestions([])} className="text-sm text-slate-500 hover:text-slate-700">Reset</button>
                              </div>
                              
                              {quizQuestions.map((q, qIdx) => (
                                  <div key={qIdx} className="space-y-3">
                                      <p className="font-semibold text-slate-800 dark:text-slate-200">{qIdx + 1}. {q.question}</p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {q.options.map((opt, oIdx) => (
                                              <button
                                                  key={oIdx}
                                                  onClick={() => !showQuizResults && setQuizAnswers(p => ({...p, [qIdx]: oIdx}))}
                                                  className={`p-3 text-left rounded-xl border transition-all ${
                                                      showQuizResults 
                                                      ? q.correctAnswerIndex === oIdx ? "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                                                        : quizAnswers[qIdx] === oIdx ? "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "opacity-50"
                                                      : quizAnswers[qIdx] === oIdx ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                  }`}
                                              >
                                                  {opt}
                                              </button>
                                          ))}
                                      </div>
                                      {showQuizResults && (
                                          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                                              <span className="font-bold">Explanation:</span> {q.explanation}
                                          </div>
                                      )}
                                  </div>
                              ))}

                              {!showQuizResults && Object.keys(quizAnswers).length === quizQuestions.length && (
                                  <button 
                                      onClick={() => setShowQuizResults(true)}
                                      className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all"
                                  >
                                      Check Answers
                                  </button>
                              )}
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'keylights' && (
                  <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                      {result.insights && result.insights.length > 0 ? (
                          result.insights.map((insight, idx) => (
                              <div key={idx} className="glass-panel bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl border border-white/40 dark:border-slate-700 hover:shadow-lg transition-all transform hover:-translate-y-1 relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-teal-500/10 transition-colors"></div>
                                  <div className="flex items-start gap-4 relative z-10">
                                      <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 font-bold shadow-sm">
                                          {idx + 1}
                                      </div>
                                      <div>
                                          <p className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-3 leading-snug">{insight.point}</p>
                                          <div className="text-sm text-slate-500 dark:text-slate-400 italic pl-3 border-l-4 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-slate-800/50 p-2 rounded-r-lg">
                                              "{insight.reference}"
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="text-center text-slate-500 py-10">No keylights available.</div>
                      )}
                  </div>
              )}
          </div>

          {activeTab !== 'ask' && (
              <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                  
                  {generatedImages && generatedImages.length > 0 && (
                      <div className="glass-panel bg-white/50 dark:bg-slate-900/50 p-6 rounded-3xl h-full">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <ImageIcon size={14} /> AI Visual Concepts
                          </h4>
                          <div className="grid grid-cols-1 gap-6"> 
                            {generatedImages.map((img, i) => (
                                <div key={i} className="rounded-2xl overflow-hidden shadow-md cursor-pointer hover:opacity-90 transition-opacity w-full group relative" onClick={() => setLightboxImage(img)}>
                                    <img src={img} alt={`Visual ${i}`} className="w-full h-auto object-contain" />
                                </div>
                            ))}
                          </div>
                      </div>
                  )}

                  {result.diagramDefinition && (
                      <div className="glass-panel bg-white/60 dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 w-full">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <GitGraph size={14} /> Structure Map
                          </h4>
                          <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-800 p-4 text-center h-full flex items-center justify-center min-h-[250px]" ref={mermaidRef}></div>
                      </div>
                  )}

                  {isSourceTextOpen && (
                      <div className="glass-panel bg-white/90 dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 fixed inset-y-4 right-4 w-96 z-50 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg dark:text-white">Source Text</h3>
                              <button onClick={() => setIsSourceTextOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
                          </div>
                          <div className="flex-1 overflow-y-auto text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap p-2 bg-slate-50 dark:bg-slate-950 rounded-xl">
                              {result.extractedText || "No source text available."}
                          </div>
                      </div>
                  )}

              </div>
          )}
      </div>

      {lightboxImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-2 md:p-8 animate-in fade-in backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
              <img 
                src={lightboxImage} 
                alt="Full view" 
                className="w-auto h-auto max-w-full max-h-full rounded-lg shadow-2xl object-contain cursor-default" 
                onClick={(e) => e.stopPropagation()} 
              />
              <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[101]">
                <X size={24}/>
              </button>
          </div>
      )}

      {/* Hidden Export Container - DYNAMIC STRUCTURE */}
      <div 
        ref={exportRef} 
        style={{ 
            position: 'fixed', 
            top: 0, 
            left: '-10000px', 
            width: '800px', 
            backgroundColor: 'white', 
            color: 'black', 
            padding: '40px', 
            zIndex: -5,
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12pt',
            lineHeight: '1.6'
        }}
      >
        <div className="export-section" style={{marginBottom: '40px'}}>
            <h1 style={{fontSize: '28pt', fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '30px', color: '#000'}}>{result.fileName || "Deep Insights Report"}</h1>
        </div>
        
        {/* Short Summary - Concise, try to keep together */}
        <div className="export-section" style={{marginBottom: '30px', pageBreakInside: 'avoid'}}>
            <h2 style={{color: '#2563EB', fontSize:'18pt', fontWeight:'bold', borderBottom:'1px solid #ddd', paddingBottom:'5px', marginBottom:'15px', pageBreakAfter: 'avoid'}}>Executive Summary</h2>
            <p style={{textAlign: 'justify'}}>{result.shortSummary}</p>
        </div>
        
        {/* Medium Summary - Allow breaking if needed, but not after title */}
        <div className="export-section" style={{marginBottom: '30px'}}>
            <h2 style={{color: '#2563EB', fontSize:'18pt', fontWeight:'bold', borderBottom:'1px solid #ddd', paddingBottom:'5px', marginBottom:'15px', pageBreakAfter: 'avoid'}}>Detailed Overview</h2>
            <p style={{textAlign: 'justify'}}>{result.mediumSummary}</p>
        </div>
        
        {/* Long Summary - Allow breaking freely */}
        <div className="export-section" style={{marginBottom: '30px'}}>
            <h2 style={{color: '#2563EB', fontSize:'18pt', fontWeight:'bold', borderBottom:'1px solid #ddd', paddingBottom:'5px', marginBottom:'15px', pageBreakAfter: 'avoid'}}>Deep Dive Analysis</h2>
            <div style={{textAlign: 'justify', whiteSpace: 'pre-wrap'}}>{result.longSummary}</div>
        </div>

        {/* Insights - Keep items together */}
        <div className="export-section" style={{marginBottom: '30px'}}>
            <h2 style={{color: '#2563EB', fontSize:'18pt', fontWeight:'bold', borderBottom:'1px solid #ddd', paddingBottom:'5px', marginBottom:'15px', pageBreakAfter: 'avoid'}}>Key Strategic Highlights</h2>
            {result.insights && result.insights.length > 0 ? (
                result.insights.map((insight, idx) => (
                    <div key={idx} style={{marginBottom: '15px', paddingLeft: '10px', pageBreakInside: 'avoid'}}>
                        <div style={{fontWeight: 'bold', color: '#1f2937', marginBottom: '4px'}}>
                            {idx+1}. {insight.point}
                        </div>
                        <div style={{fontSize: '10pt', fontStyle: 'italic', color: '#4b5563', paddingLeft: '16px', borderLeft: '3px solid #e5e7eb', marginLeft: '4px'}}>
                            "{insight.reference}"
                        </div>
                    </div>
                ))
            ) : (
                <p>No key highlights available.</p>
            )}
        </div>

        {/* Visuals Section - STRICTLY keep images together and fitted */}
        {generatedImages && generatedImages.length > 0 && (
            <div className="export-section" style={{marginBottom: '30px'}}>
                <h3 style={{color: '#2563EB', fontSize:'16pt', fontWeight:'bold', marginBottom:'15px', borderBottom:'1px solid #eee', paddingBottom:'5px', pageBreakAfter: 'avoid'}}>Visual Concepts</h3>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center'}}> 
                    {generatedImages.map((img, i) => (
                        <div key={i} style={{ pageBreakInside: 'avoid', breakInside: 'avoid', textAlign: 'center', width: '100%', marginBottom: '20px' }}>
                           <img src={img} style={{maxWidth: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #ddd', display: 'block', margin: '0 auto'}} alt="AI Visual Concept"/>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Mermaid Diagram */}
        {result.diagramDefinition && (
            <div className="export-section" style={{marginBottom: '30px', pageBreakInside: 'avoid', breakInside: 'avoid'}}>
                <h3 style={{color: '#2563EB', fontSize:'16pt', fontWeight:'bold', marginBottom:'15px', borderBottom:'1px solid #eee', paddingBottom:'5px'}}>Structure Map</h3>
                <div ref={exportMermaidRef} className="export-mermaid-container" style={{backgroundColor: '#fff', padding: '10px', minHeight: '300px', pageBreakInside: 'avoid'}}>
                    {/* Mermaid SVG will be injected here via DOM manipulation in download handlers */}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ResultsView;