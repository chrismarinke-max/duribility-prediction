import { useState } from 'react';
import * as XLSX from 'xlsx';
import { invoke } from '@tauri-apps/api/core';
import { 
  FileUp, FileDown, Play, CheckCircle2, 
  Table as TableIcon, Download, Database, RefreshCcw
} from 'lucide-react';

interface PredictionRow {
  [key: string]: any;
  PredictedStrength?: number;
  ErrorRate?: string;
}

const COLUMN_MAPPING: Record<string, string[]> = {
  specimentype: ['specimentype', '试件类型', '类型'],
  cementtype: ['cementtype', '水泥类型', '水泥品种', '水泥类'],
  flyash: ['flyash', '粉煤灰', 'fa', '粉煤灰掺量'],
  slag: ['slag', '矿渣', 's', '矿渣掺量'],
  silicafume: ['silicafume', '硅灰', 'sf', '硅灰掺量'],
  sandratio: ['sandratio', '砂率', 'sr'],
  wc: ['wc', '水灰比', 'w/c'],
  exposuretype: ['exposuretype', '暴露类型', '暴露环境'],
  temperature: ['temperature', '温度', 'temp'],
  humidity: ['humidity', '湿度', 'hum'],
  clconcentration: ['clconcentration', '氯离子浓度', 'cl-'],
  wetdryratio: ['wetdryratio', '干湿比', 'w/d'],
  loadfactor: ['loadfactor', '荷载等级', '应力比', '荷载'],
  source: ['source', '数据来源', '来源'],
  time: ['time', '时间', 't', '龄期'],
  finalstrength: ['finalstrength', '真实强度', '强度实测值', '28d强度', '强度']
};

const fuzzyMatch = (header: string, targetKey: string): boolean => {
  const cleanHeader = header.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
  const aliases = COLUMN_MAPPING[targetKey];
  return aliases.some(alias => {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
    return cleanHeader === cleanAlias || cleanHeader.includes(cleanAlias) || cleanAlias.includes(cleanHeader);
  });
};

const BatchPrediction = () => {
  const [data, setData] = useState<PredictionRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws) as PredictionRow[];
      if (jsonData.length > 0) {
        setHeaders(Object.keys(jsonData[0]));
        setData(jsonData);
      }
    };
    reader.readAsBinaryString(file);
  };

  const runBatchPrediction = async () => {
    if (data.length === 0) return;
    setLoading(true);
    setProgress(0);

    const batchSize = 500;
    const newData = [...data];
    const totalBatches = Math.ceil(data.length / batchSize);

    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const matrix = batch.map(row => {
          const findVal = (key: string) => {
            const header = Object.keys(row).find(h => fuzzyMatch(h, key));
            return header ? Number(row[header]) || 0 : 0;
          };
          return [
            findVal('specimentype'), findVal('cementtype'), findVal('flyash'), 
            findVal('slag'), findVal('silicafume'), findVal('sandratio'), 
            findVal('wc'), findVal('exposuretype'), findVal('temperature'), 
            findVal('humidity'), findVal('clconcentration'), findVal('wetdryratio'), 
            findVal('loadfactor'), findVal('source'), findVal('time'), 
            0, 0, 0 // Padding for model dims
          ];
        });

        const predictions = await invoke<number[]>('run_batch_prediction', { inputMatrix: matrix });
        
        predictions.forEach((pred, idx) => {
          const rowIndex = i + idx;
          const originalRow = newData[rowIndex];
          const realStrengthHeader = Object.keys(originalRow).find(h => fuzzyMatch(h, 'finalstrength'));
          const realStrength = realStrengthHeader ? Number(originalRow[realStrengthHeader]) : null;

          newData[rowIndex] = {
            ...originalRow,
            PredictedStrength: Number(pred.toFixed(2)),
            ErrorRate: realStrength ? `${Math.abs(((pred - realStrength) / realStrength) * 100).toFixed(1)}%` : '-'
          };
        });
        
        setProgress(Math.round(((i / batchSize + 1) / totalBatches) * 100));
      }
      setData(newData);
    } catch (err) {
      console.error(err);
      alert("批量推理失败，请检查数据格式。");
    } finally {
      setLoading(false);
    }
  };

  const exportResult = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Predictions");
    XLSX.writeFile(wb, "BatchPrediction_Result.xlsx");
  };

  const downloadTemplate = () => {
    const templateHeaders = [
      'SpecimenType', 'CementType', 'FlyAsh', 'Slag', 'SilicaFume', 'SandRatio', 
      'WC', 'ExposureType', 'Temperature', 'Humidity', 'ClConcentration', 
      'WetDryRatio', 'LoadFactor', 'Source', 'Time', 'RealStrength'
    ];
    const ws = XLSX.utils.aoa_to_sheet([templateHeaders]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Prediction_Template.xlsx");
  };

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] animate-in fade-in duration-700">
      {/* Header Action Bar */}
      <div className="px-10 py-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm relative z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">批量推理中心</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">High Performance Matrix Inference Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            disabled={loading}
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <Download size={14} /> 下载标准模板
          </button>
          
          <label className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-sm ${
            loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-brand-500 hover:text-brand-600'
          }`}>
            <FileUp size={14} /> 导入数据文件
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={loading} />
          </label>

          {data.length > 0 && (
            <button 
              onClick={runBatchPrediction}
              disabled={loading}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all ${
                loading ? 'bg-slate-400 text-white animate-pulse' : 'bg-brand-600 text-white hover:bg-brand-700 hover:-translate-y-0.5 shadow-brand-100'
              }`}
            >
              {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
              {loading ? `推理中 ${progress}%` : '执行批量推理'}
            </button>
          )}

          {data.some(r => r.PredictedStrength) && (
            <button 
              onClick={exportResult}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
            >
              <FileDown size={14} /> 导出结果报表
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-6 lg:p-10">
        <div className="h-full premium-card flex flex-col overflow-hidden border-none">
          {data.length > 0 ? (
            <div className="flex-1 overflow-auto custom-scrollbar relative">
              <table className="w-full text-left border-collapse min-w-[1500px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50/80 backdrop-blur-md">
                    {headers.map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{h}</th>
                    ))}
                    <th className="px-6 py-4 text-[10px] font-black text-brand-600 uppercase tracking-widest border-b border-brand-100 bg-brand-50/50">预测强度 (MPa)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100 bg-slate-50/50">相对误差 (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      {headers.map(h => (
                        <td key={h} className="px-6 py-4 text-xs font-bold text-slate-600">{row[h] ?? '-'}</td>
                      ))}
                      <td className="px-6 py-4 bg-brand-50/20">
                        {row.PredictedStrength ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-brand-700">{row.PredictedStrength}</span>
                            <CheckCircle2 size={12} className="text-brand-500" />
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 bg-slate-50/20 text-xs font-black text-slate-500">{row.ErrorRate ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-6">
              <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center border-2 border-dashed border-slate-200">
                <TableIcon size={40} className="opacity-20" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-slate-900">等待导入数据文件</p>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">支持 .xlsx / .xls 格式矩阵输入</p>
              </div>
              <button 
                onClick={() => document.querySelector('input[type="file"]')?.dispatchEvent(new MouseEvent('click'))}
                className="px-8 py-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 font-black text-xs hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm"
              >
                立即导入数据
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchPrediction;
