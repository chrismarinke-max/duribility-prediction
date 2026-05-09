import { useRef, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList 
} from 'recharts';
import { Activity, Table as TableIcon, FileText, ImageIcon, CheckCircle2, Loader2 } from 'lucide-react';
import type { DataPoint } from '../../store/predictionStore';
import { toPng } from 'html-to-image';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import * as XLSX from 'xlsx';

const Step1StrengthReview = ({ results }: { results: DataPoint[] }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exportState, setExportState] = useState<'idle' | 'processing' | 'success'>('idle');
  const [imageState, setImageState] = useState<'idle' | 'processing' | 'success'>('idle');

  const chartData = results.map(r => ({
    time: r.time,
    strength: Number(r.strength.toFixed(2)),
    upper: Number((r.strength * 1.1192).toFixed(2)),
    lower: Number((r.strength * 0.9494).toFixed(2))
  }));

  const handleExportExcel = async () => {
    try {
      const selectedPath = await save({
        filters: [{ name: 'Excel 工作表', extensions: ['xlsx'] }],
        defaultPath: '混凝土强度回顾报表.xlsx'
      });
      if (!selectedPath) return;

      setExportState('processing');
      const ws = XLSX.utils.json_to_sheet(chartData.map(d => ({
        '劣化时间 (d)': d.time,
        '混凝土抗压强度 (MPa)': d.strength,
        '上偏差强度 (+11.92%)/MPa': d.upper,
        '下偏差强度 (-5.06%)/MPa': d.lower
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "强度数据");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      await invoke('save_excel_to_path', { 
        content: Array.from(new Uint8Array(excelBuffer)),
        fullPath: selectedPath 
      });

      setExportState('success');
      setTimeout(() => setExportState('idle'), 2000);
    } catch (err) {
      console.error(err);
      setExportState('idle');
    }
  };

  const handleSaveImage = async () => {
    if (!chartRef.current) return;
    try {
      const selectedPath = await save({
        filters: [{ name: 'PNG 图片', extensions: ['png'] }],
        defaultPath: '混凝土强度回顾曲线.png'
      });
      if (!selectedPath) return;

      setImageState('processing');
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const base64Data = dataUrl.split(',')[1];
      const binaryData = atob(base64Data);
      const uint8Array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }
      await invoke('save_excel_to_path', { content: Array.from(uint8Array), fullPath: selectedPath });

      setImageState('success');
      setTimeout(() => setImageState('idle'), 2000);
    } catch (err) {
      console.error(err);
      setImageState('idle');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Activity size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">1. 混凝土强度劣化回顾</h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight">基于 SVM 推理生成的混凝土抗压强度演化曲线</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleExportExcel}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold transition-all shadow-sm ${
              exportState === 'success' ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {exportState === 'processing' ? <Loader2 size={14} className="animate-spin" /> : 
             exportState === 'success' ? <CheckCircle2 size={14} /> : <FileText size={14} />}
            {exportState === 'processing' ? '处理中...' : exportState === 'success' ? '已导出结果' : '导出结果'}
          </button>
          <button 
            onClick={handleSaveImage}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold transition-all shadow-sm ${
              imageState === 'success' ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {imageState === 'processing' ? <Loader2 size={14} className="animate-spin" /> : 
             imageState === 'success' ? <CheckCircle2 size={14} /> : <ImageIcon size={14} />}
            {imageState === 'processing' ? '处理中...' : imageState === 'success' ? '图片已保存' : '保存图片'}
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div ref={chartRef} className="content-card p-10 bg-white border-2 border-slate-50 relative">
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={{ stroke: '#1e293b', strokeWidth: 2 }} 
                  tickLine={true} 
                  tick={{ fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
                  label={{ value: '龄期 (d)', position: 'insideBottom', offset: -10, fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
                />
                <YAxis 
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]} 
                  axisLine={{ stroke: '#1e293b', strokeWidth: 2 }} 
                  tick={{ fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
                  label={{ value: '抗压强度 (MPa)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
                />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
              />
              {/* Deviation Lines */}
              <Line type="monotone" dataKey="upper" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} dot={false} animationDuration={1000} />
              <Line type="monotone" dataKey="lower" stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={2} dot={false} animationDuration={1000} />
              
              {/* Main Line */}
              <Line 
                type="monotone" 
                dataKey="strength" 
                stroke="#10b981" 
                strokeWidth={5} 
                dot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }}
                animationDuration={1000}
              >
                <LabelList dataKey="strength" position="top" offset={15} style={{ fontSize: 11, fontWeight: 900, fill: '#10b981' }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="content-card p-0 overflow-hidden border-2 border-slate-50">
        <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
          <TableIcon size={14} className="text-slate-400" />
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">数据细节矩阵</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">劣化时间 (d)</th>
                <th className="px-6 py-4 text-[10px] font-black text-green-600 uppercase tracking-widest">抗压强度 (MPa)</th>
                <th className="px-6 py-4 text-[10px] font-black text-red-500 uppercase tracking-widest">上偏差强度 (+11.92%)/MPa</th>
                <th className="px-6 py-4 text-[10px] font-black text-blue-500 uppercase tracking-widest">下偏差强度 (-5.06%)/MPa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {chartData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{r.time}</td>
                  <td className="px-6 py-4 text-sm font-black text-green-600">{r.strength.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-red-400">{r.upper.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-400">{r.lower.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Step1StrengthReview;
