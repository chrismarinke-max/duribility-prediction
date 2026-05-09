import React, { useState } from 'react';
import { User, Lock, ArrowRight, UserPlus, Shield, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { databaseService } from '../../services/databaseService';
import { usePredictionStore } from '../../store/predictionStore';

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
    <div className="fixed inset-0 bg-[#f0f2f5] flex items-center justify-center p-4 overflow-hidden font-['Inter',_sans-serif]">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px] animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white w-full max-w-[480px] rounded-[48px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-white/20 overflow-hidden flex flex-col"
      >
        {/* Header Section */}
        <div className="p-12 pb-8 flex flex-col items-center text-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-200 mb-8"
          >
            <Activity size={40} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            海洋环境混凝土抗压强度演化数据管理<br />及耐久性预测系统
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Scientific Version 4.0</p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="px-12 pb-12 space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors">
                <User size={18} />
              </div>
              <input 
                type="text" 
                placeholder="用户名" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-50 transition-all"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors">
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                placeholder="密码" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-50 transition-all"
                required
              />
            </div>
          </div>

          {/* Role Toggle */}
          <div className="p-1 bg-slate-50 rounded-[20px] border border-slate-100 flex items-center">
            <button 
              type="button"
              onClick={() => setRole('user')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] text-xs font-black transition-all ${role === 'user' ? 'bg-white text-brand-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <User size={14} /> 用户
            </button>
            <button 
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] text-xs font-black transition-all ${role === 'admin' ? 'bg-white text-brand-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Shield size={14} /> 管理员
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
              className="flex items-center gap-2 px-6 py-4 text-slate-400 hover:text-brand-600 font-bold text-sm transition-all"
            >
              <UserPlus size={18} /> 用户注册
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-3 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm hover:bg-brand-700 transition-all shadow-xl shadow-brand-100 disabled:opacity-50"
            >
              {loading ? '正在登录...' : (
                <>
                  <ArrowRight size={18} /> 登录
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
            Developed by Anti-Gravity Group © 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
