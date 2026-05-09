import { useState, useEffect, type ChangeEvent } from 'react';
import { X, Save, RotateCcw, Calculator, Layers, Beaker, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { databaseService } from '../../services/databaseService';

interface DataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
  mode: 'add' | 'edit';
}

const DataEditorModal: React.FC<DataEditorModalProps> = ({ isOpen, onClose, onSave, initialData, mode }) => {
  const [formData, setFormData] = useState<any>({});
  const [specimenTab, setSpecimenTab] = useState<'立方体' | '长方体' | '圆柱体'>('立方体');
  const [dims, setDims] = useState({ x: 100, y: 100, z: 100, d: 100, h: 100 });
  const [cementOptions, setCementOptions] = useState<string[]>([]);
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData(initialData);
        setSpecimenTab(initialData.specimentype || '立方体');
        // Parse dims from specimenscale (e.g. "100*100*100" or "D=100 H=100")
        const scale = initialData.specimenscale || '';
        if (initialData.specimentype === '圆柱体') {
          const match = scale.match(/D=(\d+) H=(\d+)/);
          if (match) setDims(prev => ({ ...prev, d: Number(match[1]), h: Number(match[2]) }));
        } else {
          const parts = scale.split('*').map(Number);
          if (parts.length >= 1) setDims(prev => ({ ...prev, x: parts[0], y: parts[1] || parts[0], z: parts[2] || parts[0] }));
        }
      } else {
        setFormData({
          cement: 'P.I',
          cementstrength: 42.5,
          wc: 0.45,
          sandratio: 35,
          flyash: 0,
          slag: 0,
          silicafume: 0,
          initialstrength: 45,
          Na: 0, Mg: 0, Cl: 0, SO4: 0,
          wettingtime: 24, wettingtemp: 20,
          dryingtime: 24, dryingtemp: 20,
          degradationtime: 365,
          finalstrength: 40,
          source: '文献',
          specimentype: '立方体'
        });
      }
      
      // Load dropdown options
      databaseService.getDictionary('cement').then(setCementOptions);
      databaseService.getDictionary('source').then(setSourceOptions);
    }
  }, [isOpen, mode, initialData]);

  // Recalculate Specific Area and Scale string
  useEffect(() => {
    let vs = 0;
    let scale = '';
    const { x, y, z, d, h } = dims;

    if (specimenTab === '立方体') {
      vs = 6000 / x;
      scale = `${x}*${x}*${x}`;
    } else if (specimenTab === '长方体') {
      vs = 1000 * ((x * y + x * z + y * z) * 2) / (x * y * z);
      scale = `${x}*${y}*${z}`;
    } else if (specimenTab === '圆柱体') {
      vs = 1000 * (3.14 * (d / 2) ** 2 * 2 + (3.14 * d) * h) / (3.14 * (d / 2) ** 2 * h);
      scale = `D=${d} H=${h}`;
    }

    setFormData((prev: any) => ({
      ...prev,
      specificarea: vs.toFixed(4),
      specimenscale: scale,
      specimentype: specimenTab
    }));
  }, [dims, specimenTab]);

   const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
     const { name, value } = e.target;
     setFormData((prev: any) => ({ ...prev, [name]: value }));
   };

  const handleSubmit = async () => {
    try {
      if (mode === 'add') {
        const jlcement = await databaseService.getCementCategory(formData.cement);
        await databaseService.addRecord({ ...formData, jlcement });
      } else {
        const { id, ...updateData } = formData;
        await databaseService.updateRecord(id, updateData);
      }
      onSave();
      onClose();
    } catch (err) {
      alert('保存失败: ' + err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white w-full max-w-5xl rounded-[40px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-brand-600 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-xl">
              <PlusIcon mode={mode} />
            </div>
            <h3 className="text-lg font-black tracking-tight">{mode === 'add' ? '新增科研数据录入' : '编辑科研数据'}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-12 gap-8">
            
            {/* Section 1: Materials */}
            <div className="col-span-12">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="text-brand-500" size={18} />
                <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em]">材料与基本参数</h4>
              </div>
              <div className="grid grid-cols-4 gap-6 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                <Field label="水泥种类" name="cement" type="select" options={cementOptions} value={formData.cement} onChange={handleChange} />
                <Field label="28d强度/MPa" name="cementstrength" type="number" value={formData.cementstrength} onChange={handleChange} />
                <Field label="水灰比" name="wc" type="number" value={formData.wc} onChange={handleChange} />
                <Field label="砂率/%" name="sandratio" type="number" value={formData.sandratio} onChange={handleChange} />
                <Field label="粉煤灰/%" name="flyash" type="number" value={formData.flyash} onChange={handleChange} />
                <Field label="矿渣/%" name="slag" type="number" value={formData.slag} onChange={handleChange} />
                <Field label="硅灰/%" name="silicafume" type="number" value={formData.silicafume} onChange={handleChange} />
                <Field label="初始强度/MPa" name="initialstrength" type="number" value={formData.initialstrength} onChange={handleChange} />
              </div>
            </div>

            {/* Section 2: Geometry */}
            <div className="col-span-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="text-brand-500" size={18} />
                <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em]">试件尺寸信息</h4>
              </div>
              <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                <div className="flex p-1 bg-white rounded-2xl border border-slate-100 mb-6">
                  {['立方体', '长方体', '圆柱体'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setSpecimenTab(t as any)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${specimenTab === t ? 'bg-brand-600 text-white shadow-lg shadow-brand-100' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                   {specimenTab === '立方体' && (
                    <Field label="边长(mm)" name="x" type="number" value={dims.x} onChange={(e: ChangeEvent<HTMLInputElement>) => setDims((p: any) => ({ ...p, x: Number(e.target.value) }))} />
                  )}
                  {specimenTab === '长方体' && (
                    <>
                      <Field label="长(mm)" name="x" type="number" value={dims.x} onChange={(e: ChangeEvent<HTMLInputElement>) => setDims((p: any) => ({ ...p, x: Number(e.target.value) }))} />
                      <Field label="宽(mm)" name="y" type="number" value={dims.y} onChange={(e: ChangeEvent<HTMLInputElement>) => setDims((p: any) => ({ ...p, y: Number(e.target.value) }))} />
                      <Field label="高(mm)" name="z" type="number" value={dims.z} onChange={(e: ChangeEvent<HTMLInputElement>) => setDims((p: any) => ({ ...p, z: Number(e.target.value) }))} />
                    </>
                  )}
                  {specimenTab === '圆柱体' && (
                    <>
                      <Field label="直径(mm)" name="d" type="number" value={dims.d} onChange={(e: ChangeEvent<HTMLInputElement>) => setDims((p: any) => ({ ...p, d: Number(e.target.value) }))} />
                      <Field label="高度(mm)" name="h" type="number" value={dims.h} onChange={(e: ChangeEvent<HTMLInputElement>) => setDims((p: any) => ({ ...p, h: Number(e.target.value) }))} />
                    </>
                  )}
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SPECIFIC AREA (CALCULATED)</span>
                   <span className="text-xs font-black text-brand-600">{formData.specificarea} m⁻¹</span>
                </div>
              </div>
            </div>

            {/* Section 3: Ions */}
            <div className="col-span-6">
              <div className="flex items-center gap-2 mb-4">
                <Beaker className="text-brand-500" size={18} />
                <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em]">腐蚀环境 (离子浓度)</h4>
              </div>
                <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                  <Field label="Na⁺ (mol/L)" name="Na" type="number" value={formData.Na} onChange={handleChange} />
                  <Field label="Mg²⁺ (mol/L)" name="Mg" type="number" value={formData.Mg} onChange={handleChange} />
                  <Field label="Cl⁻ (mol/L)" name="Cl" type="number" value={formData.Cl} onChange={handleChange} />
                  <Field label="SO₄²⁻ (mol/L)" name="SO4" type="number" value={formData.SO4} onChange={handleChange} />
                </div>
            </div>

            {/* Section 4: Cycles & Results */}
            <div className="col-span-12 grid grid-cols-3 gap-8">
               <div className="col-span-2 grid grid-cols-4 gap-6 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                  <Field label="润湿时间/h" name="wettingtime" type="number" value={formData.wettingtime} onChange={handleChange} />
                  <Field label="润湿温度/℃" name="wettingtemp" type="number" value={formData.wettingtemp} onChange={handleChange} />
                  <Field label="干燥时间/h" name="dryingtime" type="number" value={formData.dryingtime} onChange={handleChange} />
                  <Field label="干燥温度/℃" name="dryingtemp" type="number" value={formData.dryingtemp} onChange={handleChange} />
               </div>
                <div className="col-span-1 grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                   <Field label="劣化时间/d" name="degradationtime" type="number" value={formData.degradationtime} onChange={handleChange} />
                   <Field label="劣化强度/MPa" name="finalstrength" type="number" value={formData.finalstrength} onChange={handleChange} color="text-red-500" />
                </div>
            </div>

            {/* Section 5: Source */}
            <div className="col-span-12">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="text-brand-500" size={18} />
                <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em]">数据来源与文献溯源</h4>
              </div>
              <div className="grid grid-cols-4 gap-6 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                <Field label="来源类型" name="source" type="select" options={sourceOptions} value={formData.source} onChange={handleChange} />
                <Field label="文献标题" name="title" className="col-span-3" value={formData.title} onChange={handleChange} />
                <Field label="作者" name="author" value={formData.author} onChange={handleChange} />
                <Field label="发表年份" name="time" value={formData.time} onChange={handleChange} />
                <Field label="期刊名称" name="journal" className="col-span-2" value={formData.journal} onChange={handleChange} />
                <Field label="研究机构" name="institute" className="col-span-4" value={formData.institute} onChange={handleChange} />
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button 
            onClick={() => setFormData({})}
            className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-slate-600 font-bold text-sm transition-all"
          >
            <RotateCcw size={18} /> 全部清空
          </button>
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
            >
              取消
            </button>
            <button 
              onClick={handleSubmit}
              className="flex items-center gap-2 px-10 py-3 bg-brand-600 text-white rounded-2xl font-black text-sm hover:bg-brand-700 transition-all shadow-xl shadow-brand-100"
            >
              <Save size={18} /> 确认录入
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Field = ({ label, name, type = 'text', options = [], value, onChange, className = '', color = 'text-slate-600' }: any) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">{label}</label>
    {type === 'select' ? (
      <select 
        name={name} value={value} onChange={onChange}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-500 transition-all appearance-none"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    ) : (
      <input 
        name={name} type={type} value={value} onChange={onChange}
        className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold ${color} outline-none focus:ring-2 focus:ring-brand-500 transition-all`}
      />
    )}
  </div>
);

const PlusIcon = ({ mode }: { mode: 'add' | 'edit' }) => {
  if (mode === 'add') return <Layers size={24} />;
  return <Edit2 size={24} />;
};

const Edit2 = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);

export default DataEditorModal;
