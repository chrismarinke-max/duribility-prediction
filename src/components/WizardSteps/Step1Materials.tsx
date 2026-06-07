import { useState } from 'react';
import { usePredictionStore } from '../../store/predictionStore';
import { Beaker, Calculator, X, FlaskConical, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clusterCement } from '../../utils/math/scientific_utils';
import DecimalInput from '../common/DecimalInput';

const cementTypes = [
  { id: 0, name: '自定义水泥（触发聚类分析）', category: '?', categoryId: 0 },
  { id: 1, name: 'P.I 硅酸盐水泥', category: 'A', categoryId: 1 },
  { id: 2, name: 'P.II 硅酸盐水泥', category: 'B', categoryId: 2 },
  { id: 3, name: 'P.O 普通硅酸盐水泥', category: 'C', categoryId: 3 },
  { id: 4, name: 'P.S.A 矿渣硅酸盐水泥', category: 'D', categoryId: 4 },
  { id: 5, name: 'P.S.B 矿渣硅酸盐水泥', category: 'D', categoryId: 4 },
  { id: 6, name: 'P.P 火山灰硅酸盐水泥', category: 'D', categoryId: 4 },
  { id: 7, name: 'P.F 粉煤灰硅酸盐水泥', category: 'D', categoryId: 4 },
  { id: 8, name: 'P.C 复合硅酸盐水泥', category: 'E', categoryId: 5 },
  { id: 9, name: 'Type I', category: 'B', categoryId: 2 },
  { id: 10, name: 'Type II', category: 'B', categoryId: 2 },
  { id: 11, name: 'Type III', category: 'A', categoryId: 1 },
  { id: 12, name: 'Type IV', category: 'A', categoryId: 1 },
  { id: 13, name: 'Type V', category: 'A', categoryId: 1 },
  { id: 14, name: 'IS (Blast Furnace Slag)', category: 'B', categoryId: 2 },
  { id: 15, name: 'IP (Pozzolanic)', category: 'D', categoryId: 4 },
  { id: 16, name: 'IT (Ternary Blended)', category: 'C', categoryId: 3 },
  { id: 17, name: 'CEM I (Ordinary)', category: 'B', categoryId: 2 },
  { id: 18, name: 'CEM II/S (Slag)', category: 'D', categoryId: 4 },
  { id: 19, name: 'CEM II/D (Silica Fume)', category: 'B', categoryId: 2 },
  { id: 20, name: 'CEM II/P (Pozzolan)', category: 'D', categoryId: 4 },
  { id: 21, name: 'CEM II/Q (Quartzite)', category: '?', categoryId: 0 },
  { id: 22, name: 'CEM II/V (Fly Ash)', category: 'E', categoryId: 5 },
  { id: 23, name: 'CEM II/W (Fly Ash)', category: '?', categoryId: 0 },
  { id: 24, name: 'CEM II/T (Ternary)', category: '?', categoryId: 0 },
  { id: 25, name: 'CEM II/L (Limestone)', category: 'C', categoryId: 3 },
  { id: 26, name: 'CEM II/LL (Limestone)', category: '?', categoryId: 0 },
  { id: 27, name: 'CEM II/M (Composite)', category: '?', categoryId: 0 },
  { id: 28, name: 'CEM III (Blast Furnace)', category: 'D', categoryId: 4 },
  { id: 29, name: 'CEM IV (Pozzolanic)', category: 'E', categoryId: 5 },
  { id: 30, name: 'CEM V (Composite)', category: 'E', categoryId: 5 },
  { id: 31, name: 'JIS Class A', category: 'C', categoryId: 3 },
  { id: 32, name: 'JIS Class B', category: 'E', categoryId: 5 },
  { id: 33, name: 'JIS Class C', category: 'E', categoryId: 5 },
  { id: 34, name: 'JIS HSPC', category: 'A', categoryId: 1 },
  { id: 35, name: 'JIS USPC', category: 'A', categoryId: 1 },
  { id: 36, name: 'JIS OPC', category: 'A', categoryId: 1 },
  { id: 37, name: 'JIS MHPC', category: 'A', categoryId: 1 },
  { id: 38, name: 'JIS LHPC', category: 'A', categoryId: 1 },
  { id: 39, name: 'JIS SRPC', category: 'A', categoryId: 1 },
];

const Step1Materials = () => {
  const { predictionData, updateData } = usePredictionStore();
  const [showCluster, setShowCluster] = useState(false);
  const [pendingCementId, setPendingCementId] = useState(0);
  const [localAdmixtures, setLocalAdmixtures] = useState({
    flyash: 0, slag: 0, silicafume: 0, pozzolan: 0, limestone: 0, shale: 0
  });

  const handleTypeChange = (id: number) => {
    const selected = cementTypes.find(t => t.id === id);
    if (!selected) return;
    if (selected.categoryId === 0) {
      setPendingCementId(selected.id);
      setLocalAdmixtures(current => ({
        ...current,
        flyash: predictionData.flyash,
        slag: predictionData.slag,
        silicafume: predictionData.silicafume
      }));
      setShowCluster(true);
    } else {
      updateData({ cementType: selected.categoryId, selectedCementId: selected.id });
    }
  };

  const runAnalysis = () => {
    const result = clusterCement(localAdmixtures);
    updateData({ cementType: result.id, selectedCementId: pendingCementId });
    setShowCluster(false);
  };

  const getCategoryLetter = (id: number) => ["?", "A", "B", "C", "D", "E"][id] || "?";

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-700 min-h-0 overflow-hidden">
      <div className="flex items-center gap-4 shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
          <Beaker size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Step 1: 材料参数设定</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0 pb-2">
        {/* Col 1: Cement Selection */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col min-h-0">
          <h3 className="text-lg font-black text-slate-900 mb-6 shrink-0">水泥基料设定</h3>
          
          <div className="space-y-6 flex-1 flex flex-col justify-between min-h-0">
            <div className="space-y-3 shrink-0">
              <label className="text-base font-black text-slate-900 px-1">水泥种类</label>
              <div className="relative">
                <select 
                  className="w-full h-12 px-5 input-standard appearance-none text-base font-bold rounded-xl"
                  value={predictionData.selectedCementId ?? 0}
                  onChange={(e) => handleTypeChange(Number(e.target.value))}
                >
                  {cementTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-brand-500">
                  <ChevronRight size={18} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden mt-4 flex-1 min-h-0">
              <Calculator className="absolute top-2 left-2 text-slate-200" size={48} />
              <span className="text-6xl font-black text-brand-600 tracking-tighter z-10 leading-none">
                {getCategoryLetter(predictionData.cementType || 0)}
              </span>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mt-2">AI Result Grade</p>
            </div>
          </div>
        </div>

        {/* Col 2: Admixtures */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col min-h-0">
          <h3 className="text-lg font-black text-slate-900 mb-6 shrink-0">矿物掺合料比重 (%)</h3>
          <div className="space-y-6 flex-1 flex flex-col justify-center overflow-y-auto custom-scrollbar pr-1">
            {([
              { label: '粉煤灰 Fly Ash', key: 'flyash' },
              { label: '矿渣 Slag', key: 'slag' },
              { label: '硅灰 Silica Fume', key: 'silicafume' }
            ] as const).map(item => (
              <div key={item.key} className="flex flex-col space-y-2">
                <label className="text-base font-black text-slate-900 px-1">
                  {item.label}
                </label>
                <div className="relative">
                  <DecimalInput
                    className="w-full h-12 px-5 input-standard text-center text-2xl font-black rounded-xl"
                    value={predictionData[item.key] ?? 0}
                    onValueChange={(value) => updateData({ [item.key]: value })}
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Physics */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col min-h-0">
          <h3 className="text-lg font-black text-slate-900 mb-6 shrink-0">物理力学指标</h3>
          <div className="space-y-10 flex-1 flex flex-col justify-center min-h-0">
            <div className="space-y-3">
              <label className="text-base font-black text-slate-900 px-1">水泥强度 (28d)</label>
              <div className="relative">
                <DecimalInput
                  className="w-full h-16 px-6 input-standard text-4xl font-black text-brand-600 rounded-xl"
                  value={predictionData.cementStrength ?? 42.5}
                  onValueChange={(value) => updateData({ cementStrength: value })}
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">MPa</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-base font-black text-slate-900 px-1">水灰比 (w/c Ratio)</label>
              <div className="relative">
                <DecimalInput
                  className="w-full h-16 px-6 input-standard text-4xl font-black text-brand-600 rounded-xl"
                  value={predictionData.wc ?? 0.4}
                  onValueChange={(value) => updateData({ wc: value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCluster && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowCluster(false)} />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white">
                    <FlaskConical size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">水泥品种聚类分析</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">KNN Cluster Analysis</p>
                  </div>
                </div>
                <button onClick={() => setShowCluster(false)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  {([
                    { label: '粉煤灰 Fly Ash (%)', key: 'flyash' },
                    { label: '矿渣 Slag (%)', key: 'slag' },
                    { label: '硅灰 Silica Fume (%)', key: 'silicafume' },
                    { label: '火山灰 Pozzolan (%)', key: 'pozzolan' },
                    { label: '石灰石 Limestone (%)', key: 'limestone' },
                    { label: '页岩 Shale (%)', key: 'shale' }
                  ] as const).map(item => (
                    <div key={item.key} className="space-y-2">
                      <label className="text-xs font-black text-slate-500 tracking-widest px-1">{item.label}</label>
                      <DecimalInput
                        className="w-full h-12 px-5 input-standard text-center text-lg font-bold rounded-xl"
                        value={localAdmixtures[item.key]}
                        onValueChange={(value) => setLocalAdmixtures({...localAdmixtures, [item.key]: value})}
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={runAnalysis}
                  className="w-full h-16 bg-brand-600 text-white rounded-xl font-black text-lg shadow-xl shadow-brand-100 hover:bg-brand-500 transition-all flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={24} />
                  执行聚类推导
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Step1Materials;
