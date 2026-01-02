
import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, AlertCircle, Loader2, Volume2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { blobToBase64 } from '../services/fileHelpers';

interface LiveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

// Helper: Decode Base64 to ArrayBuffer
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Convert Float32 data to PCM16 blob for the API
function createBlob(data: Float32Array): { data: string, mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        // Clamp values to [-1, 1] then convert to int16
        let s = Math.max(-1, Math.min(1, data[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Manual Base64 Encode to avoid overhead
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    
    return {
        data: btoa(binary),
        mimeType: 'audio/pcm;rate=16000'
    };
}

const LiveSessionModal: React.FC<LiveSessionModalProps> = ({ isOpen, onClose, userName }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error' | 'disconnected'>('connecting');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(10).fill(20));

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<Promise<any> | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Initialize the session
  useEffect(() => {
    if (!isOpen) return;
    
    let isActive = true;

    const startSession = async () => {
      setStatus('connecting');
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Setup Output Audio
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
        
        // Setup Input Audio
        // Check browser support first
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Your browser does not support audio input or the connection is not secure (HTTPS required).");
        }

        inputContextRef.current = new AudioCtx({ sampleRate: 16000 });
        
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e: any) {
            if (e.name === 'NotFoundError' || e.message?.includes('device not found')) {
                throw new Error("No microphone found. Please connect a microphone and try again.");
            } else if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                throw new Error("Microphone permission denied. Please allow microphone access in your browser settings.");
            } else {
                throw e;
            }
        }
        
        streamRef.current = stream;

        const connect = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                   if (!isActive) return;
                   setStatus('active');
                   
                   // Start Input Streaming
                   if (inputContextRef.current && stream) {
                        const source = inputContextRef.current.createMediaStreamSource(stream);
                        // Buffer size 4096 gives ~250ms chunks at 16k rate
                        const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
                        processorRef.current = processor;
                        
                        processor.onaudioprocess = (e) => {
                            if (isMicMuted) return;
                            const inputData = e.inputBuffer.getChannelData(0);
                            
                            // Visualizer update from mic input
                            const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
                            const avg = sum / inputData.length;
                            setVisualizerData(prev => {
                                const newData = [...prev.slice(1), Math.min(100, Math.max(10, avg * 500))];
                                return newData;
                            });

                            const pcmPayload = createBlob(inputData);
                            
                            if (sessionRef.current) {
                                sessionRef.current.then(session => {
                                    session.sendRealtimeInput({ media: pcmPayload });
                                }).catch(err => {
                                    // Silent catch to prevent unhandled promise rejection if session closes
                                    console.warn("Failed to send input chunk", err);
                                });
                            }
                        };
                        
                        source.connect(processor);
                        processor.connect(inputContextRef.current.destination);
                   }
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (!isActive) return;
                    
                    try {
                        // Handle Audio Output
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && audioContextRef.current) {
                            const ctx = audioContextRef.current;
                            
                            // Resume if suspended (browser autoplay policy)
                            if (ctx.state === 'suspended') {
                                await ctx.resume();
                            }
                            
                            const rawBytes = decode(base64Audio);
                            // Convert PCM16 to Float32 for AudioContext
                            const dataInt16 = new Int16Array(rawBytes.buffer);
                            const float32Data = new Float32Array(dataInt16.length);
                            for (let i = 0; i < dataInt16.length; i++) {
                                float32Data[i] = dataInt16[i] / 32768.0;
                            }
                            
                            const buffer = ctx.createBuffer(1, float32Data.length, 24000);
                            buffer.copyToChannel(float32Data, 0);

                            const source = ctx.createBufferSource();
                            source.buffer = buffer;
                            source.connect(ctx.destination);
                            
                            // Visualizer update from AI output
                            setVisualizerData(prev => prev.map(v => Math.min(100, v + Math.random() * 20)));

                            const currentTime = ctx.currentTime;
                            // Ensure seamless playback
                            if (nextStartTimeRef.current < currentTime) {
                                nextStartTimeRef.current = currentTime;
                            }
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += buffer.duration;
                            
                            source.onended = () => {
                                sourcesRef.current.delete(source);
                            };
                            sourcesRef.current.add(source);
                        }

                        // Handle Interruption
                        if (message.serverContent?.interrupted) {
                            // Stop current playback
                            sourcesRef.current.forEach(src => {
                                try { src.stop(); } catch(e) {}
                            });
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    } catch (err) {
                        console.error("Error processing live message:", err);
                    }
                },
                onerror: (e) => {
                    console.error("Live API Error", e);
                    setErrorMsg("Connection interrupted.");
                    setStatus('error');
                },
                onclose: () => {
                    if (isActive) setStatus('disconnected');
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                },
                systemInstruction: `You are a helpful and friendly assistant. You are talking to ${userName}. Keep responses concise and conversational.`
            }
        });
        
        sessionRef.current = connect;
        
      } catch (err: any) {
         console.error(err);
         setErrorMsg(err.message || "Failed to connect.");
         setStatus('error');
      }
    };

    startSession();

    return () => {
        isActive = false;
        // Cleanup
        if (sessionRef.current) {
            sessionRef.current.then(session => session.close()).catch(() => {});
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
             audioContextRef.current.close().catch(() => {});
        }
        if (inputContextRef.current) {
             inputContextRef.current.close().catch(() => {});
        }
        if (processorRef.current) {
             try { processorRef.current.disconnect(); } catch(e) {}
        }
    };

  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
            <X size={24} />
        </button>

        {/* Status Area */}
        <div className="flex flex-col items-center gap-8 max-w-lg w-full">
            
            {status === 'connecting' && (
                <div className="flex flex-col items-center gap-4 text-blue-300">
                    <Loader2 size={48} className="animate-spin" />
                    <p className="text-xl font-medium">Connecting to Gemini Live...</p>
                </div>
            )}

            {status === 'error' && (
                <div className="flex flex-col items-center gap-4 text-red-400 text-center">
                    <AlertCircle size={48} />
                    <p className="text-xl font-bold">Connection Failed</p>
                    <p className="text-sm opacity-80">{errorMsg}</p>
                    <button onClick={onClose} className="mt-4 px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-white">Close</button>
                </div>
            )}

            {status === 'active' && (
                <>
                    <div className="text-center space-y-2 mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-widest border border-green-500/30">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Live Session
                        </div>
                        <h2 className="text-3xl font-bold text-white">Listening...</h2>
                        <p className="text-white/50">Speak naturally to start the conversation.</p>
                    </div>

                    {/* Visualizer */}
                    <div className="h-32 flex items-center justify-center gap-2 w-full">
                        {visualizerData.map((height, i) => (
                            <div 
                                key={i} 
                                className="w-3 bg-gradient-to-t from-blue-500 to-cyan-300 rounded-full transition-all duration-75 ease-in-out"
                                style={{ height: `${height}%`, opacity: 0.8 }}
                            ></div>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6 mt-12">
                        <button 
                            onClick={() => {
                                setIsMicMuted(!isMicMuted);
                                // Note: We rely on the processing loop checking this state
                            }}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isMicMuted ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-110'}`}
                        >
                            {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        
                        <button 
                            onClick={onClose}
                            className="w-16 h-16 rounded-full bg-slate-800 text-red-400 border border-slate-700 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500 transition-all hover:scale-105"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};

export default LiveSessionModal;
