import { useState, useEffect, useCallback } from 'react';
import { 
  Settings2, Plus, Trash2, FlaskConical, 
  Database, Info, RefreshCw, Box, Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { databaseService } from '../../services/databaseService';

type DictionaryType = 'cement' | 'source' | 'specimentype';

const DictionarySettings = () => {
  const [activeTab, setActiveTab] = useState<DictionaryType>('cement');
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    console.info(`[Dictionary] Loading items for ${activeTab}...`);
    try {
      const items = await databaseService.getDictionary(activeTab);
      setList(items);
    } catch (error) {
      console.error(`[Dictionary] Failed to load ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if (!inputValue.trim()) return;
    if (list.includes(inputValue.trim())) {
      alert('该选项已存在');
      return;
    }
    
    setLoading(true);
    try {
      await databaseService.addDictionaryItem(activeTab, inputValue.trim());
      await loadData();
      setInputValue('');
    } catch (error) {
      alert('添加失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: string) => {
    if (!window.confirm(`确定要从字典中删除 "${item}" 吗?`)) return;
    
    setLoading(true);
    try {
      await databaseService.removeDictionaryItem(activeTab, item);
      await loadData();
    } catch (error) {
      alert('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: DictionaryType) => {
    switch(type) {
      case 'cement': return <FlaskConical size={18} />;
      case 'source': return <Database size={18} />;
      case 'specimentype': return <Box size={18} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden p-10">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
        
        {/* Header */}
        <div className="flex items-center gap-6 mb-12">
          <div className="w-16 h-16 bg-white shadow-xl shadow-slate-200/50 rounded-3xl flex items-center justify-center text-brand-600 border border-slate-100">
            <Settings2 size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
              选项设置 / <span className="text-slate-400">System Dictionary</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-[0.2em]">管理内核引擎中的各类型字典参数，确保数据录入的一致性</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => setActiveTab('cement')}
            className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'cement' ? 'bg-white text-brand-600 shadow-xl shadow-slate-200 border border-slate-100' : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            <FlaskConical size={18} /> 水泥种类
          </button>
          <button 
            onClick={() => setActiveTab('source')}
            className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'source' ? 'bg-white text-brand-600 shadow-xl shadow-slate-200 border border-slate-100' : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Database size={18} /> 数据来源
          </button>
          <button 
            onClick={() => setActiveTab('specimentype')}
            className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'specimentype' ? 'bg-white text-brand-600 shadow-xl shadow-slate-200 border border-slate-100' : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Box size={18} /> 试件类型
          </button>
        </div>

        <div className="flex-1 flex gap-10 min-h-0">
          {/* Main List Area */}
          <div className="flex-1 bg-white rounded-[48px] shadow-sm border border-slate-200 p-10 flex flex-col overflow-hidden">
            
            {/* Input Area */}
            <div className="flex gap-4 mb-10 shrink-0">
               <div className="flex-1 relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                    <Plus size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder={activeTab === 'cement' ? "输入新水泥种类名称 (如 P.O 42.5)..." : "输入新字典项..."}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    value={inputValue}
                    disabled={loading}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
               </div>
               <button 
                onClick={handleAdd}
                disabled={loading || !inputValue.trim()}
                className="px-10 bg-brand-600 text-white rounded-3xl font-black text-xs hover:bg-brand-700 transition-all shadow-xl shadow-brand-100 disabled:opacity-50"
               >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : '立即新增'}
               </button>
            </div>

            {/* List Grid */}
            <div className="flex-1 overflow-auto pr-4 custom-scrollbar">
               {loading && list.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                    <RefreshCw size={40} className="animate-spin mb-4" />
                    <p className="font-black text-xs uppercase tracking-widest">Syncing Dictionary...</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                    <AnimatePresence>
                      {list.map((item) => (
                        <motion.div 
                          key={item}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="group flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:border-brand-300 hover:bg-white transition-all shadow-sm hover:shadow-md"
                        >
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-brand-500 transition-colors shadow-sm">
                                {getIcon(activeTab)}
                             </div>
                             <span className="text-sm font-black text-slate-700 tracking-tight">{item}</span>
                          </div>
                          <button 
                            onClick={() => handleDelete(item)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>
               )}
            </div>
          </div>

          {/* Info Side Panel */}
          <div className="w-[320px] bg-brand-50/30 rounded-[40px] border border-brand-100 p-10 shrink-0">
             <div className="flex items-center gap-3 text-brand-600 mb-6">
                <Info size={24} />
                <h3 className="text-sm font-black uppercase tracking-widest leading-none italic">Usage Tips / 使用说明</h3>
             </div>
             <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">一致性约束</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                    此处定义的选项将出现在“数据筛选”及“数据库查询”的相关下拉框中。
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">命名规范</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                    建议采用标准命名（如 P.O 42.5）以提高数据的搜索与聚类效率。
                  </p>
                </div>
             </div>

             <div className="mt-12 p-8 bg-white rounded-3xl border border-brand-100 shadow-sm shadow-brand-50 relative overflow-hidden group">
                <div className="absolute -top-4 -right-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                   <Hash size={100} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">当前字典容量</p>
                <h4 className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">{list.length}</h4>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DictionarySettings;

