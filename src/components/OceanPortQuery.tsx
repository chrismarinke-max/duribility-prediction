import { useState, useMemo } from 'react';
import { Search, Globe } from 'lucide-react';
import portData from '../../src-tauri/assets/ports.json';

interface PortInfo {
  name: string;
  ions: { na: number; mg: number; cl: number; so4: number };
  env?: { wet_time: number; wet_temp: number; dry_time: number; dry_temp: number; cycle: number };
  category?: 'PORT' | 'SEA' | 'WORLD';
}

const SEAS: PortInfo[] = [
  { name: "渤海", category: 'SEA', ions: { na: 0.4123, mg: 0.0472, cl: 0.4769, so4: 0.0247 }, env: { wet_time: 6.0, wet_temp: 12.5, dry_time: 6.0, dry_temp: 12.5, cycle: 2.0 } },
  { name: "黄海", category: 'SEA', ions: { na: 0.4379, mg: 0.0504, cl: 0.5094, so4: 0.0264 }, env: { wet_time: 8.0, wet_temp: 15.7, dry_time: 4.0, dry_temp: 15.7, cycle: 2.0 } },
  { name: "东海", category: 'SEA', ions: { na: 0.4659, mg: 0.0536, cl: 0.5420, so4: 0.0281 }, env: { wet_time: 8.0, wet_temp: 20.4, dry_time: 4.0, dry_temp: 20.4, cycle: 2.0 } },
  { name: "南海", category: 'SEA', ions: { na: 0.4939, mg: 0.0568, cl: 0.5747, so4: 0.0298 }, env: { wet_time: 10.0, wet_temp: 25.5, dry_time: 2.0, dry_temp: 25.5, cycle: 2.0 } }
];

const WORLD_SEAS: PortInfo[] = [
  { name: "OPMEC, Tuticorin", category: 'WORLD', ions: { na: 0.7887, mg: 0.0531, cl: 0.9859, so4: 0.0198 } },
  { name: "Malacca Straits", category: 'WORLD', ions: { na: 0.1043, mg: 0.0440, cl: 0.4794, so4: 0.0114 } },
  { name: "Persian Gulf", category: 'WORLD', ions: { na: 0.5478, mg: 0.0667, cl: 0.6592, so4: 0.0344 } },
  { name: "North Sea", category: 'WORLD', ions: { na: 0.5304, mg: 0.0483, cl: 0.4662, so4: 0.0232 } },
  { name: "Arabian Gulf", category: 'WORLD', ions: { na: 0.9101, mg: 0.0958, cl: 1.0394, so4: 0.0533 } },
  { name: "Baltic Sea", category: 'WORLD', ions: { na: 0.1500, mg: 0.0180, cl: 0.1800, so4: 0.0090 } },
  { name: "Marmara Sea", category: 'WORLD', ions: { na: 0.3521, mg: 0.0431, cl: 0.2704, so4: 0.0212 } }
];

const OceanPortQuery = () => {
  const allData = useMemo(() => [
    ...portData.map(p => ({ ...p, category: 'PORT' as const })),
    ...SEAS,
    ...WORLD_SEAS
  ], []);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PortInfo>(allData[0]);

  const filteredPorts = allData.filter(p => p.category === 'PORT' && p.name.includes(search));
  const filteredSeas = allData.filter(p => p.category === 'SEA' && p.name.includes(search));
  const filteredWorld = allData.filter(p => p.category === 'WORLD' && p.name.includes(search));

  return (
    <div className="p-4 lg:p-8 h-full flex flex-col lg:flex-row gap-6 lg:gap-8 animate-in fade-in duration-700 overflow-hidden bg-[#f1f5f9]">
      
      {/* Sidebar - Floating List */}
      <div className="w-full lg:w-[280px] xl:w-[320px] premium-card flex flex-col overflow-hidden shrink-0 border-none">
        <div className="p-5 border-b border-slate-50 bg-slate-50/20">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
            <input 
              type="text" 
              placeholder="搜索海域或港口..."
              className="w-full bg-white border-none rounded-xl pl-11 pr-4 py-2.5 text-[12px] font-bold outline-none shadow-inner shadow-slate-100 focus:ring-2 ring-brand-500/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {[
            { title: '港口基准库', data: filteredPorts },
            { title: '中国四大海域', data: filteredSeas },
            { title: '世界部分海域', data: filteredWorld }
          ].map(section => (
            <section key={section.title}>
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-[11px] font-black text-brand-600 uppercase tracking-widest">{section.title}</span>
              </div>
              <div className="space-y-1">
                {section.data.map(item => (
                  <button
                    key={item.name}
                    onClick={() => setSelected(item)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      selected.name === item.name 
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-100 font-black' 
                      : 'bg-white text-slate-900 font-black hover:bg-slate-50 hover:translate-x-1'
                    }`}
                  >
                    <span className="text-[13px]">{item.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Details Area - Optimized Typography */}
      <div className="flex-1 premium-card p-8 lg:p-12 xl:p-16 overflow-y-auto custom-scrollbar relative border-none">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none text-brand-600">
           <Globe size={400} strokeWidth={0.5} />
        </div>

        <div className="max-w-4xl space-y-12 lg:space-y-16 relative">
          {/* Title Section */}
          <div className="space-y-4 lg:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[11px] font-black uppercase tracking-widest">
               Reference Dictionary
            </div>
            <h2 className="text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tighter leading-tight break-words">
               {selected.name}
            </h2>
            <div className="h-1.5 w-24 bg-brand-600 rounded-full" />
          </div>

          {/* Ion Concentrations */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {[
              { label: 'Na⁺', value: selected.ions.na },
              { label: 'Mg²⁺', value: selected.ions.mg },
              { label: 'Cl⁻', value: selected.ions.cl },
              { label: 'SO₄²⁻', value: selected.ions.so4 }
            ].map(ion => (
              <div key={ion.label} className="group relative">
                 <div className="relative space-y-2">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] lg:text-xs font-black text-slate-400 tracking-widest">{ion.label}</span>
                     <div className="h-[1px] flex-1 bg-slate-100" />
                   </div>
                   <div className="text-2xl lg:text-3xl xl:text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{ion.value.toFixed(4)}</div>
                   <div className="text-[10px] font-bold text-brand-500/60 lowercase">mol/l</div>
                 </div>
              </div>
            ))}
          </div>

          {/* Environmental Cycle Section */}
          <div className="space-y-8 lg:space-y-10">
            <h4 className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-4">
               Environment & Cycle Parameters
               <div className="h-[1px] flex-1 bg-slate-100" />
            </h4>
            
            {selected.env ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase">润湿 (WET)</span>
                  <div className="flex items-baseline gap-1.5">
                     <span className="text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900">{selected.env.wet_time}</span>
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">h / </span>
                     <span className="text-2xl lg:text-3xl font-black text-brand-600">{selected.env.wet_temp}℃</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg uppercase">干燥 (DRY)</span>
                  <div className="flex items-baseline gap-1.5">
                     <span className="text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900">{selected.env.dry_time}</span>
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">h / </span>
                     <span className="text-2xl lg:text-3xl font-black text-rose-500">{selected.env.dry_temp}℃</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg uppercase">循环率</span>
                  <div className="flex items-baseline gap-1.5">
                     <span className="text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900">{selected.env.cycle}</span>
                     <span className="text-xs lg:text-sm font-bold text-slate-400 ml-0.5">次/日</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 lg:p-12 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center text-center space-y-3">
                 <p className="text-xs lg:text-sm font-black text-slate-400 italic">当前海域详细参数补充中...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OceanPortQuery;
