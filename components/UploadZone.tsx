import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Link as LinkIcon, AlertCircle, ArrowRight, FileSpreadsheet, ScanLine, Camera, Lock, Layers } from 'lucide-react';
import { validateFileType, isOfficeFile } from '../services/fileHelpers';
import { PlanType } from '../types';

interface UploadZoneProps {
  onFilesSelect: (files: File[]) => void; // Changed to array
  onHtmlPaste: (html: string) => void;
  userPlan: PlanType;
  onUpgrade: () => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelect, onHtmlPaste, userPlan, onUpgrade }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'html'>('file');
  const [htmlInput, setHtmlInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1 && userPlan !== 'premium') {
          setError("Multiple file upload is a Premium feature. Please upgrade.");
          return;
      }
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files: File[]) => {
      const validFiles: File[] = [];
      
      for (const file of files) {
          if (isOfficeFile(file) && userPlan !== 'premium') {
              onUpgrade();
              return;
          }
          if (validateFileType(file)) {
              validFiles.push(file);
          }
      }

      if (validFiles.length > 0) {
          if (isScanning) {
            setTimeout(() => {
                setIsScanning(false);
                onFilesSelect(validFiles);
            }, 2000);
          } else {
            onFilesSelect(validFiles);
          }
      } else {
          setError("Unsupported file type(s).");
      }
  };

  const handleScanClick = () => {
      setIsScanning(true);
      cameraInputRef.current?.click();
  };

  const handleHtmlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!htmlInput.trim()) {
      setError("Please enter some content.");
      return;
    }
    const blob = new Blob([htmlInput], { type: 'text/html' });
    const file = new File([blob], "pasted_content.html", { type: 'text/html' });
    onFilesSelect([file]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in zoom-in-95 fade-in duration-500">
      <div className={`glass-panel bg-white/60 dark:bg-slate-900/60 rounded-3xl shadow-xl shadow-blue-900/5 overflow-hidden border border-white/60 dark:border-slate-800 transition-all hover:shadow-2xl hover:shadow-blue-900/10 relative ${isScanning ? 'ring-2 ring-red-500 shadow-red-500/20' : ''} ${userPlan === 'premium' ? 'border-amber-400/30' : ''}`}>
        
        {/* Scanning Laser Effect Overlay */}
        {isScanning && (
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-3xl">
                <div className="w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                <div className="absolute inset-0 bg-red-500/5"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 font-bold bg-white/90 px-4 py-2 rounded-full shadow-lg">
                    SCANNING DOCUMENT...
                </div>
            </div>
        )}

        {/* Toggle Switch */}
        <div className="flex justify-center pt-8 pb-4 relative z-10">
            <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-full flex gap-1 relative shadow-inner">
                <button
                    onClick={() => { setActiveTab('file'); setError(null); }}
                    className={`
                        relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300
                        ${activeTab === 'file' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}
                    `}
                >
                    <div className="flex items-center gap-2">
                        <Upload size={16} />
                        Upload File
                    </div>
                </button>
                <button
                    onClick={() => { setActiveTab('html'); setError(null); }}
                    className={`
                        relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300
                        ${activeTab === 'html' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}
                    `}
                >
                    <div className="flex items-center gap-2">
                        <LinkIcon size={16} />
                        Paste Text/URL
                    </div>
                </button>
            </div>
        </div>

        <div className="p-8 md:p-12 min-h-[360px] flex flex-col justify-center relative z-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50/50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {activeTab === 'file' ? (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                
                {/* Main Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        group relative flex flex-col items-center justify-center w-full h-64 rounded-3xl border-3 border-dashed transition-all duration-300 cursor-pointer
                        ${isDragging 
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02]' 
                            : 'border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-white/60 dark:hover:bg-slate-800/60'
                        }
                    `}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileInput}
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.html,.txt,.md,.json,.csv,.docx,.xlsx,.pptx"
                        multiple={userPlan === 'premium'}
                    />
                    <div className={`
                        w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-500
                        ${isDragging ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:scale-110'}
                    `}>
                        {userPlan === 'premium' ? <Layers className="w-8 h-8"/> : <Upload className="w-8 h-8" />}
                    </div>
                    <p className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {userPlan === 'premium' ? "Drop files here (Multiple allowed)" : "Drop your file here"}
                    </p>
                    <p className="text-slate-400 text-sm">
                        {userPlan === 'premium' ? "PDF, Word, Images, Excel, etc." : "PDF, Word, Images, Excel"}
                    </p>
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-4">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                    <span className="text-slate-400 text-xs font-bold uppercase">Or</span>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                </div>

                {/* Scan Button */}
                <button 
                    onClick={handleScanClick}
                    className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-lg shadow-slate-900/20 group hover:scale-[1.01]"
                >
                    <input 
                        type="file" 
                        ref={cameraInputRef} 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden"
                        onChange={handleFileInput}
                    />
                    <div className="p-1.5 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                        <Camera size={20} />
                    </div>
                    <span className="font-bold">Scan Document with Camera</span>
                </button>
            </div>
          ) : (
            <form onSubmit={handleHtmlSubmit} className="h-full flex flex-col animate-in fade-in duration-300">
              <textarea
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                placeholder="Paste extracted text, article content, or raw HTML here..."
                className="flex-1 w-full h-64 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none text-slate-700 dark:text-slate-300 text-base leading-relaxed mb-6 transition-all"
              />
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                Analyze Content <ArrowRight size={20} />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-slate-600 dark:text-slate-400">
        <div className="group p-4 rounded-3xl border border-transparent hover:border-orange-100 dark:hover:border-orange-900 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all duration-300 flex flex-col items-center text-center animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100 cursor-default hover:-translate-y-1">
           <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><FileText size={20}/></div>
           <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Standard Docs</h3>
           <p className="text-xs opacity-70">PDFs, MD, TXT, JSON</p>
        </div>
        <div className="group p-4 rounded-3xl border border-transparent hover:border-green-100 dark:hover:border-green-900 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all duration-300 flex flex-col items-center text-center animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200 cursor-default hover:-translate-y-1">
           <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><ImageIcon size={20}/></div>
           <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Visual OCR</h3>
           <p className="text-xs opacity-70">JPG, PNG, WebP</p>
        </div>
        <div className="group p-4 rounded-3xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-300 flex flex-col items-center text-center relative animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300 cursor-default hover:-translate-y-1">
           <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><FileSpreadsheet size={20}/></div>
           <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 flex items-center gap-1">Office {userPlan !== 'premium' && <Lock size={10} className="text-amber-500" />}</h3>
           <p className="text-xs opacity-70">Word, Excel, PPTX</p>
        </div>
        <div className="group p-4 rounded-3xl border border-transparent hover:border-purple-100 dark:hover:border-purple-900 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all duration-300 flex flex-col items-center text-center animate-in slide-in-from-bottom-4 fade-in duration-700 delay-400 cursor-default hover:-translate-y-1">
           <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Layers size={20}/></div>
           <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 flex items-center gap-1">Multi-File {userPlan !== 'premium' && <Lock size={10} className="text-amber-500" />}</h3>
           <p className="text-xs opacity-70">Batch Processing</p>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;