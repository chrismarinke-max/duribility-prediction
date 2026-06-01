import React, { useState } from 'react';
import { User, Lock, ArrowRight, UserPlus, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { databaseService } from '../../services/databaseService';
import { usePredictionStore } from '../../store/predictionStore';
import logoImg from '../../assets/logo.png';

interface LoginPageProps {
  onRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { setCurrentUser } = usePredictionStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await databaseService.login(username, password, role);
      setCurrentUser({
        username: user.username,
        role: user.role,
        uuid: user.uuid
      });
    } catch (err: any) {
      setError(err.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_12%,#dbeafe_0,#eef4fb_34%,#e7ebf0_100%)] flex items-center justify-center p-4 overflow-hidden font-['Inter',_sans-serif]">
      <div className="absolute inset-x-0 top-0 h-32 bg-white/45 backdrop-blur-2xl" />
      <div className="absolute left-[12%] top-[12%] w-72 h-72 bg-blue-200/35 rounded-full blur-[90px]" />
      <div className="absolute right-[10%] bottom-[8%] w-80 h-80 bg-sky-300/25 rounded-full blur-[110px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white w-full max-w-[500px] rounded-[44px] shadow-[0_34px_90px_-30px_rgba(15,23,42,0.42)] border border-slate-200/80 overflow-hidden flex flex-col"
      >
        {/* Header Section */}
        <div className="p-12 pb-7 flex flex-col items-center text-center bg-gradient-to-b from-white to-slate-50/60">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-[0_18px_35px_-16px_rgba(15,23,42,0.7)] ring-1 ring-slate-200 mb-8 overflow-hidden"
          >
            <img src={logoImg} className="w-full h-full object-cover" alt="Logo" />
          </motion.div>
          <h1 className="text-[20px] sm:text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            海洋环境混凝土抗压强度演化<br />数据管理及耐久性预测系统
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Scientific Version 4.0</p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="px-12 pb-12 space-y-6 bg-white">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-600 transition-colors">
                <User size={20} strokeWidth={2.4} />
              </div>
              <input 
                type="text" 
                placeholder="用户名" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-[64px] pl-14 pr-6 bg-white border-2 border-slate-300 rounded-2xl text-base font-black text-slate-900 placeholder:text-slate-500 outline-none shadow-[inset_0_2px_5px_rgba(15,23,42,0.04),0_8px_20px_-18px_rgba(15,23,42,0.8)] hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100/80 transition-all"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-600 transition-colors">
                <Lock size={20} strokeWidth={2.4} />
              </div>
              <input 
                type="password" 
                placeholder="密码" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[64px] pl-14 pr-6 bg-white border-2 border-slate-300 rounded-2xl text-base font-black text-slate-900 placeholder:text-slate-500 outline-none shadow-[inset_0_2px_5px_rgba(15,23,42,0.04),0_8px_20px_-18px_rgba(15,23,42,0.8)] hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100/80 transition-all"
                required
              />
            </div>
          </div>

          {/* Role Toggle */}
          <div className="p-1.5 bg-slate-200/80 rounded-[22px] border-2 border-slate-300/80 flex items-center shadow-inner">
            <button 
              type="button"
              onClick={() => setRole('user')}
              className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-[16px] text-sm font-black transition-all border ${role === 'user' ? 'bg-white text-brand-700 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.9)] border-slate-300' : 'text-slate-700 border-transparent hover:bg-white/45 hover:text-slate-950'}`}
            >
              <User size={16} strokeWidth={2.6} /> 用户
            </button>
            <button 
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-[16px] text-sm font-black transition-all border ${role === 'admin' ? 'bg-white text-brand-700 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.9)] border-slate-300' : 'text-slate-700 border-transparent hover:bg-white/45 hover:text-slate-950'}`}
            >
              <Shield size={16} strokeWidth={2.6} /> 管理员
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-500 text-[11px] font-black text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4 pt-2">
            <button 
              type="button"
              onClick={onRegister}
              className="h-14 px-6 rounded-2xl border-2 border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98] flex items-center gap-2 font-black text-sm shadow-[0_10px_22px_-18px_rgba(15,23,42,0.9)] transition-all"
            >
              <UserPlus size={18} strokeWidth={2.5} /> 用户注册
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 h-14 flex items-center justify-center gap-3 bg-gradient-to-r from-brand-700 to-brand-500 text-white rounded-2xl font-black text-base hover:from-brand-800 hover:to-brand-600 active:scale-[0.98] transition-all shadow-[0_18px_34px_-18px_rgba(37,99,235,0.95)] border border-brand-500 disabled:opacity-50"
            >
              {loading ? '正在登录...' : (
                <>
                  <ArrowRight size={20} strokeWidth={2.6} /> 登录
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="p-8 bg-slate-100/70 border-t border-slate-200 text-center">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Developed by Anti-Gravity Group © 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
