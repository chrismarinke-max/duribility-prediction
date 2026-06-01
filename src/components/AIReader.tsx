import { useState, useEffect, useRef } from 'react';
import { FileUp, FileText, CheckCircle2, Loader2, Search, Table, BrainCircuit, Terminal, Download, Play, Trash2, AlertCircle, AlertTriangle, Eye, X, FolderOpen, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

import { useAIReaderStore } from '../store/aiReaderStore';

const createFileId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createTempPdfName = (id: string) => {
  const shortId = id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  return `paper_${shortId || Date.now().toString(36)}.pdf`;
};

interface AIMergeResult {
  jsonPath: string;
  xlsxPath: string;
  rowCount: number;
  paperCount: number;
}

const AIReader = () => {
  const { files, activeFile, logs, setFiles, setActiveFile, addLog, clearQueue, updateFile, pipelinePath, pythonPath, concurrency } = useAIReaderStore();
  const logEndRef = useRef<HTMLDivElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleUpload = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const newFiles = paths.map(path => {
        const id = createFileId();
        const name = path.split(/[\\/]/).pop() || "unknown.pdf";

        return {
          id,
          name,
          fullPath: path,
          tempName: createTempPdfName(id),
          status: 'idle' as const,
          progress: 0
        };
      });
      setFiles((prev) => [...prev, ...newFiles]);
      if (activeFile === null) setActiveFile(files.length);
    } catch (err) { console.error(err); }
  };

  const startBatchExtraction = async () => {
    const idleFiles = files
      .filter(f => f.status === 'idle')
      .map(f => ({ ...f, tempName: createTempPdfName(f.id) }));
    if (idleFiles.length === 0) return;

    const batchId = createFileId();
    addLog(`[SYSTEM] 批次任务初始化：准备处理 ${idleFiles.length} 篇文献...`);

    const v3Root = pipelinePath;
    const inputFiles = idleFiles.map(f => ({
      id: f.id,
      sourcePath: f.fullPath,
      targetName: f.tempName
    }));

    try {
      const safeConcurrency = 1;
      if (concurrency !== safeConcurrency) {
        addLog(`[SYSTEM] 为保证远程模型调用稳定，本次批量提取按串行并发 ${safeConcurrency} 执行。`);
      }

      // 1. Prepare temp environment
      const tempInputDir = await invoke<string>('prepare_input_environment', {
        v3Root,
        files: inputFiles
      });

      // 2. Mark all as queued
      setFiles(prev => prev.map(f => f.status === 'idle' ? {
        ...f,
        tempName: createTempPdfName(f.id),
        status: 'queued',
        batchId,
        errorMessage: undefined,
        runDir: undefined,
        rowCount: undefined,
        errorStage: undefined,
        errorStageLabel: undefined,
        diagnosticPath: undefined,
        retryable: undefined,
        rawError: undefined,
        nextAction: undefined,
        reasonCode: undefined,
        severity: undefined
      } : f));

      // 3. Run extraction ONCE
      await invoke<string>('run_ai_extraction', {
        inputDir: tempInputDir,
        v3Root,
        pythonPath: pythonPath || null,
        concurrency: safeConcurrency
      });

      // Note: Individual file statuses (processing/done/error) are now updated
      // dynamically via __UI_EVENT__ markers captured by the global listener.
      addLog(`[SUCCESS] 批次任务执行指令结束。`);
    } catch (err) {
      setFiles(prev => prev.map(f => (f.status === 'queued' || f.status === 'processing') ? {
        ...f,
        status: 'error',
        errorStageLabel: '流水线启动/执行',
        errorMessage: String(err),
        nextAction: '检查 Pipeline 路径、Python 解释器和依赖后重试。',
        retryable: true
      } : f));
      addLog(`[ERROR] 批次执行框架崩溃: ${err}`);
    }
  };


  const getCompletedRunDirs = () => {
    const runDirs = files
      .filter(f => f.status === 'done' && f.runDir)
      .map(f => f.runDir as string);
    return Array.from(new Set(runDirs));
  };

  const mergeCompletedResults = async () => {
    const runDirs = getCompletedRunDirs();
    const failedCount = files.filter(f => f.status === 'error').length;

    if (runDirs.length === 0) {
      addLog('[ERROR] 当前工作区暂无可汇总的已完成文献。');
      return null;
    }

    if (failedCount > 0) {
      addLog(`[SYSTEM] 当前有 ${failedCount} 篇失败文献，累计汇总将仅包含已完成文献。`);
    }

    const result = await invoke<AIMergeResult>('merge_ai_results', {
      v3Root: pipelinePath,
      runDirs,
      pythonPath: pythonPath || null
    });
    addLog(`[SUCCESS] 已生成当前工作区累计结果：${result.paperCount} 篇文献，${result.rowCount} 行数据。`);
    return result;
  };

  const handleGlobalExport = async () => {
    try {
      const mergeResult = await mergeCompletedResults();
      if (!mergeResult) return;

      const destPath = await save({
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
        defaultPath: 'AI文献提取结果汇总.xlsx'
      });
      if (!destPath) return;

      await invoke('copy_file_to_location', { src: mergeResult.xlsxPath, dest: destPath });
      addLog(`[SUCCESS] 结果已成功导出至: ${destPath}`);
    } catch (err) {
      addLog(`[ERROR] 导出失败: ${err}`);
    }
  };

  const handlePreview = async () => {
    try {
      const mergeResult = await mergeCompletedResults();
      if (!mergeResult) return;

      const jsonStr = await invoke<string>('read_json_file', { path: mergeResult.jsonPath });
      const parsed = JSON.parse(jsonStr);
      setPreviewData(Array.isArray(parsed) ? parsed : [parsed]);
      setIsPreviewOpen(true);
    } catch (err) {
      addLog(`[ERROR] 无法加载预览数据: ${err}`);
    }
  };

  const handleOpenDiagnostic = async (path?: string) => {
    if (!path) {
      addLog('[ERROR] 该失败任务没有可打开的诊断路径。');
      return;
    }

    try {
      await invoke('open_file_in_folder', { path });
    } catch (err) {
      addLog(`[ERROR] 无法打开诊断路径: ${err}`);
    }
  };

  const doneCount = files.filter(f => f.status === 'done' && f.runDir).length;
  const warningCount = files.filter(f => f.status === 'warning').length;
  const failedCount = files.filter(f => f.status === 'error').length;
  const isRunning = files.some(f => f.status === 'queued' || f.status === 'processing');
  const canMergeResults = doneCount > 0 && !isRunning;

  return (
    <div className="h-full flex overflow-hidden bg-slate-50/50 p-6 gap-6">
      {/* 1. Left Tasks Sidebar */}
      <div className="w-[340px] flex flex-col bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden shrink-0">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
               <BrainCircuit size={14} className="text-brand-500" /> 文献管理中心
            </h4>
            <button onClick={clearQueue} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
          </div>

          <button
            onClick={handleUpload}
            className="w-full py-6 border-2 border-dashed border-slate-100 rounded-[24px] flex flex-col items-center gap-3 hover:border-brand-500/30 hover:bg-brand-50/30 transition-all group"
          >
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-600 transition-all">
              <FileUp size={20} />
            </div>
            <div className="text-center">
              <span className="block text-[11px] font-black text-slate-900">批量上传文献 PDF</span>
              <span className="text-[9px] text-slate-400 font-medium mt-1">支持拖拽或选择多个文件</span>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
          {files.map((f, i) => (
            <div
              key={f.id}
              onClick={() => setActiveFile(i)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 relative group ${
                activeFile === i ? 'bg-brand-50/50 border-brand-500/20' : 'bg-transparent border-transparent hover:bg-slate-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                f.status === 'done' ? 'bg-green-500 text-white' :
                f.status === 'warning' ? 'bg-amber-500 text-white' :
                f.status === 'processing' ? 'bg-brand-500 text-white' :
                f.status === 'queued' ? 'bg-slate-100 text-slate-400' :
                f.status === 'error' ? 'bg-red-500 text-white' : 'bg-white text-slate-300 border border-slate-100'
              }`}>
                {f.status === 'done' ? <CheckCircle2 size={18} /> :
                 f.status === 'warning' ? <AlertTriangle size={18} /> :
                 f.status === 'processing' ? <Loader2 size={18} className="animate-spin" /> :
                 f.status === 'queued' ? <Loader2 size={18} className="opacity-50" /> :
                 f.status === 'error' ? <AlertCircle size={18} /> : <FileText size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-black truncate ${activeFile === i ? 'text-brand-900' : 'text-slate-600'}`}>{f.name}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className={`text-[9px] font-black uppercase tracking-widest ${
                     f.status === 'done' ? 'text-green-600' : f.status === 'warning' ? 'text-amber-600' : f.status === 'error' ? 'text-red-600' : f.status === 'queued' ? 'text-slate-400' : 'text-slate-400'
                   }`}>{f.status}</span>
                   {f.status === 'processing' && <span className="w-1 h-1 rounded-full bg-brand-400 animate-pulse" />}
                   {(f.status === 'warning' || f.status === 'error') && (
                      <>
                        {(f.diagnosticPath || f.runDir) && (
                          <button
                             onClick={(e) => { e.stopPropagation(); handleOpenDiagnostic(f.diagnosticPath || f.runDir); }}
                             className="text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                             <FolderOpen size={10} /> 诊断
                          </button>
                        )}
                        {((f.status === 'error' && f.retryable !== false) || f.status === 'warning') && (
                          <button
                             onClick={(e) => { e.stopPropagation(); updateFile(i, {
                               status: 'idle',
                               tempName: createTempPdfName(f.id),
                               errorMessage: undefined,
                               runDir: undefined,
                               rowCount: undefined,
                               batchId: undefined,
                               resultPath: undefined,
                               errorStage: undefined,
                               errorStageLabel: undefined,
                               diagnosticPath: undefined,
                               retryable: undefined,
                               rawError: undefined,
                               nextAction: undefined,
                               reasonCode: undefined,
                               severity: undefined
                             }); }}
                             className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                               f.status === 'warning'
                                 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                 : 'bg-red-50 text-red-600 hover:bg-red-100'
                             }`}
                          >
                             <RotateCcw size={10} /> {f.status === 'warning' ? '重跑' : '重试'}
                          </button>
                        )}
                      </>
                   )}
                </div>
                {(f.status === 'warning' || f.status === 'error') && (
                  <div className={`mt-2 space-y-1.5 p-2 rounded-xl border ${
                    f.status === 'warning' ? 'bg-amber-50/70 border-amber-100/80' : 'bg-red-50/60 border-red-100/70'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {f.status === 'warning' ? (
                        <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                      ) : (
                        <AlertCircle size={11} className="text-red-500 shrink-0" />
                      )}
                      <span className={`text-[9px] font-black truncate ${f.status === 'warning' ? 'text-amber-700' : 'text-red-600'}`}>
                        {f.errorStageLabel || (f.status === 'warning' ? '预期无可导出数据' : '处理失败')}
                      </span>
                    </div>
                    {f.errorMessage && (
                      <p className={`text-[9px] leading-tight line-clamp-2 ${f.status === 'warning' ? 'text-amber-700' : 'text-red-500'}`} title={f.rawError || f.errorMessage}>
                        {f.errorMessage}
                      </p>
                    )}
                    {f.nextAction && (
                      <p className="text-[9px] text-slate-500 leading-tight line-clamp-2" title={f.nextAction}>
                        建议：{f.nextAction}
                      </p>
                    )}
                    {f.rawError && (
                      <p className="text-[8px] text-slate-400 font-mono leading-tight line-clamp-2" title={f.rawError}>
                        {f.rawError}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {activeFile === i && <div className="w-1.5 h-6 bg-brand-500 rounded-full" />}
            </div>
          ))}
          {files.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-200">
               <FileText size={40} className="opacity-20 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest">暂无待处理任务</p>
            </div>
          )}
        </div>

        <div className="p-6">
           <button
             onClick={startBatchExtraction}
             disabled={files.filter(f => f.status === 'idle').length === 0}
             className="w-full bg-slate-900 text-white py-5 rounded-[24px] text-xs font-black flex items-center justify-center gap-3 hover:bg-black disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
           >
             <Play size={14} fill="white" /> 开始流水线作业
           </button>
        </div>
      </div>

      {/* 2. Main Workbench */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {activeFile !== null ? (
          <>
            {/* Workbench Header */}
            <div className="bg-white rounded-[24px] border border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-brand-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100">
                   <BrainCircuit size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">{files[activeFile].name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    当前工作区：已完成 {doneCount} 篇，无可导出 {warningCount} 篇，失败 {failedCount} 篇
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                 <button
                    onClick={handlePreview}
                    disabled={!canMergeResults}
                    className="px-6 py-3 bg-white text-brand-600 border border-brand-200 rounded-xl text-[11px] font-black hover:bg-brand-50 transition-all flex items-center gap-2 disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98]"
                 >
                    <Eye size={14} /> 预览累计结果（{doneCount}）
                 </button>
                 <button
                    onClick={handleGlobalExport}
                    disabled={!canMergeResults}
                    className="px-6 py-3 bg-brand-600 text-white rounded-xl text-[11px] font-black hover:bg-brand-700 transition-all flex items-center gap-2 shadow-xl shadow-brand-100 disabled:opacity-20 disabled:grayscale transition-all active:scale-[0.98]"
                 >
                    <Download size={14} /> 导出累计汇总
                 </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col gap-4 px-8 py-4 shrink-0">
              {/* Visual Pipeline Steps */}
              <div className="bg-white rounded-[20px] border border-slate-200 py-4 shadow-sm">
                <div className="relative flex items-start justify-between px-8 z-0">
                  {(() => {
                    const lastLog = logs[logs.length - 1] || "";
                    let currentStepIdx = -1;
                    if (files[activeFile].status === 'processing') {
                      currentStepIdx = 0; // Default
                      if (lastLog.includes('Vision Audit') || lastLog.includes('Reviewing')) currentStepIdx = 1;
                      if (lastLog.includes('Data Writeback') || lastLog.includes('Merging') || lastLog.includes('Export')) currentStepIdx = 2;
                    } else if (files[activeFile].status === 'done' || files[activeFile].status === 'warning') {
                      currentStepIdx = 3;
                    }

                    // Clamp for safety
                    const progressPercentage = Math.max(0, Math.min(100, (currentStepIdx / 3) * 100));

                    return (
                      <>
                        {/* Unified Background Track */}
                        <div className="absolute left-[3.5rem] right-[3.5rem] top-4 h-[2px] bg-slate-100 -z-10" />
                        {/* Dynamic Progress Fill */}
                        <div
                          className="absolute left-[3.5rem] top-4 h-[2px] bg-brand-500 transition-all duration-1000 ease-out -z-10"
                          style={{ width: `calc(${progressPercentage}% - 7rem * ${progressPercentage/100})` }}
                        />

                        {[
                          { label: '解析文档', icon: FileText },
                          { label: '图像审计', icon: Search },
                          { label: '语义提取', icon: BrainCircuit },
                          { label: '结果导出', icon: Download },
                        ].map((step, i) => {
                          const isDone = i < currentStepIdx || files[activeFile].status === 'done' || files[activeFile].status === 'warning';
                          const isActive = i === currentStepIdx && files[activeFile].status === 'processing';

                          return (
                            <div key={step.label} className="flex flex-col items-center gap-2 bg-white px-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-white ${
                                isActive ? 'border-brand-500 text-brand-600 animate-pulse scale-110 shadow-lg shadow-brand-100' :
                                isDone ? 'border-brand-600 text-brand-600 bg-brand-50' : 'border-slate-100 text-slate-300'
                              }`}>
                                {isDone ? <CheckCircle2 size={18} /> : <step.icon size={18} />}
                              </div>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-brand-600' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</span>
                                {isActive && <span className="text-[9px] text-brand-400 font-bold">进行中...</span>}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Bottom Console (Modern Panel) */}
            <div className="flex-1 bg-slate-900 mx-8 mb-4 rounded-[24px] shadow-2xl border-4 border-white/5 flex flex-col overflow-hidden">
               <div className="px-8 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <Terminal size={14} className="text-brand-400" />
                    <span className="text-[10px] font-black text-brand-400 uppercase tracking-[0.3em]">系统运行轨迹 · System Trace Console</span>
                  </div>
                  <div className="flex gap-2">
                     <div className="w-2 h-2 rounded-full bg-red-500/30" />
                     <div className="w-2 h-2 rounded-full bg-amber-500/30" />
                     <div className="w-2 h-2 rounded-full bg-green-500/30" />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed text-slate-500 custom-scrollbar scroll-smooth">
                 {logs.length === 0 ? (
                   <div className="h-full flex items-center justify-center opacity-10">
                      <p className="tracking-[0.5em] uppercase font-black">Kernel Ready. Awaiting Instructions.</p>
                   </div>
                 ) : (
                   logs.map((log: string, idx: number) => (
                     <div key={idx} className={`mb-1.5 flex gap-5 group items-start ${log.startsWith('[ERROR]') ? 'text-red-400' : log.includes('√') || log.includes('SUCCESS') ? 'text-green-400' : ''}`}>
                       <span className="opacity-60 shrink-0 font-mono text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 border border-white/5 min-w-[45px] text-center">00:{idx.toString().padStart(3, '0')}</span>
                       <span className="group-hover:text-slate-200 transition-colors pt-0.5">{log}</span>
                     </div>
                   ))
                 )}
                 <div ref={logEndRef} />
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 bg-white rounded-[40px] border border-slate-200 flex flex-col items-center justify-center space-y-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 blur-[120px] rounded-full -mr-64 -mt-64" />
            <div className="relative">
              <div className="absolute inset-0 bg-brand-500/10 blur-[80px] rounded-full animate-pulse" />
              <div className="w-36 h-36 bg-white rounded-[48px] shadow-2xl flex items-center justify-center relative border border-slate-50">
                <BrainCircuit size={72} className="text-brand-500/20" />
              </div>
            </div>
            <div className="text-center space-y-4 relative z-10">
              <h2 className="text-3xl font-black text-slate-300 tracking-tighter uppercase">请初始化任务流</h2>
              <p className="text-xs text-slate-400 font-bold tracking-[0.5em] uppercase opacity-40 flex items-center justify-center gap-6">
                <span>Select Document</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span>Begin Perception</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-12 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-7xl max-h-full rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600">
                     <Table size={24} />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-slate-900 tracking-tight">核心数据提取预览</h3>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Data Export Preview • {previewData.length} Entries Ready</p>
                   </div>
                 </div>
                 <button
                   onClick={() => setIsPreviewOpen(false)}
                   className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                 >
                   <X size={24} />
                 </button>
              </div>
              <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      {previewData.length > 0 && Object.keys(previewData[0]).map(key => (
                        <th key={key} className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-100 whitespace-nowrap bg-white sticky top-0 z-10 shadow-sm">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="p-4 text-[13px] font-medium text-slate-700 whitespace-nowrap group-hover:text-slate-900">
                            {val !== null && val !== undefined && val !== "" ? String(val) : <span className="text-slate-300 italic font-mono text-[11px]">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AIReader;
