import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Activity, 
  LayoutDashboard, 
  Calculator, 
  ChevronRight, 
  Zap,
  Search,
  Bell,
  Moon,
  FlaskConical,
  ArrowLeft,
  ArrowRight,
  Clock,
  Table,
  Beaker,
  Map,
  Waves,
  RefreshCcw,
  ClipboardList,
  BarChart3,
  Play
} from 'lucide-react';
import heroImage from './assets/hero.png';

// Components
import Step1Materials from './components/WizardSteps/Step1Materials';
import Step2Geometry from './components/WizardSteps/Step2Geometry';
import Step4Environment from './components/WizardSteps/Step4Environment';
import Step6Time from './components/WizardSteps/Step6Time';
import Step7Results from './components/WizardSteps/Step7Results';
import CorrosionProtectionWizard from './components/Corrosion/CorrosionProtectionWizard';
import BatchPrediction from './components/BatchPrediction';
import OceanPortQuery from './components/OceanPortQuery';
import TideTransformer from './components/TideTransformer';
import StressTransformer from './components/StressTransformer';
import SaltStressAnalysis from './components/SaltStressAnalysis';
import CementClusterer from './components/CementClusterer';
import ScientificCalculator from './components/ScientificCalculator';
import ScientificNotepad from './components/ScientificNotepad';
import DataFilter from './components/Database/DataFilter';
import DataBrowser from './components/Database/DataBrowser';
import DataStatistics from './components/Database/DataStatistics';
import DictionarySettings from './components/Database/DictionarySettings';

import { executeInference } from './services/predictionService';
import type { DataPoint } from './services/predictionService';
import { usePredictionStore } from './store/predictionStore';

const App = () => {
   const [activeView, setActiveView] = useState('dashboard');
   const { step, setStep, predictionData, setLastResults, lastResults } = usePredictionStore();
   const [loading, setLoading] = useState(false);
   const [openSections, setOpenSections] = useState<string[]>(['CORE', 'TOOLS', 'DATA']);

   const toggleSection = (id: string) => {
     setOpenSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
   };

  const MENU_ITEMS = [
    { id: 'dashboard', icon: LayoutDashboard, label: '首页概览', section: 'GENERAL' },
    { 
      id: 'prediction', 
      icon: Activity, 
      label: '耐久性预测', 
      section: 'CORE',
      children: [
        { id: 'strength', label: '强度演化' },
        { id: 'rebar', label: '护筋性' },
        { id: 'batch', label: '批量预测' }
      ]
    },
    {
      id: 'tools',
      icon: Calculator,
      label: '工具箱',
      section: 'TOOLS',
      children: [
        { id: 'ocean-query', label: '海线/港口查询与离子', icon: Map },
        { id: 'tide-trans', label: '海洋潮汐转化为干湿循环', icon: Waves },
        { id: 'stress-trans', label: '应力转化工具', icon: Zap },
        { id: 'dry-wet', label: '干湿循环-盐结晶转化为应力', icon: RefreshCcw },
        { id: 'cement-analysis', label: '水泥品种聚类分析', icon: Beaker },
        { id: 'calc', label: '计算器', icon: Calculator },
        { id: 'notes', label: '记事本', icon: ClipboardList }
      ]
    },
    {
      id: 'database',
      icon: Database,
      label: '数据库管理',
      section: 'DATA',
      children: [
        { id: 'db-filter', label: '数据筛选' },
        { id: 'db-manage', label: '浏览管理' },
        { id: 'db-stats', label: '数据统计' },
        { id: 'db-settings', label: '选项设置' }
      ]
    }
  ];

  const handlePredict = async () => {
    if (!predictionData.timePoints || predictionData.timePoints.length === 0) {
      alert("请输入有效的时间点序列（Step 4）");
      return;
    }
    setLoading(true);
    try {
      const data = await executeInference(predictionData, predictionData.timePoints);
      setLastResults(data); 
      setStep(7);
    } catch (err) { 
      console.error(err); 
      alert("预测引擎执行失败，请检查参数设置。");
    } finally { 
      setLoading(false); 
    }
  };

  const steps = [
    { title: '材料', component: <Step1Materials /> },
    { title: '几何', component: <Step2Geometry /> },
    { title: '环境', component: <Step4Environment /> },
    { title: '时域', component: <Step6Time /> }
  ];

  const prevStep = () => setStep(Math.max(1, step - 1));
  const nextStep = () => {
    if (step === 4) {
      handlePredict();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="flex h-screen bg-slate-200 text-slate-800 overflow-hidden font-sans selection:bg-brand-100 selection:text-brand-700">
      {/* Sidebar - Clean High Contrast */}
      <aside className="w-[260px] xl:w-[280px] bg-white flex flex-col border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 z-30">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
              <Zap size={24} fill="white" />
            </div>
            <div>
              <h1 className="text-[14px] font-black text-slate-900 leading-tight uppercase tracking-tighter">
                混凝土耐久性<br />预测系统
              </h1>
              <p className="text-[10px] text-brand-500 font-black uppercase mt-1 tracking-widest">Scientific Version</p>
            </div>
          </div>
        </div>

         <nav className="flex-1 px-5 py-6 overflow-y-auto space-y-2 custom-scrollbar text-black">
           {MENU_ITEMS.map(item => (
             <div key={item.id} className="space-y-1">
               <button 
                 onClick={() => {
                   if (item.children) {
                     toggleSection(item.id);
                   } else {
                     setActiveView(item.id);
                   }
                 }}
                 className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all group ${
                   activeView === item.id 
                   ? 'bg-black text-white shadow-2xl shadow-slate-900/20 font-black' 
                   : 'text-black font-black hover:bg-slate-100 hover:text-black'
                 }`}
               >
                 <item.icon size={22} className={activeView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-black'} />
                 <span className="text-[16px] font-black">{item.label}</span>
                 {item.children && (
                   <ChevronRight 
                     size={16} 
                     className={`ml-auto transition-transform duration-300 ${openSections.includes(item.id) ? 'rotate-90' : ''} opacity-40`} 
                   />
                 )}
               </button>
               
               <AnimatePresence>
                 {item.children && openSections.includes(item.id) && (
                   <motion.div 
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="overflow-hidden flex flex-col pl-6 space-y-1.5 mb-4"
                   >
                     {item.children.map(child => (
                       <button 
                         key={child.id}
                         onClick={() => setActiveView(child.id)}
                         className={`text-left px-5 py-3 text-[15px] font-black transition-all rounded-xl ${
                           activeView === child.id 
                           ? 'bg-black text-white shadow-lg font-black' 
                           : 'text-slate-800 hover:text-black hover:bg-slate-50'
                         }`}
                       >
                         {child.label}
                       </button>
                     ))}
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           ))}
         </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-[70px] bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">系统工作台 · System Workbench</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="搜索功能关键词..." className="bg-slate-50 border-slate-200 rounded-full pl-11 pr-6 py-2 text-sm w-56 focus:w-72 transition-all outline-none focus:border-brand-300 font-black text-black" />
            </div>
            <button className="text-slate-400 hover:text-brand-600"><Bell size={20} /></button>
            <button className="text-slate-400 hover:text-brand-600"><Moon size={20} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 relative">
          {activeView === 'dashboard' ? (
            <div className="p-10 max-w-6xl mx-auto space-y-10 h-full">
              <div className="relative h-72 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white">
                <img src={heroImage} alt="Bridge" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-900/60 flex items-center px-16">
                  <div className="space-y-8">
                    <h3 className="text-5xl font-black text-white tracking-tighter leading-tight">科学建模 · 精准预测<br />构建混凝土耐久性数字孪生</h3>
                    <button 
                      onClick={() => {
                        setActiveView('strength');
                        setStep(1);
                      }} 
                      className="px-10 py-4 bg-brand-600 text-white rounded-2xl font-black text-lg hover:bg-brand-500 shadow-xl shadow-brand-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                    >
                      <Play size={20} fill="white" />
                      立即开始强度推理
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'strength' ? (
            <div className="flex flex-col h-full relative">
              {/* Top Progress Bar Area */}
              <div className="bg-white border-b border-slate-200 px-24 py-4 shrink-0 shadow-sm relative z-10 rounded-t-[32px] mx-4 lg:mx-6 xl:mx-8 mt-4">
                <div className="relative flex items-center justify-between max-w-4xl mx-auto">
                  <div className="absolute top-5 left-4 right-4 h-[3px] bg-slate-100 -z-10" />
                  <motion.div 
                    className="absolute top-5 left-4 h-[3px] bg-brand-500 -z-10" 
                    initial={{ width: '0%' }} 
                    animate={{ width: `${((Math.min(step, 4) - 1) / 3) * 100}%` }} 
                  />
                  {steps.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 relative">
                      <div 
                        onClick={() => i + 1 < step && setStep(i + 1)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black transition-all cursor-pointer border-4 z-10 bg-white ${
                          step === i + 1 
                          ? 'border-brand-500 text-brand-600 shadow-xl shadow-brand-100 scale-110' 
                          : step > i + 1 
                          ? 'border-brand-500 bg-brand-500 text-white shadow-lg' 
                          : 'border-slate-200 text-slate-300'
                        }`}
                      >
                        {step > i + 1 ? '✓' : i + 1}
                      </div>
                      <span className={`text-[12px] font-black uppercase tracking-widest ${step === i + 1 ? 'text-brand-600' : 'text-slate-400'}`}>
                        {s.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle Dynamic Content */}
              <div className="flex-1 px-4 lg:px-6 xl:px-8 pt-4 pb-20 flex flex-col overflow-hidden h-full">
                <div className="max-w-[1536px] w-full mx-auto premium-card flex-1 flex flex-col relative overflow-hidden bg-white shadow-2xl rounded-b-[40px] border-x border-b border-slate-100">
                   {/* Background Ambient Decor */}
                  <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-500/10 blur-[120px] pointer-events-none" />
                  <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-500/10 blur-[120px] pointer-events-none" />

                  <div className={`flex-1 p-6 lg:p-8 xl:p-10 ${(step === 3 || step === 4) ? 'overflow-hidden' : 'overflow-y-auto'} custom-scrollbar`}>
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={step} 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -15 }} 
                        transition={{ duration: 0.4 }}
                        className="h-full"
                      >
                        {step <= 4 ? steps[step - 1].component : <Step7Results results={lastResults || []} onBack={() => setStep(4)} />}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Fixed Bottom Navigation Action Bar */}
              {step <= 4 && (
                <div className="fixed bottom-0 left-[260px] xl:left-[280px] right-0 z-50 px-8 lg:px-14 xl:px-24 py-6 pointer-events-none">
                  <div className="max-w-7xl mx-auto flex justify-between items-center pointer-events-auto">
                    {/* Back Button */}
                    {step > 1 ? (
                      <button
                        onClick={prevStep}
                        className="flex items-center gap-4 px-10 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-base hover:bg-slate-50 hover:shadow-2xl hover:-translate-y-1 transition-all group active:scale-95 shadow-xl shadow-slate-200/50"
                      >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1.5 transition-transform" />
                        <span>上一步</span>
                      </button>
                    ) : <div />}

                    {/* Next/Predict Button */}
                    {step < 4 ? (
                      <button
                        onClick={nextStep}
                        className="flex items-center gap-4 px-12 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl font-black text-base hover:shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:-translate-y-1 transition-all active:scale-95 group shadow-2xl shadow-brand-200/50"
                      >
                        <span>下一步</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                      </button>
                    ) : (
                      <button
                        onClick={handlePredict}
                        disabled={loading || (predictionData.isStressMode && (predictionData.loadFactor ?? 0) >= 1)}
                        className={`flex items-center gap-4 px-14 py-4 rounded-2xl font-black text-base transition-all shadow-2xl active:scale-95 group ${
                          (predictionData.isStressMode && (predictionData.loadFactor ?? 0) >= 1)
                          ? 'bg-red-500 text-white cursor-not-allowed opacity-50'
                          : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:-translate-y-1'
                        }`}
                      >
                        {loading ? (
                          <div className="flex items-center gap-4">
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>引擎计算中...</span>
                          </div>
                        ) : (
                          <>
                            <Zap size={22} fill="white" className="group-hover:scale-110 transition-transform" />
                            <span>{(predictionData.isStressMode && (predictionData.loadFactor ?? 0) >= 1) ? '超载禁止预测' : '执行预测推理引擎'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeView === 'rebar' ? (
             <CorrosionProtectionWizard />
          ) : activeView === 'batch' ? (
             <BatchPrediction />
          ) : activeView === 'ocean-query' ? (
             <OceanPortQuery />
          ) : activeView === 'tide-trans' ? (
             <TideTransformer />
          ) : activeView === 'stress-trans' ? (
             <StressTransformer />
          ) : activeView === 'dry-wet' ? (
             <SaltStressAnalysis />
          ) : activeView === 'cement-analysis' ? (
             <CementClusterer />
          ) : activeView === 'calc' ? (
             <ScientificCalculator />
          ) : activeView === 'notes' ? (
             <ScientificNotepad />
          ) : activeView === 'db-filter' ? (
             <DataFilter />
          ) : activeView === 'db-manage' ? (
             <DataBrowser />
          ) : activeView === 'db-stats' ? (
             <DataStatistics />
          ) : activeView === 'db-settings' ? (
             <DictionarySettings />
          ) : (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400 h-full">
              <FlaskConical size={80} className="mb-8 opacity-10" />
              <p className="font-black text-xl tracking-widest uppercase">[{activeView}] Under Development</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
