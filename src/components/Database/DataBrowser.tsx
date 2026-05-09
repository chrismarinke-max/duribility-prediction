import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Download, Upload, 
  X, RefreshCw, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import { databaseService } from '../../services/databaseService';
import DataEditorModal from './DataEditorModal';
import * as XLSX from 'xlsx';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

const COLUMNS = [
  { id: 'id', label: 'ID', category: 'ID', visible: false },
  { id: 'cement', label: '水泥种类', category: 'Material' },
  { id: 'cementstrength', label: '28d水泥强度/MPa', category: 'Material' },
  { id: 'specimentype', label: '试件类型', category: 'Material' },
  { id: 'specimenscale', label: '试件尺寸/mm', category: 'Material' },
  { id: 'wc', label: '水灰比', category: 'Material' },
  { id: 'specificarea', label: '表体比/m⁻¹', category: 'Material' },
  { id: 'sandratio', label: '砂率', category: 'Material' },
  { id: 'initialstrength', label: '初始强度/MPa', category: 'Material' },
  { id: 'flyash', label: '粉煤灰掺量/%', category: 'Material' },
  { id: 'slag', label: '矿渣掺量/%', category: 'Material' },
  { id: 'silicafume', label: '硅灰掺量/%', category: 'Material' },
  
  { id: 'Na', label: 'Na⁺/mol·L⁻¹', category: 'Environment' },
  { id: 'Mg', label: 'Mg²⁺/mol·L⁻¹', category: 'Environment' },
  { id: 'Cl', label: 'Cl⁻/mol·L⁻¹', category: 'Environment' },
  { id: 'SO4', label: 'SO₄²⁻/mol·L⁻¹', category: 'Environment' },
  { id: 'wettingtime', label: '润湿时间/h', category: 'Environment' },
  { id: 'wettingtemp', label: '润湿温度/℃', category: 'Environment' },
  { id: 'dryingtime', label: '干燥时间/h', category: 'Environment' },
  { id: 'dryingtemp', label: '干燥温度/℃', category: 'Environment' },
  { id: 'cycle', label: '循环周期/d', category: 'Environment' },
  { id: 'degradationtime', label: '劣化时间/d', category: 'Environment' },
  { id: 'finalstrength', label: '劣化强度/MPa', category: 'Environment' },
  
  { id: 'source', label: '数据来源', category: 'Source' },
  { id: 'title', label: '文献标题', category: 'Source' },
  { id: 'journal', label: '期刊名称', category: 'Source' },
  { id: 'author', label: '作者', category: 'Source' },
  { id: 'institute', label: '研究机构', category: 'Source' },
  { id: 'time', label: '发表时间/年', category: 'Source' },
];

const DataBrowser = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'regex' | 'exact'>('regex');
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [visibleCategories, setVisibleCategories] = useState({
    Material: true,
    Environment: true,
    Source: true,
  });
  const [pageSize, setPageSize] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const records = await databaseService.fetchAllRecords();
      setData(records);
      setSelectedRowIndex(null);
    } catch (error) {
      console.error('[DataBrowser] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCategory = (cat: keyof typeof visibleCategories) => {
    setVisibleCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleDelete = async () => {
    if (selectedRowIndex === null) return;
    const row = filteredData[selectedRowIndex];
    if (window.confirm(`确定要删除 ID 为 ${row.id} 的记录吗?`)) {
      try {
        await databaseService.deleteRecord(row.id);
        await loadData();
      } catch (error) {
        alert('删除失败');
      }
    }
  };

  const handleExport = async () => {
    if (filteredData.length === 0) return;
    try {
      const timestamp = new Date().getTime();
      const defaultPath = `数据库导出_${timestamp}.xlsx`;

      const filePath = await save({
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: defaultPath
      });

      if (!filePath) return;

      const ws = XLSX.utils.json_to_sheet(filteredData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const uint8Array = new Uint8Array(wbout);

      await invoke('save_excel_to_path', { 
        content: Array.from(uint8Array), 
        fullPath: filePath 
      });

      alert("导出成功！");
    } catch (err) {
      alert(`导出失败: ${err}`);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);
        
        if (rawData.length > 0) {
          await databaseService.addRecordsBulk(rawData);
          alert(`成功导入 ${rawData.length} 条数据！`);
          loadData();
        }
      } catch (err) {
        console.error("Import failed:", err);
        alert("文件解析或导入失败，请检查格式。");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    const searchStr = searchTerm.toLowerCase();
    
    return Object.values(row).some(val => {
      const cellVal = String(val).toLowerCase();
      if (searchMode === 'exact') return cellVal === searchStr;
      try {
        const regex = new RegExp(searchTerm, 'i');
        return regex.test(cellVal);
      } catch (e) {
        return cellVal.includes(searchStr);
      }
    });
  });

  const displayedData = filteredData.slice(0, pageSize);
  const hasMore = filteredData.length > pageSize;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden animate-in fade-in duration-500">
      {/* Header Controls */}
      <div className="p-6 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setModalMode('add'); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
            >
              <Plus size={18} /> 添加数据
            </button>
            <button 
              onClick={() => { setModalMode('edit'); setIsModalOpen(true); }}
              className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl font-bold text-sm transition-all ${selectedRowIndex !== null ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}
              disabled={selectedRowIndex === null}
            >
              <Edit2 size={18} /> 修改数据
            </button>
            <button 
              onClick={handleDelete}
              className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl font-bold text-sm transition-all ${selectedRowIndex !== null ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}
              disabled={selectedRowIndex === null}
            >
              <Trash2 size={18} /> 删除数据
            </button>
            <div className="w-px h-8 bg-slate-100 mx-1" />
            <button 
              onClick={loadData}
              className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
              title="刷新数据"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              {isImporting ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />} 导入数据
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
            >
              <Download size={18} /> 导出数据
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
            {['Material', 'Environment', 'Source'].map((cat) => (
              <button 
                key={cat}
                onClick={() => toggleCategory(cat as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${visibleCategories[cat as keyof typeof visibleCategories] ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}
              >
                {visibleCategories[cat as keyof typeof visibleCategories] ? <Eye size={14} /> : <EyeOff size={14} />} 
                {cat === 'Material' ? '试件信息' : cat === 'Environment' ? '环境信息' : '来源信息'}
              </button>
            ))}
          </div>

          <div className="h-10 w-[1px] bg-slate-200 mx-2" />

          <div className="flex-1 flex items-center gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="查询关键字: Regex / String..." 
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button onClick={() => setSearchMode('regex')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${searchMode === 'regex' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>模糊查询</button>
              <button onClick={() => setSearchMode('exact')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${searchMode === 'exact' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}>精确查询</button>
            </div>
            <button onClick={() => setSearchTerm('')} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={18} /></button>
          </div>
        </div>
      </div>

      {/* Table Area - Optimized for Persistent Scrollbar */}
      <div className="flex-1 px-6 pb-2 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white rounded-t-[32px] shadow-sm border border-slate-200 overflow-auto custom-scrollbar relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 h-full">
               <RefreshCw size={40} className="animate-spin mb-4" />
               <p className="font-black text-sm uppercase tracking-widest">Loading Database...</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left min-w-full">
              <thead className="bg-slate-50 sticky top-0 z-30 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 w-16">#</th>
                  {COLUMNS.filter(col => col.visible !== false && visibleCategories[col.category as keyof typeof visibleCategories]).map(col => (
                    <th key={col.id} className="px-6 py-4 text-[11px] font-black text-slate-400 tracking-wider border-b border-slate-100 whitespace-nowrap min-w-[120px]">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedData.map((row, idx) => (
                  <tr 
                    key={row.id} 
                    onClick={() => setSelectedRowIndex(idx)}
                    onDoubleClick={() => { setSelectedRowIndex(idx); setModalMode('edit'); setIsModalOpen(true); }}
                    className={`group transition-all border-b border-slate-50 last:border-0 cursor-pointer relative ${selectedRowIndex === idx ? 'bg-brand-100/60 shadow-[inset_6px_0_0_0_#2563eb] z-10' : 'hover:bg-slate-50'}`}
                  >
                    <td className={`px-6 py-4 text-xs transition-all ${selectedRowIndex === idx ? 'font-black text-brand-600' : 'font-bold text-slate-400'}`}>{idx + 1}</td>
                    {COLUMNS.filter(col => col.visible !== false && visibleCategories[col.category as keyof typeof visibleCategories]).map(col => (
                      <td key={col.id} className={`px-6 py-4 text-xs whitespace-nowrap transition-all ${selectedRowIndex === idx ? 'font-black text-slate-900 scale-[1.01]' : 'font-bold text-slate-600'}`}>
                        {row[col.id]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {hasMore && !loading && (
            <div className="p-8 flex justify-center bg-slate-50/50">
              <button 
                onClick={() => setPageSize(prev => prev + 100)}
                className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 text-brand-600 rounded-2xl font-black text-sm hover:bg-brand-50 hover:border-brand-200 transition-all shadow-sm"
              >
                <ChevronDown size={18} />
                加载更多数据 ({filteredData.length - pageSize} 条剩余)
              </button>
            </div>
          )}
          {!loading && filteredData.length === 0 && (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search size={40} className="opacity-20" />
              </div>
              <p className="font-black text-sm uppercase tracking-widest">No matching records found</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-8 py-3 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
        <p className="text-[10px] font-black text-slate-400 tracking-widest">
          当前数据记录数: <span className="text-brand-600">{filteredData.length}</span> / {data.length}
        </p>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
          <span className="text-[10px] font-black text-slate-400 tracking-widest">
            数据库连接状态: {loading ? '正常' : '在线'}
          </span>
        </div>
      </div>

      {/* Editor Modal */}
      <DataEditorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={loadData}
        mode={modalMode}
        initialData={selectedRowIndex !== null ? filteredData[selectedRowIndex] : null}
      />
    </div>
  );
};

export default DataBrowser;
