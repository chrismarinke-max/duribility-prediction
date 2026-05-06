import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList 
} from 'recharts';
import { Download, FileText, ArrowLeft, Save, Image as ImageIcon, CheckCircle2, Loader2, RefreshCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { usePredictionStore } from '../../store/predictionStore';

interface PredictionResult {
  time: number;
  strength: number;
}

const Step7Results = ({ results, onBack }: { results: PredictionResult[], onBack: () => void }) => {
  const [warningLevel, setWarningLevel] = useState(40);
  const [exportState, setExportState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [imageState, setImageState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const chartRef = useRef<HTMLDivElement>(null);
  const { setStep } = usePredictionStore();

  // Sort and format data
  const chartData = [...results]
    .sort((a, b) => a.time - b.time)
    .map(r => ({
      '采样龄期 (d)': r.time,
      '预测强度 (Mpa)': Number(r.strength.toFixed(2))
    }));

  const handleExportExcel = async () => {
    try {
      const selectedPath = await save({
        filters: [{ name: 'Excel 工作表', extensions: ['xlsx'] }],
        defaultPath: '耐久性预测结果.xlsx'
      });

      if (!selectedPath) return;

      setExportState('processing');

      const ws = XLSX.utils.json_to_sheet(chartData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "预测结果");

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      await invoke('save_excel_to_path', { 
        content: Array.from(new Uint8Array(excelBuffer)),
        fullPath: selectedPath 
      });

      setExportState('success');
      setTimeout(() => setExportState('idle'), 3000);
    } catch (error) {
      console.error("Excel export failed:", error);
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  };

  const handleSaveImage = async () => {
    if (!chartRef.current) return;
    
    try {
      const selectedPath = await save({
        filters: [{ name: 'PNG 图片', extensions: ['png'] }],
        defaultPath: '预测结果仿真曲线.png'
      });

      if (!selectedPath) return;

      setImageState('processing');

      const dataUrl = await toPng(chartRef.current, { 
        backgroundColor: '#ffffff',
        quality: 1,
        pixelRatio: 2
      });

      const base64Data = dataUrl.split(',')[1];
      const binaryData = atob(base64Data);
      const uint8Array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }

      await invoke('save_excel_to_path', { 
        content: Array.from(uint8Array),
        fullPath: selectedPath 
      });

      setImageState('success');
      setTimeout(() => setImageState('idle'), 3000);
    } catch (error) {
      console.error("Image save failed:", error);
      setImageState('error');
      setTimeout(() => setImageState('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">耐久性预测结果</h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-wider">Evolution Analysis Summary</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Excel Export Button */}
          <button 
            onClick={handleExportExcel}
            disabled={exportState === 'processing'}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold transition-all shadow-sm ${
              exportState === 'success' ? 'bg-green-500 border-green-600 text-white' :
              exportState === 'error' ? 'bg-red-500 border-red-600 text-white' :
              'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {exportState === 'processing' ? <Loader2 size={14} className="animate-spin" /> : 
             exportState === 'success' ? <CheckCircle2 size={14} /> : <FileText size={14} />}
            {exportState === 'processing' ? '生成中...' : 
             exportState === 'success' ? '已导出 Excel' : 
             exportState === 'error' ? '导出失败' : '导出报表'}
          </button>

          {/* Image Save Button */}
          <button 
            onClick={handleSaveImage}
            disabled={imageState === 'processing'}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold transition-all shadow-sm ${
              imageState === 'success' ? 'bg-green-500 border-green-600 text-white' :
              imageState === 'error' ? 'bg-red-500 border-red-600 text-white' :
              'bg-brand-600 border-brand-500 text-white hover:bg-brand-700'
            }`}
          >
            {imageState === 'processing' ? <Loader2 size={14} className="animate-spin" /> : 
             imageState === 'success' ? <CheckCircle2 size={14} /> : <ImageIcon size={14} />}
            {imageState === 'processing' ? '转换中...' : 
             imageState === 'success' ? '图片已保存' : 
             imageState === 'error' ? '保存失败' : '保存图片'}
          </button>
          
          <button 
            onClick={() => setStep(1)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white hover:bg-slate-900 transition-all shadow-sm"
          >
            <RefreshCcw size={14} /> 重新预测
          </button>
        </div>
      </div>

      {/* NEW VERTICAL LAYOUT */}
      <div className="space-y-6">
        {/* Top: Professional Evolution Chart (Full Width) */}
        <div ref={chartRef} className="content-card p-8 bg-white border-2 border-slate-50 relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-bold text-brand-600 flex items-center gap-2">结果仿真曲线</h3>
              
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                <button 
                  onClick={handleExportExcel}
                  className={`p-1.5 rounded-md transition-all ${
                    exportState === 'success' ? 'text-green-600' : 'text-slate-400 hover:text-brand-600 hover:bg-white'
                  }`}
                >
                  {exportState === 'success' ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                </button>
                <button 
                  onClick={handleSaveImage}
                  className={`p-1.5 rounded-md transition-all ${
                    imageState === 'success' ? 'text-green-600' : 'text-slate-400 hover:text-brand-600 hover:bg-white'
                  }`}
                >
                  {imageState === 'success' ? <CheckCircle2 size={14} /> : <ImageIcon size={14} />}
                </button>
                <button className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white rounded-md transition-all">
                  <Save size={14} />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-3 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-6 shadow-sm group">
              <span className="text-[11px] font-black text-orange-600 tracking-widest">设计强度警戒线</span>
              <div className="relative flex items-center">
                <input 
                  type="number"
                  className="w-16 bg-transparent text-2xl font-black text-orange-600 tracking-tighter border-b-2 border-orange-200 focus:border-orange-500 outline-none text-center"
                  value={warningLevel}
                  onChange={(e) => setWarningLevel(Number(e.target.value))}
                />
                <span className="text-[11px] font-black text-orange-400 ml-2">Mpa</span>
              </div>
            </div>
          </div>

          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData.map(d => ({ time: d['采样龄期 (d)'], strength: d['预测强度 (MPa)'] }))} 
                margin={{ top: 20, right: 40, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }} 
                  tickLine={true} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                  label={{ value: '龄期 (d)', position: 'insideBottom', offset: -15, fontSize: 11, fontWeight: 800, fill: '#94a3b8' }}
                />
                <YAxis 
                  domain={[0, (dataMax: number) => Math.max(60, Math.ceil(dataMax * 1.2))]} 
                  axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }} 
                  tickLine={true} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                  label={{ value: '抗压强度 (Mpa)', angle: -90, position: 'insideLeft', offset: -10, fontSize: 11, fontWeight: 800, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, padding: '12px 16px' }}
                  labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}
                />
                <ReferenceLine y={warningLevel} stroke="#f97316" strokeDasharray="6 6" strokeWidth={2}>
                  <LabelList position="right" value={`设计警示线: ${warningLevel}Mpa`} fill="#f97316" fontSize={11} fontWeight={900} />
                </ReferenceLine>
                <Line 
                  type="monotone" 
                  dataKey="strength" 
                  stroke="#3b82f6" 
                  strokeWidth={5} 
                  connectNulls={true}
                  dot={{ r: 7, fill: '#3b82f6', strokeWidth: 4, stroke: '#fff' }}
                  activeDot={{ r: 9, strokeWidth: 0 }}
                  animationDuration={1500}
                >
                  <LabelList dataKey="strength" position="top" offset={18} style={{ fontSize: 12, fontWeight: 900, fill: '#10b981' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom: Data Matrix Table (Full Width) */}
        <div className="content-card p-0 overflow-hidden bg-white border-2 border-slate-50">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">原始数据矩阵</h3>
              <p className="text-[10px] text-slate-400 font-medium">Original Data Matrix</p>
            </div>
            <div className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">
              {chartData.length} 个数据点
            </div>
          </div>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-50 sticky top-0 z-10">
                  <th className="px-8 py-4 text-[11px] font-black text-slate-400 tracking-widest">采样龄期 (d)</th>
                  <th className="px-8 py-4 text-[11px] font-black text-brand-600 tracking-widest text-right">预测强度 (Mpa)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {chartData.map((r, i) => (
                  <tr key={i} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-8 py-4 text-sm font-bold text-slate-600">{r['采样龄期 (d)']} d</td>
                    <td className="px-8 py-4 text-sm font-black text-brand-600 text-right group-hover:scale-105 transition-transform origin-right">
                      {r['预测强度 (Mpa)'].toFixed(2)} Mpa
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step7Results;
