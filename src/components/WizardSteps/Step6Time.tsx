import { useState, useEffect } from 'react';
import { usePredictionStore } from '../../store/predictionStore';
import { Clock, Zap, Cpu, ShieldAlert } from 'lucide-react';

const Step6Time = () => {
  const { predictionData, updateData } = usePredictionStore();
  const [loadMode, setLoadMode] = useState(predictionData.isStressMode || false);
  const [loadType, setLoadType] = useState<'press' | 'tension' | 'flexure'>('press');
  const [loadKn, setLoadKn] = useState(predictionData.stressLoad || 0);
  const [timeSeriesStr, setTimeSeriesStr] = useState(
    predictionData.timePoints?.length 
    ? predictionData.timePoints.join(', ') 
    : '0, 100, 200, 250, 300, 350, 400, 450, 500'
  );

  const TENSILE_STRENGTHS = [0.91, 1.1, 1.27, 1.43, 1.57, 1.71, 1.8, 1.89, 1.96, 2.04, 2.09, 2.14, 2.18, 2.22];

  const calculateHzl = () => {
    if (!loadMode || loadKn <= 0) return 0;
    const fcu0 = predictionData.initialStrength || 40;
    const area = predictionData.specimenArea || 0.01; 
    const stress = loadKn / (area * 1000); 
    
    let hzlValue = 0;
    if (loadType === 'press') {
      hzlValue = 100 * stress / fcu0;
    } else if (loadType === 'tension') {
      const idx = Math.min(Math.max(Math.round(fcu0 / 5) - 3, 0), 13);
      const ft = TENSILE_STRENGTHS[idx];
      hzlValue = 100 * stress / ft;
    } else if (loadType === 'flexure') {
      hzlValue = 1000 * stress / fcu0;
    }
    
    return Number(hzlValue.toFixed(2));
  };

  const currentHzl = calculateHzl();
  const isOverloaded = currentHzl >= 100;

  useEffect(() => {
    const times = timeSeriesStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    updateData({ 
      timePoints: times,
      isStressMode: loadMode,
      stressLoad: loadKn,
      loadFactor: currentHzl / 100, 
      forceType: loadType === 'press' ? '压力' : loadType === 'tension' ? '拉力' : '弯折力'
    });
  }, [timeSeriesStr, loadMode, loadKn, loadType, currentHzl]);

  const shapes = [
    { id: 'press', label: '压力' },
    { id: 'tension', label: '拉力' },
    { id: 'flexure', label: '弯折力' }
  ];

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-0 overflow-hidden">
      <div className="flex items-center gap-4 shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
          <Clock size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Step 4: 时序设定与荷载耦合</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Timeline & Load Coupling Profile</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden pb-2 min-h-0">
        {/* Left: Time Series Input */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group min-h-0">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-brand-600 pointer-events-none">
             <Cpu size={160} />
          </div>
          
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-4 shrink-0">
            <div className="w-2 h-2 bg-brand-600 rounded-full" />
            分析时间序列 (d)
          </h3>
          
          <div className="flex-1 flex flex-col space-y-6 min-h-0">
            <textarea 
              className="flex-1 p-6 font-mono text-2xl font-black tracking-widest leading-relaxed bg-slate-50 border-2 border-slate-100 rounded-[32px] resize-none focus:bg-white text-slate-900 outline-none focus:border-brand-300 transition-all shadow-inner custom-scrollbar"
              value={timeSeriesStr}
              placeholder="0, 28, 90, 180, 365..."
              onChange={(e) => setTimeSeriesStr(e.target.value)}
            />
            <div className="p-4 bg-blue-50/50 rounded-xl flex items-center gap-4 border border-blue-100/50 shrink-0">
              <Cpu size={28} className="text-blue-400 shrink-0" />
              <p className="text-sm font-black text-blue-800 leading-tight">
                请输入以逗号分隔的时间序列（单位：天 d）。引擎将对每一时间节点执行 SVM 模型推理。
              </p>
            </div>
          </div>
        </div>

        {/* Right: Mechanical Load Panel */}
        <div className={`col-span-12 lg:col-span-6 bg-white rounded-[32px] p-8 shadow-sm border-2 flex flex-col relative overflow-hidden transition-all duration-500 min-h-0 ${isOverloaded ? 'border-red-500 bg-red-50/10' : 'border-slate-100'}`}>
          <div className="absolute bottom-0 right-0 p-8 opacity-[0.03] text-brand-600 pointer-events-none">
             <Zap size={160} />
          </div>

          <div className="flex items-center justify-between mb-8 shrink-0">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-4">
              <div className="w-2 h-2 bg-brand-600 rounded-full" />
              机械荷载耦合
            </h3>
            
            <button 
              onClick={() => setLoadMode(!loadMode)}
              className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-3 shadow-lg ${
                loadMode ? 'bg-brand-600 text-white shadow-brand-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Zap size={14} fill={loadMode ? "white" : "none"} />
              {loadMode ? '模式开启' : '模式关闭'}
            </button>
          </div>

          <div className={`space-y-4 flex-1 flex flex-col min-h-0 transition-all ${loadMode ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
            <div className="bg-slate-50 p-2 rounded-2xl flex gap-3 shrink-0">
              {shapes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setLoadType(t.id as any)}
                  className={`flex-1 py-4 text-sm font-black rounded-xl transition-all ${
                    loadType === t.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 shrink-0">
              <label className="text-sm font-black text-slate-500 px-1">外加荷载强度 (kN)</label>
              <div className="relative">
                <input 
                  type="text" 
                  inputMode="decimal"
                  className={`w-full bg-slate-50/50 text-4xl font-black py-5 px-10 border-2 rounded-[32px] transition-all outline-none text-right pr-24 ${
                    isOverloaded ? 'border-red-500 text-red-600' : 'border-slate-100 focus:border-brand-500 text-slate-900'
                  }`}
                  value={loadKn}
                  onChange={(e) => setLoadKn(Number(e.target.value.replace(/[^0-9.]/g, '')))}
                />
                <span className="absolute right-10 bottom-10 text-3xl font-black text-slate-300 italic">kN</span>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex items-center justify-between mt-auto shrink-0">
              <div className="flex flex-col">
                <span className={`text-sm font-black mb-1 ${isOverloaded ? 'text-red-500' : 'text-slate-400'}`}>
                  荷载率 (Hzl Ratio)
                </span>
                <div className="flex items-baseline gap-4">
                  <span className={`text-3xl font-black tracking-tighter ${isOverloaded ? 'text-red-600' : 'text-brand-600'}`}>
                    {currentHzl}%
                  </span>
                  {isOverloaded && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-black animate-pulse">
                      <ShieldAlert size={14} /> 超出极限
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                 <p className="text-xs font-black text-slate-400">换算面积 Area</p>
                 <p className="text-base font-black text-slate-900">{(predictionData.specimenArea || 0).toFixed(4)} m²</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step6Time;
