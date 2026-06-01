import { useState, useEffect } from 'react';
import { Settings, LogOut, RefreshCw, Users, Trash2, AlertCircle, Loader2, BrainCircuit, FolderOpen, Terminal, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { open } from '@tauri-apps/plugin-dialog';
import { databaseService } from '../services/databaseService';
import { usePredictionStore } from '../store/predictionStore';
import { useAIReaderStore } from '../store/aiReaderStore';

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState<'base' | 'users' | 'ai'>('base');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { logout, currentUser } = usePredictionStore();
  const { pipelinePath, setPipelinePath, pythonPath, setPythonPath, concurrency, setConcurrency } = useAIReaderStore();

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await databaseService.getAllUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (uuid: string, role: string) => {
    try {
      await databaseService.updateUserRole(uuid, role);
      loadUsers();
    } catch (e) {
      alert("更新失败: " + e);
    }
  };

  const handleDeleteUser = async (uuid: string) => {
    if (!window.confirm("确定要删除该用户吗？")) return;
    try {
      await databaseService.deleteUser(uuid);
      loadUsers();
    } catch (e) {
      alert("删除失败: " + e);
    }
  };

  const handleSelectPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: pipelinePath
      });
      if (selected && typeof selected === 'string') {
        setPipelinePath(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectPython = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        filters: [{ name: 'Python Executable', extensions: ['exe'] }]
      });
      if (selected && typeof selected === 'string') {
        setPythonPath(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#f8fafc] animate-in fade-in duration-700 pb-20">
      <div className="max-w-6xl mx-auto p-8 lg:p-12">
        <div className="flex items-center gap-5 mb-10">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
            <Settings className="text-brand-600" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">系统核心设置</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">System Configuration & Management</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar Nav */}
          <div className="w-full lg:w-64 space-y-3 shrink-0">
            <div className="sticky top-8 space-y-3">
              <NavButton 
                active={activeTab === 'base'} 
                onClick={() => setActiveTab('base')}
                icon={<RefreshCw size={20} />}
                label="基础操作"
              />
              <NavButton 
                active={activeTab === 'ai'} 
                onClick={() => setActiveTab('ai')}
                icon={<BrainCircuit size={20} />}
                label="AI 提取配置"
              />
              {currentUser?.role === 'admin' && (
                <NavButton 
                  active={activeTab === 'users'} 
                  onClick={() => setActiveTab('users')}
                  icon={<Users size={20} />}
                  label="用户管理"
                />
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === 'base' ? (
                <motion.div 
                  key="base" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="p-10 lg:p-14"
                >
                  <div className="flex items-center gap-3 mb-12">
                    <div className="w-2 h-6 bg-brand-500 rounded-full" />
                    <h3 className="text-lg font-black text-slate-800">基本操作面板</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <ActionButton 
                      onClick={logout}
                      icon={<LogOut size={32} />}
                      label="重新登录"
                      subLabel="退出当前账户并返回登录页"
                      color="blue"
                    />
                    <ActionButton 
                      onClick={() => window.close()}
                      icon={<AlertCircle size={32} />}
                      label="系统退出"
                      subLabel="安全关闭耐久性预测系统"
                      color="red"
                    />
                  </div>
                </motion.div>
              ) : activeTab === 'ai' ? (
                <motion.div 
                  key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="p-10 lg:p-14"
                >
                  <div className="flex items-center gap-3 mb-12">
                    <div className="w-2 h-6 bg-brand-500 rounded-full" />
                    <h3 className="text-lg font-black text-slate-800">AI 提取引擎配置</h3>
                  </div>

                  <div className="space-y-10">
                    {/* Pipeline Path */}
                    <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                            <BrainCircuit className="text-brand-600" size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800">Pipeline 根目录</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Base Directory Path</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleSelectPath}
                          className="px-6 py-2 bg-white border border-slate-200 text-brand-600 rounded-xl text-[11px] font-black hover:bg-brand-50 transition-all shadow-sm active:scale-95"
                        >
                          更改路径
                        </button>
                      </div>
                      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100">
                        <FolderOpen size={16} className="text-slate-400" />
                        <code className="text-[11px] font-mono text-slate-600 truncate flex-1">{pipelinePath || "未配置路径"}</code>
                      </div>
                      <p className="mt-4 text-[10px] text-slate-400 font-medium leading-relaxed">
                        * 软件将自动在此目录下探测 <span className="text-brand-500 font-bold">venv</span> 虚拟环境。请确保该目录下包含 <span className="text-slate-700 font-bold">run_v3_ultimate.py</span> 文件。
                      </p>
                    </div>

                    {/* Python Interpreter */}
                    <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                            <Terminal className="text-brand-600" size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800">Python 解释器 (选填)</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Custom Interpreter</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleSelectPython}
                          className="px-6 py-2 bg-white border border-slate-200 text-brand-600 rounded-xl text-[11px] font-black hover:bg-brand-50 transition-all shadow-sm active:scale-95"
                        >
                          选择程序
                        </button>
                      </div>
                      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100">
                        <Terminal size={16} className="text-slate-400" />
                        <code className="text-[11px] font-mono text-slate-600 truncate flex-1">{pythonPath || "自动探测模式 (Auto-Detect)"}</code>
                      </div>
                      <p className="mt-4 text-[10px] text-slate-400 font-medium leading-relaxed">
                        * 如果你的 Python 虚拟环境不在 Pipeline 目录下（如远程服务器环境），请在此手动指定 <span className="text-slate-700 font-bold">python.exe</span> 的路径。
                      </p>
                    </div>

                    {/* Concurrency */}
                    <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                            <Zap className="text-brand-600" size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800">并行提取并发数</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Concurrency Limit</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <input 
                              type="number" 
                              min="1" 
                              max="32" 
                              value={concurrency}
                              onChange={(e) => {
                                let val = parseInt(e.target.value);
                                if (isNaN(val)) val = 1;
                                if (val < 1) val = 1;
                                if (val > 32) val = 32;
                                setConcurrency(val);
                              }}
                              className="w-24 px-4 py-2 bg-white border border-slate-200 text-brand-600 rounded-xl text-lg font-black text-center outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                           />
                        </div>
                      </div>
                      <p className="mt-4 text-[10px] text-slate-400 font-medium leading-relaxed">
                        * 当前远程模型调用优先保证稳定性，批量提取会按串行执行。后续确认网络和模型限流稳定后再开放更高并发。
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="p-10 lg:p-14 flex-1 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <Users className="text-brand-500" size={20} />
                      <h3 className="text-base font-black text-slate-800">用户管理</h3>
                    </div>
                    <div className="px-4 py-1.5 bg-brand-50 text-brand-600 text-[10px] font-black rounded-full border border-brand-100">
                      总计：{users.length} 个账户
                    </div>
                  </div>

                  <div className="flex-1 border border-slate-100 rounded-3xl overflow-hidden flex flex-col">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest">UUID</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest">用户名</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest">角色授权</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest">注册/更新时间</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest text-right">管理操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin inline-block text-brand-500" size={32} /></td></tr>
                        ) : users.map(user => (
                          <tr key={user.uuid} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 text-xs font-bold text-slate-400">{user.uuid}</td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-brand-600 text-white rounded-xl flex items-center justify-center font-black text-[10px]">
                                  {user.username[0].toUpperCase()}
                                </div>
                                <span className="text-sm font-black text-slate-700">{user.username}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <select 
                                value={user.role}
                                disabled={user.uuid === '0001'}
                                onChange={(e) => handleUpdateRole(user.uuid, e.target.value)}
                                className={`bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-500 ${user.uuid === '0001' ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                              >
                                <option value="user">普通用户 (User)</option>
                                <option value="admin">管理员 (Admin)</option>
                              </select>
                            </td>
                            <td className="px-8 py-5 text-[11px] font-bold text-slate-400">{user.created_at}</td>
                            <td className="px-8 py-5 text-right">
                              {user.uuid === '0001' ? (
                                <span className="text-[10px] font-black text-slate-300 uppercase">不可删除</span>
                              ) : (
                                <button 
                                  onClick={() => handleDeleteUser(user.uuid)}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-100' : 'text-slate-500 hover:bg-slate-100'}`}
  >
    {icon} {label}
  </button>
);

const ActionButton = ({ onClick, icon, label, subLabel, color }: any) => {
  const styles = color === 'red' ? 'text-red-500 bg-red-50 border-red-100 hover:bg-red-500 hover:text-white' : 'text-brand-600 bg-brand-50 border-brand-100 hover:bg-brand-600 hover:text-white';
  return (
    <button 
      onClick={onClick}
      className={`p-12 rounded-[40px] border flex flex-col items-center text-center gap-4 transition-all duration-300 group ${styles}`}
    >
      <div className="mb-2 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">{icon}</div>
      <h4 className="text-xl font-black">{label}</h4>
      <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em]">{subLabel}</p>
    </button>
  );
};

export default SystemSettings;
