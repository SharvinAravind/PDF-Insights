import React, { useState } from 'react';
import { Check, Sparkles, X, Zap, CreditCard, Lock, Loader2 } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  if (!isOpen) return null;

  const handlePayment = () => {
      setIsProcessing(true);
      // Simulate Stripe Processing Delay
      setTimeout(() => {
          setIsProcessing(false);
          onConfirm();
      }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors z-10">
            <X size={20} />
        </button>

        {/* Left: Value Prop */}
        <div className="p-8 md:p-10 bg-slate-50 dark:bg-slate-800/50 md:w-1/2 flex flex-col justify-center border-r border-slate-200 dark:border-slate-800">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-2xl mb-6 text-amber-500 shadow-sm">
                <Sparkles size={28} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Unlock Pro Power</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Remove limits and unleash the full potential of DocuMind AI. Join thousands of power users.</p>
            
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-green-500/10 rounded-full text-green-500"><Check size={14} strokeWidth={3} /></div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Unlimited Searches</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-green-500/10 rounded-full text-green-500"><Check size={14} strokeWidth={3} /></div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">History & Cloud Save</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-green-500/10 rounded-full text-green-500"><Check size={14} strokeWidth={3} /></div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">10+ Premium Neural Voices</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-green-500/10 rounded-full text-green-500"><Check size={14} strokeWidth={3} /></div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">AI Visual Concept Generation</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-green-500/10 rounded-full text-green-500"><Check size={14} strokeWidth={3} /></div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Advanced 600+ Word Analysis</span>
                </div>
            </div>
        </div>

        {/* Right: Payment Gateway */}
        <div className="p-8 md:p-10 md:w-1/2 bg-white dark:bg-slate-900 flex flex-col justify-center relative">
            
            <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Secure Checkout</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Lock size={12} className="text-green-500" />
                    <span>Encrypted by Stripe (256-bit SSL)</span>
                </div>
            </div>

            <div className="space-y-6">
                 {/* Simulated Stripe Element */}
                 <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Card Details</label>
                     <div className="flex items-center gap-3">
                         <CreditCard className="text-slate-400" size={20} />
                         <input 
                            type="text" 
                            placeholder="4242 4242 4242 4242" 
                            className="bg-transparent border-none outline-none w-full font-mono text-slate-700 dark:text-slate-200"
                            disabled={isProcessing}
                         />
                     </div>
                     <div className="flex gap-4 mt-3 border-t border-slate-200 dark:border-slate-800 pt-3">
                         <input 
                            type="text" 
                            placeholder="MM/YY" 
                            className="bg-transparent border-none outline-none w-1/3 font-mono text-slate-700 dark:text-slate-200"
                            disabled={isProcessing}
                         />
                         <input 
                            type="text" 
                            placeholder="CVC" 
                            className="bg-transparent border-none outline-none w-1/3 font-mono text-slate-700 dark:text-slate-200"
                            disabled={isProcessing}
                         />
                     </div>
                 </div>

                 <div className="flex justify-between items-center py-4 border-t border-b border-dashed border-slate-200 dark:border-slate-800">
                     <div>
                         <span className="text-sm font-medium text-slate-500">Total today</span>
                         <p className="text-xs text-slate-400">billed monthly</p>
                     </div>
                     <div className="text-2xl font-bold text-slate-900 dark:text-white">$9.99</div>
                 </div>

                 <button 
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full py-4 bg-[#635bff] hover:bg-[#544ee0] text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                    {isProcessing ? (
                        <>
                           <Loader2 size={20} className="animate-spin" /> Processing...
                        </>
                    ) : (
                        <>
                           Pay with Stripe
                        </>
                    )}
                 </button>
            </div>
            
            <div className="mt-6 flex justify-center gap-4 opacity-50 grayscale">
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-6" />
                <div className="h-6 w-px bg-slate-300"></div>
                <div className="flex gap-2">
                    <div className="h-6 w-10 bg-slate-200 rounded"></div>
                    <div className="h-6 w-10 bg-slate-200 rounded"></div>
                    <div className="h-6 w-10 bg-slate-200 rounded"></div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;