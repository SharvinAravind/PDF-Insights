import React, { useState } from 'react';
import { BrainCircuit, Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));

    if (isLogin) {
        // Mock Login Logic
        const storedUsers = JSON.parse(localStorage.getItem('documind_users_db') || '{}');
        const user = storedUsers[email];

        if (user && user.password === password) {
            onLogin(user.profile);
        } else {
            // Allow default demo login
            if (email === 'demo@example.com' && password === 'demo') {
                onLogin({
                    name: 'Demo User',
                    email: 'demo@example.com',
                    plan: 'free',
                    creditsUsed: 0,
                    creditsLimit: 5,
                    history: []
                });
            } else {
                setError("Invalid email or password");
                setIsLoading(false);
            }
        }
    } else {
        // Mock Signup Logic
        if (!name || !email || !password) {
            setError("All fields are required");
            setIsLoading(false);
            return;
        }

        const newUserProfile: UserProfile = {
            name: name,
            email: email,
            plan: 'free',
            creditsUsed: 0,
            creditsLimit: 5,
            history: []
        };

        // Save to mock DB
        const storedUsers = JSON.parse(localStorage.getItem('documind_users_db') || '{}');
        storedUsers[email] = { password, profile: newUserProfile };
        localStorage.setItem('documind_users_db', JSON.stringify(storedUsers));

        onLogin(newUserProfile);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10">
        
        {/* Left Side: Brand & Visuals */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                        <BrainCircuit className="text-blue-300" size={24} />
                    </div>
                    <span className="text-2xl font-bold tracking-tight">Deep Insight</span>
                </div>
                
                <h1 className="text-4xl font-bold leading-tight mb-6">
                    Transform your documents into <span className="text-blue-300">Intelligent Insights</span>.
                </h1>
                <p className="text-blue-100/80 text-lg leading-relaxed mb-8">
                    Upload PDFs, Images, or Office files. Let our AI extract, summarize, and narrate the key takeaways in seconds.
                </p>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm font-medium text-blue-100">
                        <CheckCircle2 className="text-green-400" size={18} />
                        <span>Instant 3-Level Summaries</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-blue-100">
                        <CheckCircle2 className="text-green-400" size={18} />
                        <span>Audio Narrations in Celebrity Voices</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-blue-100">
                        <CheckCircle2 className="text-green-400" size={18} />
                        <span>Visual Concept Generation</span>
                    </div>
                </div>
            </div>

            <div className="relative z-10 text-xs text-blue-300/60 mt-12">
                © 2024 Deep Insight. Powered by Gemini 2.5 Flash.
            </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {isLogin ? 'Welcome back' : 'Create an account'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    {isLogin ? 'Enter your details to access your workspace.' : 'Start your journey with intelligent document analysis today.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                        <Sparkles size={16} /> {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                >
                    {isLoading ? (
                        <span className="animate-pulse">Processing...</span>
                    ) : (
                        <>
                            {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-slate-500 text-sm">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(null); }}
                        className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
            </div>
            
            {isLogin && (
                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-xs text-slate-400">Demo Login:</p>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-1">user: demo@example.com / pass: demo</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;