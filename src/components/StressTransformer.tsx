import { useState, useMemo } from 'react';
import { 
  Zap, Info, Globe2, Clock, Layers, Calculator, RefreshCw, Activity, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { databaseService } from '../services/databaseService';

const StressTransformer = () => {
  const [inputs, setInputs] = useState({
    na: 0.6,
    cl: 0.5,
    mg: 0.05,
    so4: 0.1,
    dryingTemp: 20,
    wettingTime: 12,
    dryingTime: 12,
    strength: 40,
    sideA: 100,
    sideB: 100,
    sideC: 100,
    cycles: 100,
    shape: 'cube' as 'cube' | 'rect' | 'cyl'
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const calculateVS = useMemo(() => {
    const { sideA, sideB, sideC, shape } = inputs;
    if (shape === 'cube') {
      return sideA / 6; // (a^3) / (6a^2) = a/6
    } else if (shape === 'rect') {
      const v = sideA * sideB * sideC;
      const s = 2 * (sideA * sideB + sideB * sideC + sideA * sideC);
      return v / s;
    } else {
      // Cylinder: r=sideA/2, h=sideB
      const r = sideA / 2;
      const h = sideB;
      const v = Math.PI * r * r * h;
      const s = 2 * Math.PI * r * r + 2 * Math.PI * r * h;
      return v / s;
    }
  }, [inputs]);

  const handleCalculate = async () => {
    setLoading(true);
    // Simulate complex math delay
    setTimeout(() => {
      const v = inputs.shape === 'cube' ? Math.pow(inputs.sideA, 3) : 
                (inputs.shape === 'rect' ? inputs.sideA * inputs.sideB * inputs.sideC : 
                 Math.PI * Math.pow(inputs.sideA/2, 2) * inputs.sideB);
      
      const { na, cl, mg, so4, dryingTemp, wettingTime, dryingTime, strength, cycles } = inputs;
      
      const val = databaseService.calculateStress({
        na, cl, mg, so4, dryingTemp, wettingTime, dryingTime, strength, cycles,
        vs: calculateVS,
        v: v
      });
      setResult(val);
      setLoading(false);
      console.info(`[StressTransformer] Calculated stress: ${val} MPa`);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden p-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
          <Zap size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">应力转化模块 (ReduceD)</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Ion Concentration to Crystallization Pressure</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
        {/* Inputs */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-auto pr-4 custom-scrollbar">
          
          {/* Environment Group */}
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-8 text-brand-600">
                <Globe2 size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">环境离子与温度 (Environment)</h3>
             </div>
             <div className="grid grid-cols-4 gap-6">
                {[
                  { id: 'na', label: 'Na⁺ (mol/L)', icon: 'Na' },
                  { id: 'cl', label: 'Cl⁻ (mol/L)', icon: 'Cl' },
                  { id: 'mg', label: 'Mg²⁺ (mol/L)', icon: 'Mg' },
                  { id: 'so4', label: 'SO₄²⁻ (mol/L)', icon: 'SO4' },
                ].map(item => (
                  <div key={item.id} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest px-1">{item.label}</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-lg font-black text-slate-900 focus:border-brand-500 outline-none transition-all"
                      value={inputs[item.id as keyof typeof inputs]}
                      onChange={(e) => setInputs(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
                <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">干燥温度 (℃)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-lg font-black text-slate-900 focus:border-brand-500 outline-none transition-all"
                      value={inputs.dryingTemp}
                      onChange={(e) => setInputs(prev => ({ ...prev, dryingTemp: Number(e.target.value) }))}
                    />
                </div>
                <div className="col-span-2 space-y-2">
                     <label className="text-[10px] font-black text-slate-400 tracking-widest px-1">劣化前强度 (MPa)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-lg font-black text-slate-900 focus:border-brand-500 outline-none transition-all"
                      value={inputs.strength}
                      onChange={(e) => setInputs(prev => ({ ...prev, strength: Number(e.target.value) }))}
                    />
                </div>
             </div>
          </div>

          {/* Regime Group */}
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-8 text-orange-500">
                <Clock size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">循环制度 (Regime)</h3>
             </div>
             <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">润湿时间 (h)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-lg font-black text-slate-900 focus:border-brand-500 outline-none transition-all"
                      value={inputs.wettingTime}
                      onChange={(e) => setInputs(prev => ({ ...prev, wettingTime: Number(e.target.value) }))}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">干燥时间 (h)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-lg font-black text-slate-900 focus:border-brand-500 outline-none transition-all"
                      value={inputs.dryingTime}
                      onChange={(e) => setInputs(prev => ({ ...prev, dryingTime: Number(e.target.value) }))}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">循环总次数</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-lg font-black text-slate-900 focus:border-brand-500 outline-none transition-all"
                      value={inputs.cycles}
                      onChange={(e) => setInputs(prev => ({ ...prev, cycles: Number(e.target.value) }))}
                    />
                </div>
             </div>
          </div>

          {/* Shape Group */}
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-8 text-emerald-500">
                <Layers size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">试件尺寸与形状 (Geometry)</h3>
             </div>
             <div className="flex gap-4 mb-8">
                {['cube', 'rect', 'cyl'].map(s => (
                  <button 
                    key={s}
                    onClick={() => setInputs(prev => ({ ...prev, shape: s as any }))}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inputs.shape === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {s === 'cube' ? '立方体' : (s === 'rect' ? '长方体' : '圆柱体')}
                  </button>
                ))}
             </div>
             <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      {inputs.shape === 'cyl' ? '直径 D (mm)' : '边长 A (mm)'}
                    </label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-lg font-black text-slate-900 focus:border-brand-500 outline-none transition-all"
                      value={inputs.sideA}
                      onChange={(e) => setInputs(prev => ({ ...prev, sideA: Number(e.target.value) }))}
                    />
                </div>
                {inputs.shape !== 'cube' && (
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        {inputs.shape === 'cyl' ? '高度 H (mm)' : '边长 B (mm)'}
                      </label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-lg font-black text-slate-900 focus:border-brand-500 outline-none transition-all"
                        value={inputs.sideB}
                        onChange={(e) => setInputs(prev => ({ ...prev, sideB: Number(e.target.value) }))}
                      />
                  </div>
                )}
                {inputs.shape === 'rect' && (
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">边长 C (mm)</label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-lg font-black text-slate-900 focus:border-brand-500 outline-none transition-all"
                        value={inputs.sideC}
                        onChange={(e) => setInputs(prev => ({ ...prev, sideC: Number(e.target.value) }))}
                      />
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
           <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-brand-950 rounded-[48px] p-10 text-white flex-1 flex flex-col shadow-2xl relative overflow-hidden group border border-white/10">
              <div className="absolute top-0 right-0 p-10 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000">
                <Calculator size={200} />
              </div>
              
              <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] mb-10">应力计算输出 (STRESS OUTPUT)</h3>
              
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                 <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-4"
                      >
                         <RefreshCw size={48} className="animate-spin text-brand-500" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Solving Thermodynamics...</p>
                      </motion.div>
                    ) : result !== null ? (
                       <motion.div 
                        key="result"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                      >
                         <div className="flex items-baseline justify-center gap-3 mb-2">
                           <span className="text-6xl font-black italic tracking-tight bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent px-2">
                              {result}
                           </span>
                           <span className="text-2xl font-black text-brand-500">MPa</span>
                         </div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">结晶压力 (Crystallization Pressure)</p>
                      </motion.div>
                    ) : (
                      <div className="text-slate-700 text-center px-10">
                         <Activity size={60} className="mx-auto mb-6 opacity-20" />
                         <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">请完善左侧参数后<br/>点击下方按钮开始转化</p>
                      </div>
                    )}
                 </AnimatePresence>
              </div>

              <button 
                onClick={handleCalculate}
                disabled={loading}
                className="mt-auto w-full py-5 bg-brand-600 text-white rounded-3xl font-black text-xs hover:bg-brand-700 transition-all shadow-xl shadow-brand-900 flex items-center justify-center gap-3 uppercase tracking-widest group"
              >
                {loading ? '正在计算...' : '开始转化'}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
           </div>

           <div className="bg-white rounded-[32px] p-6 border border-slate-100 flex items-center gap-5 shadow-sm">
              <Info size={24} className="text-brand-500 shrink-0" />
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">
                该应力计算模型基于 Scherer 结晶压力理论，结合干湿循环过程中的盐分累积效应，可作为强度劣化预测的等效荷载输入。
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StressTransformer;
