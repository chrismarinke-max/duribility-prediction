import { useState, type FormEvent } from 'react';
import { User, Lock, CheckCircle2, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { databaseService } from '../../services/databaseService';

interface RegisterPageProps {
  onBack: () => void;
}

const RegisterPage = ({ onBack }: RegisterPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await databaseService.register(username, password);
      setSuccess(true);
      setTimeout(onBack, 2000);
    } catch (err: any) {
      setError(err.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_12%,#dbeafe_0,#eef4fb_34%,#e7ebf0_100%)] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[48px] shadow-2xl flex flex-col items-center text-center max-w-[400px]"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-6 border border-emerald-100">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">注册成功！</h2>
          <p className="text-slate-400 text-sm font-bold">正在返回登录页面...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_12%,#dbeafe_0,#eef4fb_34%,#e7ebf0_100%)] flex items-center justify-center p-4 overflow-hidden font-['Inter',_sans-serif]">
      <div className="absolute inset-x-0 top-0 h-32 bg-white/45 backdrop-blur-2xl" />
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-100/55 rounded-full blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white w-full max-w-[480px] rounded-[44px] shadow-[0_34px_90px_-30px_rgba(15,23,42,0.42)] border border-slate-200/80 overflow-hidden"
      >
        <div className="p-12 pb-8 flex flex-col items-center text-center bg-gradient-to-b from-white to-slate-50/60">
           <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-[0_18px_35px_-16px_rgba(5,150,105,0.8)] ring-1 ring-emerald-300 mb-6">
              <Activity size={32} className="text-white" />
           </div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">创建新账户</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Create your scientific account</p>
        </div>

        <form onSubmit={handleRegister} className="px-12 pb-12 space-y-5">
          <div className="space-y-3">
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-600 transition-colors">
                <User size={20} strokeWidth={2.4} />
              </div>
              <input 
                type="text" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full h-[60px] pl-14 pr-6 bg-white border-2 border-slate-300 rounded-2xl text-base font-black text-slate-900 placeholder:text-slate-500 outline-none shadow-[inset_0_2px_5px_rgba(15,23,42,0.04),0_8px_20px_-18px_rgba(15,23,42,0.8)] hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100/80 transition-all"
                required
              />
            </div>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-600 transition-colors">
                <Lock size={20} strokeWidth={2.4} />
              </div>
              <input 
                type="password" placeholder="设置密码" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[60px] pl-14 pr-6 bg-white border-2 border-slate-300 rounded-2xl text-base font-black text-slate-900 placeholder:text-slate-500 outline-none shadow-[inset_0_2px_5px_rgba(15,23,42,0.04),0_8px_20px_-18px_rgba(15,23,42,0.8)] hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100/80 transition-all"
                required
              />
            </div>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-600 transition-colors">
                <Lock size={20} strokeWidth={2.4} />
              </div>
              <input 
                type="password" placeholder="确认密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-[60px] pl-14 pr-6 bg-white border-2 border-slate-300 rounded-2xl text-base font-black text-slate-900 placeholder:text-slate-500 outline-none shadow-[inset_0_2px_5px_rgba(15,23,42,0.04),0_8px_20px_-18px_rgba(15,23,42,0.8)] hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100/80 transition-all"
                required
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-[11px] font-black text-center">{error}</p>}

          <button 
            type="submit" disabled={loading}
            className="w-full h-14 flex items-center justify-center gap-3 bg-emerald-600 text-white rounded-2xl font-black text-base hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-[0_18px_34px_-18px_rgba(5,150,105,0.95)] border border-emerald-500 disabled:opacity-50"
          >
            {loading ? '注册中...' : '确认注册'}
          </button>

          <button 
            type="button" onClick={onBack}
            className="w-full h-12 rounded-2xl border-2 border-slate-300 bg-white text-center text-sm font-black text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.98] transition-all"
          >
            返回登录
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
