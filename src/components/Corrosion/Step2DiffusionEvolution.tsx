import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Zap, Calculator } from 'lucide-react';
import type { DataPoint } from '../../store/predictionStore';
import { calculateDiffusionCoefficient } from '../../utils/math/corrosionUtils';

const Step2DiffusionEvolution = ({ results }: { results: DataPoint[] }) => {
  // Calculate D(t) for each time point
  const diffusionData = results.map(r => {
    const { dt } = calculateDiffusionCoefficient(r.strength);
    return {
      time: r.time,
      dt: dt,
      dtLabel: dt.toExponential(4),
      strength: r.strength
    };
  });

  const formatYAxis = (tick: number) => tick.toExponential(2);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-50 rounded-lg">
            <Zap size={20} className="text-brand-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">2. 氯离子扩散系数演化</h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight">
              由混凝土强度演化模型 $f_c(t)$ 映射生成的氯离子扩散系数随时间演变曲线
            </p>
          </div>
        </div>

        <div className="flex gap-2">
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Calculator size={16} className="text-brand-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">模型参数 B</p>
                <p className="text-sm font-black text-slate-700">10.0 (固定)</p>
              </div>
           </div>
        </div>
      </div>

      {/* Main Evolution Chart */}
      <div className="content-card p-8 bg-white border-2 border-slate-50 relative">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xs font-black text-brand-600 uppercase tracking-widest">D(t) 演化曲线 (m²/s)</h3>
           <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-brand-500" /> 扩散系数 D(t)</span>
           </div>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={diffusionData} margin={{ top: 20, right: 60, left: 40, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="time" 
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }} 
                tickLine={true}
                tick={{ fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
                label={{ value: '龄期 (d)', position: 'insideBottom', offset: -10, fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }} 
                tickLine={true}
                tick={{ fontSize: 13, fontWeight: 900, fill: '#0f172a' }}
                label={{ value: 'D(t) (m²/s)', angle: -90, position: 'insideLeft', offset: -25, fontSize: 14, fontWeight: 900, fill: '#0f172a' }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                formatter={(value: any) => [Number(value).toExponential(4), '扩散系数 D(t)']}
              />
              <Line 
                type="monotone" 
                dataKey="dt" 
                stroke="#10b981" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Matrix */}
      <div className="content-card p-0 overflow-hidden border-2 border-slate-50 bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">劣化时间 t (d)</th>
              <th className="px-8 py-4 text-[11px] font-black text-brand-600 uppercase tracking-widest text-right">扩散系数 D(t) (m²/s)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {diffusionData.map((r, i) => (
              <tr key={i} className="hover:bg-brand-50/30 transition-colors group">
                <td className="px-8 py-4 text-sm font-bold text-slate-600">{r.time} d</td>
                <td className="px-8 py-4 text-sm font-black text-brand-600 font-mono text-right">{r.dtLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Step2DiffusionEvolution;
