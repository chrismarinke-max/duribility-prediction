import { useState, useRef, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label 
} from 'recharts';
import { Settings, FileText, ImageIcon, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import type { DataPoint } from '../../store/predictionStore';
import { calculateDiffusionCoefficient, calculateChlorideConcentration } from '../../utils/math/corrosionUtils';
import { toPng } from 'html-to-image';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import * as XLSX from 'xlsx';

const Step3CorrosionAssessment = ({ results }: { results: DataPoint[] }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [c0, setC0] = useState(0.05);
  const [cs, setCs] = useState(0.5);
  const [x, setX] = useState(50.0);
  const [warningLevel, setWarningLevel] = useState(0.6);
  const [showWarning, setShowWarning] = useState(false);
  
  const [exportState, setExportState] = useState<'idle' | 'processing' | 'success'>('idle');
  const [imageState, setImageState] = useState<'idle' | 'processing' | 'success'>('idle');

  const assessmentData = useMemo(() => results.map(r => {
    const { dt } = calculateDiffusionCoefficient(r.strength);
    const concentration = calculateChlorideConcentration(c0, cs, x, dt, r.time);
    return {
      time: r.time,
      dt: dt,
      concentration: Number(concentration.toFixed(6)),
      displayConc: concentration.toFixed(4)
    };
  }), [results, c0, cs, x]);

  const concentrationAxis = useMemo(() => {
    const values = assessmentData
      .map(item => item.concentration)
      .filter(Number.isFinite);

    if (values.length === 0) {
      return { domain: [0, 1] as [number, number], ticks: [0, 0.25, 0.5, 0.75, 1] };
    }

    let min = Math.min(...values);
    let max = Math.max(...values);

    if (showWarning && warningLevel > 0) {
      min = Math.min(min, warningLevel);
      max = Math.max(max, warningLevel);
    }

    const rawRange = max - min;
    const range = rawRange > 0 ? rawRange : Math.max(Math.abs(max) * 0.02, 0.001);
    const padding = range * 0.08;
    const domainMin = Math.max(0, min - padding);
    const domainMax = max + padding;
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, index) =>
      Number((domainMin + (domainMax - domainMin) * index / (tickCount - 1)).toFixed(6))
    );

    return {
      domain: [domainMin, domainMax] as [number, number],
      ticks
    };
  }, [assessmentData, showWarning, warningLevel]);

  const dtRange = {
    min: assessmentData[0]?.dt.toExponential(3) ?? '--',
    max: assessmentData[assessmentData.length - 1]?.dt.toExponential(3) ?? '--'
  };

  const handleExportExcel = async () => {
    try {
      const selectedPath = await save({
        filters: [{ name: 'Excel 工作表', extensions: ['xlsx'] }],
        defaultPath: '氯离子浓度演化报表.xlsx'
      });
      if (!selectedPath) return;
      setExportState('processing');
      const ws = XLSX.utils.json_to_sheet(assessmentData.map(d => ({
        '劣化时间 t/d': d.time,
        'C(x,t)/%': d.concentration
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "数据记录");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      await invoke('save_excel_to_path', { content: Array.from(new Uint8Array(excelBuffer)), fullPath: selectedPath });
      setExportState('success');
      setTimeout(() => setExportState('idle'), 2000);
    } catch { setExportState('idle'); }
  };

  const handleSaveImage = async () => {
    if (!chartRef.current) return;
    try {
      const selectedPath = await save({
        filters: [{ name: 'PNG 图片', extensions: ['png'] }],
        defaultPath: '氯离子浓度演化曲线.png'
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
    } catch { setImageState('idle'); }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500 pb-20">
      {/* 1. Top Action Bar */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-brand-600 rounded-full" />
            <h2 className="text-lg font-bold text-slate-800">氯离子浓度演化计算结果</h2>
         </div>
         <div className="flex gap-2">
            <button onClick={handleExportExcel} className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all shadow-sm ${exportState === 'success' ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {exportState === 'processing' ? <Loader2 size={14} className="animate-spin" /> : exportState === 'success' ? <CheckCircle2 size={14} /> : <FileText size={14} />}
              导出结果
            </button>
            <button onClick={handleSaveImage} className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all shadow-sm ${imageState === 'success' ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {imageState === 'processing' ? <Loader2 size={14} className="animate-spin" /> : imageState === 'success' ? <CheckCircle2 size={14} /> : <ImageIcon size={14} />}
              保存图片
            </button>
         </div>
      </div>

      {/* 2. Chart Area */}
      <div ref={chartRef} className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm relative">
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs font-black text-brand-600 uppercase tracking-widest">C(x, t) / %</span>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowWarning(!showWarning)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${showWarning ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              {showWarning ? <EyeOff size={14} /> : <Eye size={14} />}
              {showWarning ? '隐藏警戒线' : '显示警戒线'}
            </button>

            <div className={`px-6 py-3 rounded-2xl flex items-center gap-6 shadow-sm transition-all border ${showWarning ? 'bg-red-50 border-red-100 opacity-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
              <span className={`text-[11px] font-black tracking-widest uppercase ${showWarning ? 'text-red-600' : 'text-slate-400'}`}>临界浓度警戒值</span>
              <div className="relative flex items-center">
                <input 
                  type="number" step="0.1"
                  disabled={!showWarning}
                  className={`w-16 bg-transparent text-2xl font-black tracking-tighter border-b-2 outline-none text-center transition-all ${showWarning ? 'text-red-600 border-red-200 focus:border-red-500' : 'text-slate-300 border-slate-100'}`}
                  value={warningLevel}
                  onChange={(e) => setWarningLevel(Number(e.target.value))}
                />
                <span className={`text-[14px] font-black ml-2 ${showWarning ? 'text-red-600' : 'text-slate-300'}`}>%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={assessmentData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="time" 
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }} 
                tickLine={true}
                tick={{ fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
                label={{ value: '时间 t / d', position: 'insideBottom', offset: -10, fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
              />
              <YAxis 
                domain={concentrationAxis.domain}
                ticks={concentrationAxis.ticks}
                tickFormatter={(value: number) => Number(value.toFixed(4)).toString()}
                width={72}
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }} 
                tickLine={true}
                tick={{ fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
              />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }} />
              {showWarning && warningLevel > 0 && (
                <ReferenceLine y={warningLevel} stroke="#ef4444" strokeDasharray="6 6" strokeWidth={3}>
                  <Label value={`临界浓度: ${warningLevel}%`} position="insideTopRight" fill="#ef4444" fontSize={14} fontWeight={900} offset={10} />
                </ReferenceLine>
              )}
              <Line 
                type="monotone" 
                dataKey="concentration" 
                stroke="#10b981" 
                strokeWidth={5} 
                connectNulls={true}
                dot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Parameters Area */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8">
        <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
           <Settings size={16} className="text-brand-600" /> 函数参数
        </h3>
        <div className="space-y-8">
          <p className="text-[11px] font-mono text-slate-400 italic bg-white p-3 rounded-lg border border-slate-100">
            C(x,t) = C0 + (Cs - C0) × (1 - erf(x / (2 × √(D · t)))), D 为扩散系数, t 与 fc(t) 取值区间一致
          </p>
          
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">C0: (%)</label>
              <input 
                type="number" step="0.0001"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-700 focus:border-brand-500 outline-none transition-all shadow-sm"
                value={c0} onChange={(e) => setC0(Number(e.target.value))}
              />
              <span className="text-[10px] text-slate-400 font-bold block mt-2">混凝土初始氯离子浓度 (%)</span>
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">Cs: (%)</label>
              <input 
                type="number" step="0.0001"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-700 focus:border-brand-500 outline-none transition-all shadow-sm"
                value={cs} onChange={(e) => setCs(Number(e.target.value))}
              />
              <span className="text-[10px] text-slate-400 font-bold block mt-2">混凝土表面氯离子浓度 (%)</span>
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">x: (mm)</label>
              <input 
                type="number" step="0.01"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-700 focus:border-brand-500 outline-none transition-all shadow-sm"
                value={x} onChange={(e) => setX(Number(e.target.value))}
              />
              <span className="text-[10px] text-slate-400 font-bold block mt-2">保护层厚度 (mm)</span>
            </div>
            <div className="col-span-3 flex flex-col justify-end pb-3">
              <div className="text-[11px] font-black text-slate-400 font-mono tracking-tighter">
                D(t) 范围: <span className="text-brand-600">[{dtRange.min}, {dtRange.max}]</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table Area - RESTORED */}
      <div className="content-card p-0 overflow-hidden border-2 border-slate-50 bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 tracking-widest">劣化时间 t/d</th>
              <th className="px-8 py-4 text-[10px] font-black text-brand-600 tracking-widest text-right">C(x,t)/%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {assessmentData.map((r, i) => (
              <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-8 py-4 text-sm font-bold text-slate-600">{r.time}</td>
                <td className="px-8 py-4 text-sm font-black text-brand-600 text-right">{r.concentration.toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Step3CorrosionAssessment;
