import { useState, useEffect } from 'react';
import { Settings, LogOut, RefreshCw, Users, Trash2, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { databaseService } from '../services/databaseService';
import { usePredictionStore } from '../store/predictionStore';

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState<'base' | 'users'>('base');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { logout, currentUser } = usePredictionStore();

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

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-700">
      <div className="p-12 pb-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
            <Settings className="text-brand-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">系统核心设置</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Configuration</p>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Nav */}
          <div className="w-64 space-y-2">
            <NavButton 
              active={activeTab === 'base'} 
              onClick={() => setActiveTab('base')}
              icon={<RefreshCw size={18} />}
              label="基础操作"
            />
            {currentUser?.role === 'admin' && (
              <NavButton 
                active={activeTab === 'users'} 
                onClick={() => setActiveTab('users')}
                icon={<Users size={18} />}
                label="用户管理"
              />
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'base' ? (
                <motion.div 
                  key="base" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-12 flex-1"
                >
                  <div className="flex items-center gap-3 mb-10">
                    <Shield className="text-brand-500" size={20} />
                    <h3 className="text-base font-black text-slate-800">基本操作面板</h3>
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
              ) : (
                <motion.div 
                  key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-12 flex-1 flex flex-col"
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
  const styles = color === 'red' ? 'text-red-500 bg-red-50 border-red-100 hover:bg-red-100' : 'text-brand-600 bg-brand-50 border-brand-100 hover:bg-brand-100';
  return (
    <button 
      onClick={onClick}
      className={`p-10 rounded-[32px] border flex flex-col items-center text-center gap-4 transition-all group ${styles}`}
    >
      <div className="mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="text-lg font-black">{label}</h4>
      <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{subLabel}</p>
    </button>
  );
};

export default SystemSettings;
