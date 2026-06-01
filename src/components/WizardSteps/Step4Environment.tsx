import { useState } from 'react';
import { usePredictionStore } from '../../store/predictionStore';
import { Anchor, Droplets, MapPin, Waves, Sun } from 'lucide-react';
import portsData from '../../assets/config/ports.json';
import DecimalInput from '../common/DecimalInput';

const Step4Environment = () => {
  const { predictionData, updateData } = usePredictionStore();
  const [selectedPort, setSelectedPort] = useState('');

  const handlePortChange = (portName: string) => {
    setSelectedPort(portName);
    const port = portsData.find(p => p.name === portName);
    if (port) {
      updateData({
        na: port.ions.na,
        mg: port.ions.mg,
        cl: port.ions.cl,
        so4: port.ions.so4,
        wettingTime: port.env.wet_time,
        wettingTemp: port.env.wet_temp,
        dryingTime: port.env.dry_time,
        dryingTemp: port.env.dry_temp
      });
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Waves size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Step 3: 环境离子与暴露机制</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Environment & Exposure Profile</p>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-full border border-slate-100 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cycle Period</span>
            <span className="text-sm font-black text-slate-900">{(predictionData.wettingTime || 0) + (predictionData.isDryWet ? (predictionData.dryingTime || 0) : 0)} <span className="text-slate-400 text-[10px]">h</span></span>
          </div>
          <div className="w-[1px] h-8 bg-slate-100" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Temp</span>
            <span className="text-sm font-black text-slate-900">
              {predictionData.isDryWet 
                ? ((predictionData.wettingTemp || 0) + (predictionData.dryingTemp || 0)) / 2 
                : (predictionData.wettingTemp || 0)} <span className="text-slate-400 text-[10px]">°C</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden min-h-0 pb-2">
        {/* Left: Environment Ion Control */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden relative group min-h-0">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-blue-600 pointer-events-none">
             <Anchor size={160} />
          </div>

          <div className="p-8 space-y-5 flex-1 flex flex-col min-h-0">
            <div className="shrink-0">
              <h3 className="text-lg font-black text-slate-900 tracking-[0.05em] mb-4 flex items-center gap-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                离子浓度设置
              </h3>

              <div className="space-y-4">
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
                  <select 
                    className="w-full h-12 pl-14 pr-10 input-standard text-base font-black text-slate-700 appearance-none bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 transition-all outline-none"
                    value={selectedPort}
                    onChange={(e) => handlePortChange(e.target.value)}
                  >
                    <option value="">-- 手动设定或从数据库选择 --</option>
                    {portsData.map(port => (
                      <option key={port.name} value={port.name}>{port.name}</option>
                    ))}
                  </select>
                </div>
                {/* Removed the info box per user request */}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 content-start overflow-hidden">
              {[
                { label: 'Na⁺ (mol/L)', key: 'na' },
                { label: 'Mg²⁺ (mol/L)', key: 'mg' },
                { label: 'Cl⁻ (mol/L)', key: 'cl' },
                { label: 'SO₄²⁻ (mol/L)', key: 'so4' }
              ].map((ion) => (
                <div key={ion.key} className="bg-slate-50/80 p-4 rounded-[24px] border border-slate-100 group/ion hover:border-blue-300 transition-all flex flex-col justify-center">
                  <label className="text-base font-black text-slate-800 tracking-tight mb-2 block px-1 group-hover/ion:text-blue-600">{ion.label}</label>
                  <div className="relative">
                    <DecimalInput
                      className="w-full bg-transparent text-3xl font-black text-slate-900 outline-none"
                      value={(predictionData as any)[ion.key] ?? 0}
                      onValueChange={(value) => updateData({ [ion.key]: value })}
                    />
                    <span className="absolute right-0 bottom-1 text-xs font-black text-slate-400 italic">mol/l</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Exposure Mechanism Control */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden relative min-h-0">
          <div className="absolute bottom-0 left-0 p-8 opacity-[0.03] text-brand-600 pointer-events-none">
             <Waves size={200} />
          </div>

          <div className="p-8 space-y-6 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-lg font-black text-slate-900 tracking-[0.05em] flex items-center gap-4">
                <div className="w-2 h-2 bg-brand-600 rounded-full" />
                暴露机制状态
              </h3>

              <div className="flex bg-slate-100 p-1.5 rounded-xl">
                <button 
                  onClick={() => updateData({ isDryWet: true })}
                  className={`px-8 py-2.5 rounded-lg text-sm font-black transition-all ${predictionData.isDryWet ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  干湿循环
                </button>
                <button 
                  onClick={() => updateData({ isDryWet: false })}
                  className={`px-8 py-2.5 rounded-lg text-sm font-black transition-all ${!predictionData.isDryWet ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  全浸泡
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
              {/* Wet Phase Panel */}
              <div className="bg-blue-600 rounded-[32px] p-8 text-white flex flex-col shadow-xl shadow-blue-200/50 relative overflow-hidden group min-h-0">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                <Droplets className="mb-6 opacity-60 shrink-0" size={40} />
                <h4 className="text-xl font-black tracking-[0.1em] mb-4 shrink-0">湿润阶段</h4>
                
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black opacity-60 tracking-widest">时长 (h)</label>
                    <div className="flex items-baseline gap-3">
                      <DecimalInput
                        className="w-full bg-transparent text-4xl font-black outline-none border-b-2 border-white/20 focus:border-white transition-all py-1"
                        value={predictionData.wettingTime ?? 12}
                        onValueChange={(value) => updateData({ wettingTime: value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black opacity-60 tracking-widest">温度 (℃)</label>
                    <div className="flex items-baseline gap-3">
                      <DecimalInput
                        className="w-full bg-transparent text-4xl font-black outline-none border-b-2 border-white/20 focus:border-white transition-all py-1"
                        value={predictionData.wettingTemp ?? 25}
                        onValueChange={(value) => updateData({ wettingTemp: value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dry Phase Panel */}
              <div className={`rounded-[32px] p-8 flex flex-col transition-all relative overflow-hidden group min-h-0 ${
                predictionData.isDryWet 
                ? 'bg-orange-500 text-white shadow-xl shadow-orange-200/50' 
                : 'bg-slate-50 text-slate-300 border border-slate-100 grayscale'
              }`}>
                {predictionData.isDryWet && <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />}
                <Sun className={`mb-6 ${predictionData.isDryWet ? 'opacity-60' : 'opacity-20'} shrink-0`} size={40} />
                <h4 className="text-xl font-black tracking-[0.1em] mb-4 shrink-0">干燥阶段</h4>
                
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black opacity-60 tracking-widest">时长 (h)</label>
                    <div className="flex items-baseline gap-3">
                      <DecimalInput
                        disabled={!predictionData.isDryWet}
                        className="w-full bg-transparent text-4xl font-black outline-none border-b-2 border-white/20 focus:border-white transition-all py-1"
                        value={predictionData.isDryWet ? (predictionData.dryingTime ?? 12) : 0}
                        onValueChange={(value) => updateData({ dryingTime: value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black opacity-60 tracking-widest">温度 (℃)</label>
                    <div className="flex items-baseline gap-3">
                      <DecimalInput
                        disabled={!predictionData.isDryWet}
                        className="w-full bg-transparent text-4xl font-black outline-none border-b-2 border-white/20 focus:border-white transition-all py-1"
                        value={predictionData.isDryWet ? (predictionData.dryingTemp ?? 25) : 0}
                        onValueChange={(value) => updateData({ dryingTemp: value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4Environment;
