import { useState, useRef, useMemo, type ChangeEvent } from 'react';
import { 
  Upload, ShieldAlert, Database, 
  AlertCircle, CheckCircle2, Loader2, FileSpreadsheet, Trash2, Download, Play, RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { databaseService } from '../../services/databaseService';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { normalizeCementCategoryForModel } from '../../utils/ai/inferenceService';

interface DataRow {
  [key: string]: any;
  _status?: 'ok' | 'duplicate' | 'anomaly' | 'pending';
  _error?: number;
  _statusText?: string;
  finalstrength_pred?: number;
}

const DataFilter = () => {
  const [fileData, setFileData] = useState<DataRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingDup, setIsCheckingDup] = useState(false);
  const [isCheckingAnomaly, setIsCheckingAnomaly] = useState(false);
  const [maxError, setMaxError] = useState(25);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const total = fileData.length;
    const duplicates = fileData.filter(r => r._status === 'duplicate').length;
    const anomalies = fileData.filter(r => r._status === 'anomaly').length;
    const clean = total - duplicates - anomalies;
    return { total, duplicates, anomalies, clean };
  }, [fileData]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: DataRow[] = XLSX.utils.sheet_to_json(ws);
        
        setFileData(data.map(d => ({ ...d, _status: 'pending', _error: 0, _statusText: 'WAITING' })));
      } catch (err) {
        console.error("Parse error", err);
        alert("文件解析失败，请检查格式。");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const runDuplicateCheck = async () => {
    if (fileData.length === 0) return;
    setIsCheckingDup(true);
    try {
      const duplicateFlags = await databaseService.checkDuplicatesBulk(fileData);
      const updatedData: DataRow[] = fileData.map((row, idx) => {
        if (duplicateFlags[idx]) {
          return { ...row, _status: 'duplicate', _statusText: 'DUPLICATE' } as DataRow;
        }
        const status = row._status === 'pending' ? 'ok' : row._status;
        const text = row._status === 'pending' ? 'VALID' : row._statusText;
        return { ...row, _status: status, _statusText: text } as DataRow;
      });
      setFileData(updatedData);
    } catch (e) {
      console.error("Duplicate check failed", e);
    }
    setIsCheckingDup(false);
  };

  const runAnomalyDetection = async () => {
    if (fileData.length === 0) return;
    setIsCheckingAnomaly(true);
    try {
      const aiVectors = fileData.map(row => [
        normalizeCementCategoryForModel(row.jlcement || 1),
        Number(row.cementstrength || 0),
        Number(row.wc || 0),
        Number(row.specificarea || 0),
        Number(row.initialstrength || 0),
        Number(row.flyash || 0),
        Number(row.slag || 0),
        Number(row.silicafume || 0),
        Number(row.Na || 0),
        Number(row.Mg || 0),
        Number(row.Cl || 0),
        Number(row.SO4 || 0),
        Number(row.wettingtime || 0),
        Number(row.wettingtemp || 0),
        Number(row.dryingtime || 0),
        Number(row.dryingtemp || 0),
        Number(row.cycle || 0),
        Number(row.degradationtime || 0)
      ]);

      const predictions = await databaseService.runBatchInference(aiVectors);

      const updatedData: DataRow[] = fileData.map((row, idx) => {
        if (row._status === 'duplicate') return row;
        
        const pred = predictions[idx];
        const real = Number(row.finalstrength || 0);
        const error = real !== 0 ? (Math.abs(pred - real) / real) * 100 : 0;
        
        const isAnomaly = error > maxError;
        const result: DataRow = { 
          ...row, 
          _status: isAnomaly ? 'anomaly' : 'ok', 
          _statusText: isAnomaly ? 'ERROR' : 'VALID',
          _error: error,
          finalstrength_pred: pred
        };
        return result;
      });

      setFileData(updatedData);
    } catch (e) {
      console.error("Anomaly check failed", e);
    }
    setIsCheckingAnomaly(false);
  };

  /**
   * NATIVE SAVE DIALOG EXPORT
   */
  const handleExport = async () => {
    if (fileData.length === 0) return;

    try {
      const timestamp = new Date().getTime();
      const defaultPath = `异常数据筛选报告_${timestamp}.xlsx`;

      // 1. Open native save dialog
      const filePath = await save({
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: defaultPath
      });

      if (!filePath) return; // User cancelled

      // 2. Prepare export data
      const exportData = fileData.map(row => {
        const { _status, _statusText, _error, finalstrength_pred, ...rest } = row;
        return {
          ...rest,
          'PRED_STRENGTH': finalstrength_pred ? Number(finalstrength_pred).toFixed(2) : '--',
          'ERROR_RATE': _error ? `${_error.toFixed(2)}%` : '0%',
          'VALIDATION_STATUS': _statusText
        };
      });

      // 3. Generate XLSX Buffer
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detection Report");
      
      // Get output as ArrayBuffer/Uint8Array
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const uint8Array = new Uint8Array(wbout);

      // 4. Invoke native Rust command to write the file
      await invoke('save_excel_to_path', { 
        content: Array.from(uint8Array), // Convert to array for serde
        fullPath: filePath 
      });

      alert("文件导出成功！");
    } catch (err) {
      console.error("Export failed", err);
      alert(`导出失败: ${err}`);
    }
  };


  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-700">
      {/* Top Action Bar */}
      <div className="p-8 pb-0">
        <div className="bg-white rounded-[40px] p-4 flex items-center justify-between shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 px-6 py-3 bg-[#4285f4] text-white rounded-2xl font-black text-xs hover:bg-[#3367d6] transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 导入 EXCEL
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-[#e8eaed] text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all">
              <Download size={16} className="text-emerald-500" /> 下载标准模板
            </button>
            
            <div className="h-8 w-px bg-slate-100 mx-2" />

            <div className="flex items-center gap-2 bg-slate-50/50 p-1.5 rounded-[22px] border border-slate-100">
              <button 
                onClick={runDuplicateCheck}
                disabled={isCheckingDup || fileData.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-[#e8eaed] text-slate-600 rounded-[18px] font-black text-xs hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
              >
                {isCheckingDup ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <RefreshCcw size={16} className="text-blue-500" />} 查重校验
              </button>
              
              <div className="flex items-center gap-3 bg-white border border-[#ffe0bd] p-1.5 rounded-[18px] px-5 h-[38px]">
                <span className="text-[10px] font-black text-[#8c5a2b] uppercase tracking-widest">% 容许偏差</span>
                <input 
                  type="number" 
                  value={maxError}
                  onChange={(e) => setMaxError(parseInt(e.target.value))}
                  className="w-8 text-center font-black text-[#8c5a2b] bg-transparent outline-none text-xs"
                />
              </div>

              <button 
                onClick={runAnomalyDetection}
                disabled={isCheckingAnomaly || fileData.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#f1f6ff] border border-[#d2e3fc] text-[#1a73e8] rounded-[18px] font-black text-xs hover:bg-[#e8f0fe] transition-all disabled:opacity-50"
              >
                {isCheckingAnomaly ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />} 异常数据筛选
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">

            <button 
              onClick={handleExport}
              disabled={fileData.length === 0}
              className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <Download size={16} /> 导出结果
            </button>
            <button className="p-3 bg-[#fde8e8] text-[#f05252] rounded-2xl hover:bg-[#fbd5d5] transition-all" onClick={() => setFileData([])}>
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="px-8 mt-8">
        <div className="grid grid-cols-4 gap-8">
          {[
            { label: '导入总记录', val: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', icon: Database },
            { label: '命中重复项', val: stats.duplicates, color: 'text-orange-500', bg: 'bg-orange-50', icon: AlertCircle },
            { label: '异常数据拦截', val: stats.anomalies, color: 'text-red-500', bg: 'bg-red-50', icon: ShieldAlert },
            { label: '净符号入量', val: stats.clean, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
          ].map((s, i) => (
            <div key={i} className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm flex items-center gap-8 group hover:shadow-md transition-all">
               <div className={`w-20 h-20 ${s.bg} ${s.color} rounded-[32px] flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <s.icon size={40} />
               </div>
               <div>
                  <p className="text-[12px] font-black text-slate-400 tracking-widest mb-1">{s.label}</p>
                  <h4 className={`text-4xl font-black tracking-tighter ${s.color}`}>{s.val.toLocaleString()}</h4>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Container - Optimized for Persistent Scrollbar */}
      <div className="flex-1 px-8 pb-4 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-auto custom-scrollbar relative">
          <AnimatePresence>
            {isImporting && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6 border border-blue-100 shadow-lg shadow-blue-50">
                  <Loader2 size={40} className="animate-spin text-blue-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">正在解析 EXCEL 文件</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Please Wait...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="bg-white sticky top-0 z-20 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                <tr>
                  <th className="px-10 py-6 text-left text-[11px] font-black text-slate-400 tracking-widest w-40">Status 指示</th>
                  <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 tracking-widest">Title 标题/文献溯源</th>
                  <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 tracking-widest">W/C</th>
                  <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 tracking-widest">Cement (MPa)</th>
                  <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 tracking-widest">Time (d)</th>
                  <th className="px-10 py-6 text-left text-[11px] font-black text-slate-400 tracking-widest">Consistency 校验</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {fileData.length === 0 && !isImporting ? (
                  <tr>
                    <td colSpan={6} className="py-40 text-center">
                       <div className="flex flex-col items-center gap-4 text-slate-200">
                          <FileSpreadsheet size={100} strokeWidth={1} />
                          <p className="font-black uppercase tracking-[0.4em] text-sm">Please Import Data to Start</p>
                       </div>
                    </td>
                  </tr>
                ) : (
                  fileData.map((row, i) => (
                    <motion.tr 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.005 }}
                      key={i} 
                      className="group hover:bg-[#fbfcfe] transition-all"
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                           <div className={`w-3 h-3 rounded-full ${
                             row._status === 'duplicate' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 
                             row._status === 'anomaly' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                             row._status === 'pending' ? 'bg-slate-300' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                           }`} />
                           <span className={`text-[11px] font-black tracking-widest ${
                             row._status === 'duplicate' ? 'text-orange-500' : 
                             row._status === 'anomaly' ? 'text-red-500' : 
                             row._status === 'pending' ? 'text-slate-400' : 'text-emerald-500'
                           }`}>
                             {row._statusText}
                           </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col max-w-md">
                           <span className="text-[13px] font-bold text-slate-900 line-clamp-1">"{row.title || 'Untitled Record'}"</span>
                           <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">
                             查询文献：{row.source || 'Unknown'} / {row.author || 'Staff'}
                           </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[13px] font-black text-slate-500">{row.wc || '0.0'}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[13px] font-black text-slate-500">{row.cementstrength || '0.0'}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[13px] font-black text-slate-500">{row.degradationtime || '0'}</span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="w-40">
                          <div className="flex justify-between items-center mb-2">
                             <span className={`text-[10px] font-black ${row._error! > maxError ? 'text-red-500' : 'text-emerald-500'}`}>
                               {row._error?.toFixed(1)}%
                             </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div 
                               className={`h-full transition-all duration-700 ease-out ${row._error! > maxError ? 'bg-red-500' : 'bg-emerald-500'}`} 
                               style={{ width: `${Math.min(100, row._error || 0)}%` }} 
                             />
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataFilter;
