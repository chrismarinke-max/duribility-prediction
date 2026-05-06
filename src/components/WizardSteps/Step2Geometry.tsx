import { useEffect, useState } from 'react';
import { usePredictionStore } from '../../store/predictionStore';
import { Box, Layers, Database, Ruler, ShieldCheck } from 'lucide-react';

const Step2Geometry = () => {
  const { predictionData, updateData } = usePredictionStore();
  const [selectedType, setSelectedType] = useState<'cube' | 'prism' | 'cylinder'>(
    predictionData.specimenType === 1 ? 'cube' : 
    predictionData.specimenType === 2 ? 'prism' : 
    predictionData.specimenType === 3 ? 'cylinder' : 'cube'
  );
  
  const [dims, setDims] = useState({
    l: predictionData.specimenL || 100,
    w: predictionData.specimenW || 100,
    h: predictionData.specimenH || 100,
    r: predictionData.specimenR || 100, 
  });

  const calculateMetrics = () => {
    let sv = 0;
    let area = 0;
    
    if (selectedType === 'cube') {
      const l = dims.l;
      if (l > 0) {
        sv = 1000 * (l * l * 6) / (l * l * l);
        area = (l * l) / (1000 * 1000);
      }
    } else if (selectedType === 'prism') {
      const { l, w, h } = dims;
      if (l * w * h > 0) {
        sv = 1000 * ((l * w + w * h + h * l) * 2) / (l * w * h);
        area = Math.min(l * w, w * h, h * l) / (1000 * 1000);
      }
    } else if (selectedType === 'cylinder') {
      const d = dims.r; 
      const h = dims.h;
      if (d > 0 && h > 0) {
        const r = d / 2;
        const baseArea = 3.14 * r * r;
        const side = 3.14 * d * h;
        const vol = baseArea * h;
        sv = 1000 * (baseArea * 2 + side) / vol;
        area = baseArea / (1000 * 1000);
      }
    }
    return { sv, area };
  };

  const { sv: svResult, area: areaResult } = calculateMetrics();

  useEffect(() => {
    const { sv, area } = calculateMetrics();
    updateData({ 
      svRatio: sv,
      specimenArea: area,
      specimenType: selectedType === 'cube' ? 1 : selectedType === 'prism' ? 2 : 3,
      specimenL: dims.l,
      specimenW: dims.w,
      specimenH: dims.h,
      specimenR: dims.r
    });
  }, [dims, selectedType]);

  const shapes = [
    { id: 'cube', name: '标准立方体', icon: Box },
    { id: 'prism', name: '非标长方体', icon: Layers },
    { id: 'cylinder', name: '标准圆柱体', icon: Database },
  ];

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-0 overflow-hidden">
      <div className="flex items-center gap-4 shrink-0">
        <div className="p-2 bg-brand-50 rounded-xl">
          <Ruler size={24} className="text-brand-600" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Step 2: 几何形状与基准强度</h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0 pb-2">
        {/* Top: Specimen Geometry (Horizontal) */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col shrink-0">
          <div className="grid grid-cols-12 gap-8">
            {/* Shape Selector */}
            <div className="col-span-12 lg:col-span-3 space-y-4">
              <h3 className="text-lg font-black text-slate-900 mb-4">规格类型</h3>
              <div className="flex flex-col gap-3">
                {shapes.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => setSelectedType(shape.id as any)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group ${
                      selectedType === shape.id 
                        ? 'border-brand-500 bg-brand-600 text-white shadow-lg shadow-brand-100 scale-[1.02]' 
                        : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:border-brand-200'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      selectedType === shape.id ? 'bg-white/20' : 'bg-white shadow-sm'
                    }`}>
                      <shape.icon size={20} />
                    </div>
                    <span className="font-bold text-base">{shape.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions Input */}
            <div className="col-span-12 lg:col-span-6 flex flex-col border-x border-slate-100 px-8">
              <h3 className="text-lg font-black text-slate-900 mb-5">
                尺寸设定 (mm)
              </h3>
              <div className="flex-1 flex flex-col justify-center min-h-0">
                <div className="grid grid-cols-3 gap-6">
                  {selectedType === 'cube' && (
                    <div className="space-y-3 col-span-3">
                      <label className="text-sm font-black text-slate-500 px-1">边长 L</label>
                      <input 
                        type="text"
                        inputMode="decimal"
                        className="w-full h-14 px-6 input-standard text-2xl font-black rounded-xl"
                        value={dims.l}
                        onChange={(e) => setDims({ ...dims, l: Number(e.target.value.replace(/[^0-9.]/g, '')) })}
                      />
                    </div>
                  )}
                  {selectedType === 'prism' && (
                    ['l', 'w', 'h'].map((k) => (
                      <div key={k} className="space-y-3">
                        <label className="text-sm font-black text-slate-500 px-1">{k === 'l' ? '长度 L' : k === 'w' ? '宽度 W' : '高度 H'}</label>
                        <input 
                          type="text"
                          inputMode="decimal"
                          className="w-full h-14 px-6 input-standard text-2xl font-black rounded-xl"
                          value={(dims as any)[k]}
                          onChange={(e) => setDims({ ...dims, [k]: Number(e.target.value.replace(/[^0-9.]/g, '')) })}
                        />
                      </div>
                    ))
                  )}
                  {selectedType === 'cylinder' && (
                    <>
                      <div className="space-y-3 col-span-1">
                        <label className="text-sm font-black text-slate-500 px-1">直径 D</label>
                        <input 
                          type="text"
                          inputMode="decimal"
                          className="w-full h-14 px-6 input-standard text-2xl font-black rounded-xl"
                          value={dims.r}
                          onChange={(e) => setDims({ ...dims, r: Number(e.target.value.replace(/[^0-9.]/g, '')) })}
                        />
                      </div>
                      <div className="space-y-3 col-span-2">
                        <label className="text-sm font-black text-slate-500 px-1">高度 H</label>
                        <input 
                          type="text"
                          inputMode="decimal"
                          className="w-full h-14 px-6 input-standard text-2xl font-black rounded-xl"
                          value={dims.h}
                          onChange={(e) => setDims({ ...dims, h: Number(e.target.value.replace(/[^0-9.]/g, '')) })}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics Display */}
            <div className="col-span-12 lg:col-span-3 flex flex-col justify-center space-y-6">
              <div className="p-5 bg-brand-50 rounded-xl border border-brand-100 flex flex-col">
                <span className="text-sm font-black text-brand-600 mb-1">S/V Ratio</span>
                <span className="text-3xl font-black text-brand-600 tracking-tighter">{svResult.toFixed(2)} <span className="text-sm">m⁻¹</span></span>
              </div>
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                <span className="text-sm font-black text-slate-400 mb-1">Area</span>
                <span className="text-3xl font-black text-slate-700 tracking-tighter">{areaResult.toFixed(4)} <span className="text-sm">m²</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Initial Strength */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex-1 flex flex-col relative overflow-hidden group min-h-0">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-orange-600 pointer-events-none">
             <ShieldCheck size={180} />
          </div>
          
          <div className="flex items-center h-full min-h-0 px-8">
            <div className="flex items-center gap-10 shrink-0 z-10">
              <div className="w-24 h-24 bg-orange-500 rounded-[32px] flex items-center justify-center text-white shadow-lg shadow-orange-100">
                <ShieldCheck size={48} strokeWidth={2.5} />
              </div>
              <div className="max-w-[280px]">
                <h3 className="text-2xl font-black text-orange-600 tracking-tight leading-tight mb-2">
                  初始抗压强度基准 (Mpa)
                </h3>
                <p className="text-sm font-bold text-slate-400 leading-tight">
                  Baseline Strength before exposure
                </p>
              </div>
            </div>

            {/* Center Input */}
            <div className="flex-1 flex items-center justify-center z-10 min-h-0">
              <div className="relative w-full max-w-[360px]">
                <input 
                  type="text"
                  inputMode="decimal"
                  className="w-full bg-transparent text-8xl font-black text-slate-900 text-center outline-none border-b-4 border-orange-100 focus:border-orange-500 transition-all py-2 pr-20"
                  value={predictionData.initialStrength ?? 45}
                  onChange={(e) => updateData({ initialStrength: Number(e.target.value.replace(/[^0-9.]/g, '')) })}
                />
                <span className="absolute right-0 bottom-8 text-4xl font-black text-slate-300 italic">Mpa</span>
              </div>
            </div>

            {/* Right side spacer */}
            <div className="w-[340px] shrink-0 invisible pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2Geometry;
