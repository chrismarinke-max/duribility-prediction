import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Filter, Download, Plus, Trash2, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';

interface ResearchRecord {
  ID: string;
  name: string;
  cement: string;
  wc: string;
  initial_f: string;
  cycle: string;
  [key: string]: string;
}

const ResearchDatabase = () => {
  const [records, setRecords] = useState<ResearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const sql = `SELECT * FROM data LIMIT 20 OFFSET ${page * 20}`;
        const json = await invoke<string>('query_db', { sql, paramsVec: [] });
        setRecords(JSON.parse(json));
      } catch (e) {
        console.error("DB Fetch failed", e);
        // Mock data for UI testing
        setRecords(Array.from({ length: 10 }).map((_, i) => ({
          ID: (i + 1).toString(),
          name: `实验样本-${i + 101}`,
          cement: "A 类 (硅酸盐)",
          wc: "0.42",
          initial_f: "45.2",
          cycle: "30",
          date: "2024-04-15"
        })));
      }
      setLoading(false);
    };
    fetch();
  }, [page]);

  const filtered = records.filter(r => 
    Object.values(r).some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="搜索实验编号、材料、配合比..." 
            className="input-field w-full pl-12 bg-white/5 border-white/5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2 text-sm px-4">
            <Filter size={16} /> 筛选器
          </button>
          <button className="btn-secondary flex items-center gap-2 text-sm px-4">
            <Download size={16} /> 导出 Excel
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm px-4">
            <Plus size={16} /> 新增实验
          </button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-3xl overflow-hidden flex flex-col border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">序号</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">样本名称</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">水泥种类</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">水胶比</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">初始强度 (MPa)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">循环次数</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-full" /></td>
                  </tr>
                ))
              ) : filtered.map((r) => (
                <tr key={r.ID} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">{r.ID}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">{r.name || `Record-${r.ID}`}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{r.cement}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{r.wc}</td>
                  <td className="px-6 py-4 text-sm text-blue-400 font-mono font-bold">{r.initial_f}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{r.cycle}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all">
                        <Edit3 size={16} />
                      </button>
                      <button className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {!loading && filtered.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
             <Search size={48} className="opacity-10 mb-4" />
             <p>未找到符合条件的实验记录</p>
          </div>
        )}

        <div className="px-8 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-500">显示第 {page * 20 + 1} 至 {page * 20 + filtered.length} 条记录</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 hover:bg-white/5 text-slate-400 disabled:opacity-20 transition-all rounded-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setPage(page + 1)}
              className="p-2 hover:bg-white/5 text-slate-400 transition-all rounded-lg"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchDatabase;
