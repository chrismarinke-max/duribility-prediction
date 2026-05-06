import { useState } from 'react';
import { Beaker, Calculator, CheckCircle2, FlaskConical, RefreshCcw } from 'lucide-react';
import { clusterCement } from '../utils/math/scientific_utils';

const CementClusterer = () => {
  const [admixtures, setAdmixtures] = useState({
    flyash: 0,
    slag: 0,
    silicafume: 0,
    pozzolan: 0,
    limestone: 0,
    shale: 0
  });

  const [result, setResult] = useState<{ type: string; id: number } | null>(null);

  const handleInputChange = (key: keyof typeof admixtures, value: string) => {
    const num = Number(value.replace(/[^0-9.]/g, ''));
    setAdmixtures(prev => ({ ...prev, [key]: num }));
  };

  const handleAnalyze = () => {
    const res = clusterCement(admixtures);
    setResult(res);
  };

  const handleReset = () => {
    setAdmixtures({
      flyash: 0,
      slag: 0,
      silicafume: 0,
      pozzolan: 0,
      limestone: 0,
      shale: 0
    });
    setResult(null);
  };

  const inputs = [
    { label: '粉煤灰 (Fly Ash)', key: 'flyash' },
    { label: '矿渣 (Slag)', key: 'slag' },
    { label: '硅灰 (Silica Fume)', key: 'silicafume' },
    { label: '火山灰 (Pozzolan)', key: 'pozzolan' },
    { label: '石灰石 (Limestone)', key: 'limestone' },
    { label: '页岩 (Shale)', key: 'shale' }
  ];

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
            <FlaskConical size={30} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">CEMENT CLUSTERER 水泥特征码标定</h2>
            <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <Calculator size={14} className="text-emerald-500" />
              KNN 近邻回归算法 (Standardized Cluster.cs)
            </p>
          </div>
        </div>

        <button 
          onClick={handleReset}
          className="flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all border border-slate-200"
        >
          <RefreshCcw size={16} />
          重置参数
        </button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-8 min-h-0">
        {/* Left: Input Grid */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-[40px] p-10 shadow-sm border border-slate-100 flex flex-col min-h-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-emerald-600 pointer-events-none">
             <Beaker size={240} />
          </div>

          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-4">
            <div className="w-2 h-2 bg-emerald-600 rounded-full" />
            矿物掺合料组分分析 (%)
          </h3>

          <div className="grid grid-cols-2 gap-x-10 gap-y-8 flex-1 content-start">
            {inputs.map((item) => (
              <div key={item.key} className="space-y-3 group">
                <label className="text-base font-black text-slate-700 px-1 transition-colors group-focus-within:text-emerald-600 uppercase tracking-tight">
                  {item.label}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    inputMode="decimal"
                    className="w-full h-16 px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                    value={(admixtures as any)[item.key] || ''}
                    placeholder="0"
                    onChange={(e) => handleInputChange(item.key as any, e.target.value)}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">%</span>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleAnalyze}
            className="w-full h-20 mt-10 bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-2xl shadow-emerald-200 hover:bg-emerald-500 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
          >
            <CheckCircle2 size={28} className="group-hover:scale-110 transition-transform" />
            执行聚类分析引擎
          </button>
        </div>

        {/* Right: Result Visualization */}
        <div className="col-span-12 lg:col-span-5 flex flex-col space-y-6 min-h-0">
          <div className="flex-1 bg-white rounded-[40px] p-10 shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
             {/* Gradient Background Pattern */}
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #10b981 1px, transparent 0)', backgroundSize: '32px 32px' }} />
             
             <div className="text-center space-y-8 z-10 w-full">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Analysis Result</h3>
               
               <div className="relative inline-flex items-center justify-center">
                 <div className="w-56 h-56 rounded-full bg-emerald-50 border-8 border-white shadow-2xl flex items-center justify-center relative">
                    <span className={`text-[100px] font-black tracking-tighter leading-none ${result ? 'text-emerald-600 animate-in zoom-in-50 duration-500' : 'text-slate-100'}`}>
                      {result?.type || '?'}
                    </span>
                 </div>
                 {/* Decorative rings */}
                 <div className="absolute inset-0 -m-4 border border-emerald-100 rounded-full animate-[spin_10s_linear_infinite]" />
                 <div className="absolute inset-0 -m-8 border border-emerald-50 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-50" />
               </div>

               <div className="space-y-3 px-8">
                 <p className="text-2xl font-black text-slate-900">
                   {result ? `判别结果：${result.type} (Standard)` : '等待数据输入...'}
                 </p>
                 <p className="text-base text-slate-500 font-medium leading-relaxed">
                   {result 
                    ? `根据欧氏距离矩阵算法，该配比特征在 6 维空间中最接近标准 ${result.type} 类水泥特征码。` 
                    : '请输入各个矿物掺合料的百分比，点击下方按钮启动 KNN 聚类引擎。'}
                 </p>
               </div>
             </div>
          </div>

          {/* Stats/Detail Card */}
          <div className="h-32 bg-slate-900 rounded-[32px] p-8 flex items-center justify-between text-white shadow-2xl">
             <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Calculator size={24} className="text-emerald-400" />
                </div>
                <div>
                   <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Total Admixture</p>
                   <p className="text-2xl font-black text-white">
                     {Object.values(admixtures).reduce((a, b) => a + b, 0).toFixed(1)} <span className="text-emerald-400 text-sm">%</span>
                   </p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Algorithm</p>
                <p className="text-sm font-black text-emerald-400">Euclidean Distance Matrix</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CementClusterer;
