import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Activity, 
  LayoutDashboard, 
  Calculator, 
  ChevronRight, 
  Zap,
  ArrowLeft,
  ArrowRight,
  Beaker,
  Map,
  Waves,
  RefreshCcw,
  ClipboardList,
  Play,
  Settings
} from 'lucide-react';
import heroImage from './assets/hero.png';
import homeBg from './assets/home_bg.png';

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

import CementClusterer from './components/CementClusterer';
import ScientificCalculator from './components/ScientificCalculator';
import ScientificNotepad from './components/ScientificNotepad';
import DataFilter from './components/Database/DataFilter';
import DataBrowser from './components/Database/DataBrowser';
import DataStatistics from './components/Database/DataStatistics';
import DictionarySettings from './components/Database/DictionarySettings';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import SystemSettings from './components/SystemSettings';

import { executeInference } from './services/predictionService';
import { usePredictionStore } from './store/predictionStore';
import { databaseService } from './services/databaseService';

const App = () => {
   const [activeView, setActiveView] = useState('dashboard');
   const { step, setStep, predictionData, setLastResults, lastResults, currentUser } = usePredictionStore();
   const [loading, setLoading] = useState(false);
   const [openSections, setOpenSections] = useState<string[]>(['CORE', 'TOOLS', 'DATA']);
   const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

   useEffect(() => {
     databaseService.initUsers().catch(console.error);
   }, []);

   const toggleSection = (id: string) => {
     setOpenSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
   };

  const ALL_MENU_ITEMS = [
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
      label: '工具',
      section: 'TOOLS',
      children: [
        { id: 'ocean-query', label: '海线/港口查询与离子', icon: Map },
        { id: 'tide-trans', label: '海洋潮汐转化为干湿循环', icon: Waves },
        { id: 'stress-trans', label: '应力转化工具', icon: Zap },

        { id: 'cement-analysis', label: '水泥品种聚类分析', icon: Beaker },
        { id: 'calc', label: '计算器', icon: Calculator },
        { id: 'notes', label: '记事本', icon: ClipboardList }
      ]
    },
    {
      id: 'database',
      icon: Database,
      label: '数据库功能',
      section: 'DATA',
      isAdminOnly: true,
      children: [
        { id: 'db-filter', label: '数据筛选' },
        { id: 'db-manage', label: '浏览管理' },
        { id: 'db-stats', label: '数据统计' },
        { id: 'db-settings', label: '选项设置' }
      ]
    },
    { id: 'settings', icon: Settings, label: '系统设置', section: 'SYSTEM' }
  ];

  const MENU_ITEMS = ALL_MENU_ITEMS.filter(item => !item.isAdminOnly || (currentUser?.role === 'admin'));

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

  if (!currentUser) {
    return authMode === 'login' ? (
      <LoginPage onRegister={() => setAuthMode('register')} />
    ) : (
      <RegisterPage onBack={() => setAuthMode('login')} />
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return (
        <div className="w-full h-full relative overflow-hidden">
          <img src={homeBg} alt="Bridge" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex flex-col items-center justify-center p-16 text-center">
            <div className="space-y-12 flex flex-col items-center">
              <h3 className="text-7xl font-black text-slate-900 tracking-tighter leading-tight drop-shadow-md">
                欢迎使用本软件
              </h3>
              
              <button 
                onClick={() => {
                  setActiveView('strength');
                  setStep(1);
                }} 
                className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-xl hover:bg-slate-800 shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4 group"
              >
                <Play size={24} fill="white" className="group-hover:translate-x-1 transition-transform" />
                立即开始
              </button>
            </div>

            <div className="absolute bottom-12 left-0 right-0 text-center">
              <p className="text-xl font-black text-slate-800 tracking-widest uppercase bg-white/60 backdrop-blur-md py-3 px-10 inline-block rounded-full border border-white/40 shadow-lg">
                本软件由 [东南大学绿色建材与固碳利用研究中心] 开发
              </p>
            </div>
          </div>
        </div>
      );
      case 'strength': return (
        <div className="flex flex-col h-full relative">
          <div className="bg-white border-b border-slate-200 px-24 py-4 shrink-0 shadow-sm relative z-10 rounded-t-[32px] mx-4 lg:mx-6 xl:mx-8 mt-4">
            <div className="relative flex items-center justify-between max-w-4xl mx-auto">
              <div className="absolute top-5 left-4 right-4 h-[3px] bg-slate-100 -z-10" />
              <motion.div className="absolute top-5 left-4 h-[3px] bg-brand-500 -z-10" initial={{ width: '0%' }} animate={{ width: `${((Math.min(step, 4) - 1) / 3) * 100}%` }} />
              {steps.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-3 relative">
                  <div onClick={() => i + 1 < step && setStep(i + 1)} className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black transition-all cursor-pointer border-4 z-10 bg-white ${step === i + 1 ? 'border-brand-500 text-brand-600 shadow-xl shadow-brand-100 scale-110' : step > i + 1 ? 'border-brand-500 bg-brand-500 text-white shadow-lg' : 'border-slate-200 text-slate-300'}`}>{step > i + 1 ? '✓' : i + 1}</div>
                  <span className={`text-[12px] font-black uppercase tracking-widest ${step === i + 1 ? 'text-brand-600' : 'text-slate-400'}`}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 px-4 lg:px-6 xl:px-8 pt-4 pb-20 flex flex-col overflow-hidden h-full">
            <div className="max-w-[1536px] w-full mx-auto premium-card flex-1 flex flex-col relative overflow-hidden bg-white shadow-2xl rounded-b-[40px] border-x border-b border-slate-100">
              <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-500/10 blur-[120px] pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-500/10 blur-[120px] pointer-events-none" />
              <div className="flex-1 p-6 lg:p-8 xl:p-10 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="h-full">
                    {step <= 4 ? steps[step - 1].component : <Step7Results results={lastResults || []} onBack={() => setStep(4)} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
          {step <= 4 && (
            <div className="fixed bottom-0 left-[260px] xl:left-[280px] right-0 z-50 px-8 lg:px-14 xl:px-24 py-6 pointer-events-none">
              <div className="max-w-7xl mx-auto flex justify-between items-center pointer-events-auto">
                {step > 1 ? (
                  <button onClick={prevStep} className="flex items-center gap-4 px-10 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-base hover:bg-slate-50 hover:shadow-2xl hover:-translate-y-1 transition-all group active:scale-95 shadow-xl shadow-slate-200/50">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1.5 transition-transform" />
                    <span>上一步</span>
                  </button>
                ) : <div />}
                {step < 4 ? (
                  <button onClick={nextStep} className="flex items-center gap-4 px-12 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl font-black text-base hover:shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:-translate-y-1 transition-all active:scale-95 group shadow-2xl shadow-brand-200/50">
                    <span>下一步</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                  </button>
                ) : (
                  <button onClick={handlePredict} disabled={loading || (predictionData.isStressMode && (predictionData.loadFactor ?? 0) >= 1)} className={`flex items-center gap-4 px-14 py-4 rounded-2xl font-black text-base transition-all shadow-2xl active:scale-95 group ${(predictionData.isStressMode && (predictionData.loadFactor ?? 0) >= 1) ? 'bg-red-500 text-white cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:-translate-y-1'}`}>
                    {loading ? <div className="flex items-center gap-4"><div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /><span>引擎计算中...</span></div> : <><Zap size={22} fill="white" className="group-hover:scale-110 transition-transform" /><span>{(predictionData.isStressMode && (predictionData.loadFactor ?? 0) >= 1) ? '超载禁止预测' : '执行预测推理引擎'}</span></>}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      );
      case 'rebar': return <CorrosionProtectionWizard />;
      case 'batch': return <BatchPrediction />;
      case 'ocean-query': return <OceanPortQuery />;
      case 'tide-trans': return <TideTransformer />;
      case 'stress-trans': return <StressTransformer />;

      case 'cement-analysis': return <CementClusterer />;
      case 'calc': return <ScientificCalculator />;
      case 'notes': return <ScientificNotepad />;
      case 'db-filter': return <DataFilter />;
      case 'db-manage': return <DataBrowser />;
      case 'db-stats': return <DataStatistics />;
      case 'db-settings': return <DictionarySettings />;
      case 'settings': return <SystemSettings />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-200 text-slate-800 overflow-hidden font-sans selection:bg-brand-100 selection:text-brand-700">
      <aside className="w-[260px] xl:w-[280px] bg-white flex flex-col border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 z-30">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
              <Zap size={24} fill="white" />
            </div>
            <div>
              <h1 className="text-[14px] font-black text-slate-900 leading-tight uppercase tracking-tighter">混凝土耐久性<br />预测系统</h1>
              <p className="text-[10px] text-brand-500 font-black uppercase mt-1 tracking-widest">Scientific Version</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-5 py-6 overflow-y-auto space-y-2 custom-scrollbar text-black">
          {MENU_ITEMS.map(item => (
            <div key={item.id} className="space-y-1">
              <button onClick={() => item.children ? toggleSection(item.id) : setActiveView(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all group ${activeView === item.id || (item.children?.some(c => c.id === activeView)) ? 'bg-black text-white shadow-2xl shadow-slate-900/20 font-black' : 'text-black font-black hover:bg-slate-100'}`}>
                <item.icon size={22} className={activeView === item.id || (item.children?.some(c => c.id === activeView)) ? 'text-white' : 'text-slate-500 group-hover:text-black'} />
                <span className="text-[16px] font-black">{item.label}</span>
                {item.children && <ChevronRight size={16} className={`ml-auto transition-transform duration-300 ${openSections.includes(item.id) ? 'rotate-90' : ''} opacity-40`} />}
              </button>
              <AnimatePresence>
                {item.children && openSections.includes(item.id) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex flex-col pl-6 space-y-1.5 mb-4">
                    {item.children.map(child => (
                      <button key={child.id} onClick={() => setActiveView(child.id)} className={`text-left px-5 py-3 text-[15px] font-black transition-all rounded-xl ${activeView === child.id ? 'bg-brand-600 text-white shadow-lg font-black' : 'text-slate-800 hover:text-black hover:bg-slate-50'}`}>{child.label}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-brand-100">{currentUser.username[0].toUpperCase()}</div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">当前角色</p>
                <p className="text-xs font-black text-slate-700 leading-none mt-0.5">{currentUser.role === 'admin' ? '系统管理员' : '科研人员'}</p>
             </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {activeView !== 'dashboard' && (
          <header className="h-[70px] bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-20">
            <div className="flex items-center gap-4"><h2 className="text-base font-black text-slate-900 uppercase tracking-widest">系统工作台 · System Workbench</h2></div>
            <div className="flex items-center gap-6"></div>
          </header>
        )}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 relative">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
