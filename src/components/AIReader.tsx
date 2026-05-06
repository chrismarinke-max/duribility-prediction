import { useState } from 'react';
import { FileUp, FileText, CheckCircle2, Loader2, Search, Table, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIReader = () => {
  const [files, setFiles] = useState<{ name: string; status: 'uploading' | 'processing' | 'done'; progress: number }[]>([]);
  const [activeFile, setActiveFile] = useState<number | null>(null);

  const simulateUpload = () => {
    const newFile = { name: "不同侵蚀环境下喷射混凝土耐久性.pdf", status: 'uploading' as const, progress: 0 };
    setFiles([...files, newFile]);
    
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setFiles(prev => prev.map((f, i) => i === prev.length - 1 ? { ...f, progress: p, status: p >= 100 ? 'processing' : 'uploading' } : f));
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setFiles(prev => prev.map((f, i) => i === prev.length - 1 ? { ...f, status: 'done' } : f));
          setActiveFile(files.length);
        }, 2000);
      }
    }, 200);
  };

  return (
    <div className="h-full flex gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Left: File List & Upload */}
      <div className="w-80 flex flex-col space-y-6">
        <div 
          onClick={simulateUpload}
          className="glass-panel border-dashed border-2 border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 group"
        >
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <FileUp size={32} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">上传文献 PDF</h4>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Support: Max 50MB</p>
          </div>
        </div>

        <div className="flex-1 glass-panel rounded-3xl p-6 flex flex-col border-white/5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <FileText size={14} /> 处理队列
          </h4>
          <div className="space-y-3 overflow-y-auto pr-2">
            {files.map((f, i) => (
              <div 
                key={i} 
                onClick={() => f.status === 'done' && setActiveFile(i)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  activeFile === i ? 'bg-blue-600/10 border-blue-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[10px] font-bold text-slate-300 truncate max-w-[120px]">{f.name}</div>
                  {f.status === 'done' ? <CheckCircle2 size={14} className="text-green-500" /> : <Loader2 size={14} className="text-blue-500 animate-spin" />}
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }} 
                     animate={{ width: `${f.progress}%` }} 
                     className="h-full bg-blue-500" 
                   />
                </div>
              </div>
            ))}
            {files.length === 0 && (
              <div className="text-center py-10 opacity-20 flex flex-col items-center gap-2">
                <FileText size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest">无活跃任务</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Preview & Extraction Results */}
      <div className="flex-1 glass-panel rounded-3xl p-8 flex flex-col border-white/5 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeFile !== null ? (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                      <BrainCircuit size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">智慧提取中心</h3>
                      <p className="text-xs text-slate-500">Qwen-VL-30B 模型已完成视觉感知解析</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button className="btn-secondary text-xs py-2">核对原始图表</button>
                    <button className="btn-primary text-xs py-2">保存至数据库</button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden">
                <div className="space-y-6 overflow-y-auto pr-4">
                   <div className="glass-card bg-white/[0.02]">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">核心材料配比</h4>
                      <div className="space-y-4">
                         {[
                           { l: "水泥强度", v: "42.5 MPa" },
                           { l: "水胶比", v: "0.38" },
                           { l: "粉煤灰掺量", v: "20%" },
                           { l: "矿渣掺量", v: "15%" },
                         ].map(item => (
                           <div key={item.l} className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-sm text-slate-400">{item.l}</span>
                              <span className="text-sm font-bold text-white">{item.v}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                   
                   <div className="glass-card bg-white/[0.02]">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4">环境侵蚀因子</h4>
                      <div className="space-y-4">
                         {[
                           { l: "氯离子浓度", v: "0.55 mol/L" },
                           { l: "硫酸根浓度", v: "0.03 mol/L" },
                           { l: "干湿循环周期", v: "24h (12/12)" },
                         ].map(item => (
                           <div key={item.l} className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-sm text-slate-400">{item.l}</span>
                              <span className="text-sm font-bold text-white">{item.v}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="glass-card bg-black/20 flex flex-col items-center justify-center border-dashed">
                   <Search size={48} className="text-slate-700 mb-4" />
                   <p className="text-slate-500 text-sm">PDF 原始图表预览区域</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center space-y-4 text-slate-600"
            >
              <Table size={64} className="opacity-10" />
              <p className="text-lg font-medium opacity-50">选择处理完成的文件查看 AI 识别结果</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIReader;
