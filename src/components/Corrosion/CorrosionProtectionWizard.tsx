import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePredictionStore } from '../../store/predictionStore';
import { Activity, ShieldCheck, Zap, ArrowLeft, ArrowRight } from 'lucide-react';

// Steps
import Step1StrengthReview from './Step1StrengthReview';
import Step2DiffusionEvolution from './Step2DiffusionEvolution';
import Step3CorrosionAssessment from './Step3CorrosionAssessment';

const CorrosionProtectionWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const { lastResults } = usePredictionStore();

  const steps = [
    { title: '强度预测', icon: Activity, subtitle: '回顾混凝土强度劣化曲线' },
    { title: '扩散系数', icon: Zap, subtitle: '氯离子扩散系数演化计算' },
    { title: '护筋性', icon: ShieldCheck, subtitle: '钢筋腐蚀深度与寿命评估' },
  ];

  if (!lastResults) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
          <Activity size={40} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">未检测到预测数据</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
            护筋性评估需要基于已生成的强度演化数据。请先前往“强度演化”模块完成一次预测推理。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Module Header & Progress */}
      <div className="bg-white border-b border-slate-200 px-20 py-8 shrink-0 shadow-sm relative z-10">
        <div className="relative flex items-center justify-between max-w-4xl mx-auto">
          <div className="absolute top-4 left-4 right-4 h-[2px] bg-slate-100 -z-10" />
          <motion.div 
            className="absolute top-4 left-4 h-[2px] bg-brand-500 -z-10" 
            initial={{ width: '0%' }} 
            animate={{ width: `${((currentStep - 1) / 2) * 100}%` }} 
          />
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2 relative">
              <div 
                onClick={() => i + 1 < currentStep && setCurrentStep(i + 1)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all cursor-pointer border-2 z-10 bg-white ${
                  currentStep === i + 1 
                  ? 'border-brand-500 text-brand-600 shadow-lg shadow-brand-100 scale-110' 
                  : currentStep > i + 1 
                  ? 'border-brand-500 bg-brand-500 text-white' 
                  : 'border-slate-200 text-slate-300'
                }`}
              >
                {currentStep > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-[11px] font-black uppercase tracking-wider ${currentStep === i + 1 ? 'text-brand-600' : 'text-slate-400'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-20 pt-10 pb-32">
        <div className="max-w-6xl mx-auto bg-white rounded-[32px] border border-slate-200 shadow-sm min-h-[600px] overflow-hidden flex flex-col relative">
          <div className="flex-1 p-10">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentStep} 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }} 
                transition={{ duration: 0.3 }}
              >
                {currentStep === 1 && <Step1StrengthReview results={lastResults} />}
                {currentStep === 2 && <Step2DiffusionEvolution results={lastResults} />}
                {currentStep === 3 && <Step3CorrosionAssessment results={lastResults} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-[260px] right-0 z-50 px-20 py-8 pointer-events-none">
        <div className="max-w-6xl mx-auto flex justify-between items-center pointer-events-auto">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex items-center gap-3 px-8 py-4 bg-white/90 backdrop-blur-md border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 shadow-lg"
            >
              <ArrowLeft size={18} />
              <span>上一步</span>
            </button>
          ) : <div />}

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl font-black shadow-xl shadow-brand-200/50 hover:-translate-y-1 transition-all"
            >
              <span>继续下一步</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => alert("分析报告已生成，您可以点击‘导出结果’保存数据。")}
              className="flex items-center gap-3 px-10 py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl shadow-green-200/50 hover:-translate-y-1 transition-all"
            >
              <span>分析完成</span>
              <ShieldCheck size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrosionProtectionWizard;
