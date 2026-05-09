import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Waves, Info, Layout, Activity } from 'lucide-react';

const TideTransformer = () => {
  // Inputs matching the old project (Tidetrans.cs)
  const [highTime, setHighTime] = useState(6);
  const [maxHeight, setMaxHeight] = useState(4.5);
  const [lowTime, setLowTime] = useState(0);
  const [minHeight, setMinHeight] = useState(0.5);
  const [pointHeight, setPointHeight] = useState(2.5);

  const cycleTime = useMemo(() => 2 * Math.abs(highTime - lowTime) || 12, [highTime, lowTime]);

  // Calculation Logic replicated from Tidetrans.cs:78-93
  const results = useMemo(() => {
    // Calculation Logic
    if (pointHeight >= maxHeight) return { wet: 0, dry: cycleTime, ratio: '0 : 1' };
    if (pointHeight <= minHeight) return { wet: cycleTime, dry: 0, ratio: '1 : 0' };

    // Tidetrans.cs:78 -> wett1 = (T / Math.PI) * Math.Acos((2 * H - (highh1 + lowh1)) / (highh1 - lowh1));
    const ratio_val = (2 * pointHeight - (maxHeight + minHeight)) / (maxHeight - minHeight);
    const theta = Math.acos(Math.max(-1, Math.min(1, ratio_val)));
    
    const wetDuration = (theta / Math.PI) * cycleTime;
    const dryDuration = cycleTime - wetDuration;
    
    // Simplification logic from Tidetrans.cs:86-91
    let bi = Math.round(wetDuration);
    let li = Math.round(dryDuration);
    let k = 2;
    for (let p = 0; p < li; p++) {
      if (bi % k === 0 && li % k === 0) {
        bi = bi / k;
        li = li / k;
      } else {
        k = k + 1;
      }
    }
    
    return {
      wet: Number(wetDuration.toFixed(1)),
      dry: Number(dryDuration.toFixed(1)),
      ratio: `${bi} : ${li}`
    };
  }, [cycleTime, maxHeight, minHeight, pointHeight]);

  // Chart Option (Visualizing the Tidal Cosine Waveform)
  const chartOption = useMemo(() => {
    const data = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * cycleTime;
      // h = (((highh1 - lowh1) / 2) * Math.Cos(2 * Math.PI * (x1 - hight1) / T) + (highh1 + lowh1) / 2)
      const h = ((maxHeight - minHeight) / 2) * Math.cos(2 * Math.PI * (t - highTime) / cycleTime) + (maxHeight + minHeight) / 2;
      data.push([t.toFixed(2), h.toFixed(2)]);
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        textStyle: { color: '#fff' },
        formatter: (params: any) => `时间: ${params[0].value[0]}h<br/>高度: ${params[0].value[1]}m`
      },
      grid: { left: '8%', right: '8%', top: '15%', bottom: '15%' },
      xAxis: {
        type: 'value',
        name: '时间 (h)',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        min: 0,
        max: cycleTime,
        splitLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        name: '潮位 (m)',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      series: [
        {
          name: '潮汐曲线',
          type: 'line',
          data: data,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, color: '#3b82f6', shadowBlur: 10, shadowColor: 'rgba(59, 130, 246, 0.3)' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
                { offset: 1, color: 'transparent' }
              ]
            }
          },
          markLine: {
            symbol: 'none',
            label: { position: 'end', formatter: '系议高度', color: '#ef4444', fontSize: 10, fontWeight: 'bold' },
            data: [{ yAxis: pointHeight, lineStyle: { color: '#ef4444', type: 'dashed', width: 2 } }]
          }
        }
      ]
    };
  }, [cycleTime, maxHeight, minHeight, highTime, pointHeight]);

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
          <Waves size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">海洋潮汐转化为干湿循环制度</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Tidal to Exposure Regime Converter</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
        {/* Left: Input Controls */}
        <div className="col-span-12 lg:col-span-7 flex flex-col space-y-6">
          <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100 space-y-10">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <Layout size={18} className="text-brand-600" /> 数据输入
              </h3>
              <div className="text-[10px] font-black text-brand-600/40 uppercase tracking-widest">TIDE ANALYZER</div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3 group">
                <label className="text-[11px] font-black text-slate-400 tracking-widest px-1">涨潮时间点 (h)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-2xl font-black text-slate-900 focus:border-brand-500 focus:bg-white outline-none transition-all shadow-inner"
                  value={highTime}
                  onChange={(e) => setHighTime(Number(e.target.value))}
                />
              </div>
              <div className="space-y-3 group">
                <label className="text-[11px] font-black text-slate-400 tracking-widest px-1">平均涨潮高度 (m)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-2xl font-black text-slate-900 focus:border-brand-500 focus:bg-white outline-none transition-all shadow-inner"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(Number(e.target.value))}
                />
              </div>
              <div className="space-y-3 group">
                <label className="text-[11px] font-black text-slate-400 tracking-widest px-1">落潮时间点 (h)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-2xl font-black text-slate-900 focus:border-brand-500 focus:bg-white outline-none transition-all shadow-inner"
                  value={lowTime}
                  onChange={(e) => setLowTime(Number(e.target.value))}
                />
              </div>
              <div className="space-y-3 group">
                <label className="text-[11px] font-black text-slate-400 tracking-widest px-1">平均落潮高度 (m)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-2xl font-black text-slate-900 focus:border-brand-500 focus:bg-white outline-none transition-all shadow-inner"
                  value={minHeight}
                  onChange={(e) => setMinHeight(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="pt-10 border-t border-slate-50">
              <div className="space-y-4 group">
                <label className="text-[11px] font-black text-brand-600 tracking-[0.2em] px-1 flex items-center justify-between">
                  <span>系议点介高度 (m)</span>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Target Height Selection</span>
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1"
                    min={minHeight}
                    max={maxHeight}
                    className="w-full bg-slate-50/50 border-2 border-brand-100/50 rounded-2xl py-5 px-8 text-3xl font-black text-slate-900 focus:border-brand-500 focus:bg-white outline-none transition-all shadow-inner pr-20"
                    value={pointHeight}
                    onChange={(e) => setPointHeight(Number(e.target.value))}
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl">
                    m
                  </div>
                </div>
                <div className="flex justify-between px-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  <span>最低潮位 {minHeight}m</span>
                  <span>最高潮位 {maxHeight}m</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-900 rounded-[24px] flex items-center gap-5 text-white/80 shadow-2xl shadow-slate-200">
              <Info size={24} className="text-brand-400 shrink-0" />
              <p className="text-[11px] font-bold leading-relaxed">
                周期模拟：系统采用高斯余弦波形 (Gaussian Cosine) 拟合真实海域潮位波动。计算结果将反映目标点位在周期内的“相对暴露度”，为干湿循环环境设定提供科学依据。
              </p>
            </div>
          </div>
        </div>

        {/* Right: Visualization & Results */}
        <div className="col-span-12 lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-brand-600 pointer-events-none group-hover:scale-110 transition-transform duration-700">
               <Activity size={200} />
            </div>

            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 border-l-2 border-brand-500 pl-3">Tidal Cosine Waveform</h3>
            <div className="flex-1 min-h-[300px]">
              <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
            </div>

            <div className="mt-10 space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">数据输出 (Output)</h3>
                <div className="h-[1px] flex-1 bg-slate-50 ml-4" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-[24px] text-center border-2 border-slate-50 shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">润湿 (h)</span>
                  <span className="text-3xl font-black text-brand-600 tracking-tighter">{results.wet}</span>
                </div>
                <div className="bg-white p-5 rounded-[24px] text-center border-2 border-slate-50 shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">干燥 (h)</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">{results.dry}</span>
                </div>
                <div className="bg-white p-5 rounded-[24px] text-center border-2 border-slate-50 shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">干湿比</span>
                  <span className="text-lg font-black text-slate-500 tracking-tight">{results.ratio}</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center gap-3">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest text-center">系统已自动优化潮位转换算法</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TideTransformer;
