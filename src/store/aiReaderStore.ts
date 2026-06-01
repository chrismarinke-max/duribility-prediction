import { create } from 'zustand';

export interface AIFile {
  id: string;
  name: string;
  fullPath: string;
  tempName: string;
  status: 'idle' | 'queued' | 'processing' | 'done' | 'warning' | 'error';
  progress: number;
  runDir?: string;
  rowCount?: number;
  batchId?: string;
  resultPath?: string;
  errorMessage?: string;
  errorStage?: string;
  errorStageLabel?: string;
  diagnosticPath?: string;
  retryable?: boolean;
  rawError?: string;
  nextAction?: string;
  reasonCode?: string;
  severity?: string;
}

interface AIReaderState {
  files: AIFile[];
  activeFile: number | null;
  logs: string[];
  pipelinePath: string;
  pythonPath: string;
  concurrency: number;
  
  // Actions
  setFiles: (files: AIFile[] | ((prev: AIFile[]) => AIFile[])) => void;
  setActiveFile: (index: number | null) => void;
  addLog: (log: string) => void;
  clearQueue: () => void;
  updateFile: (index: number, data: Partial<AIFile>) => void;
  processLogEvent: (logLine: string) => void;
  setPipelinePath: (path: string) => void;
  setPythonPath: (path: string) => void;
  setConcurrency: (value: number) => void;
}

import { persist } from 'zustand/middleware';

export const useAIReaderStore = create<AIReaderState>()(
  persist(
    (set) => ({
      files: [],
      activeFile: null,
      logs: [],
      pipelinePath: "E:/antigravityProj/pdf提取/v3", // Default legacy path
      pythonPath: "", // Default to auto-detect
      concurrency: 1, 

      setFiles: (filesOrFn) => set((state) => ({
        files: typeof filesOrFn === 'function' ? filesOrFn(state.files) : filesOrFn
      })),

      setActiveFile: (index) => set({ activeFile: index }),

      addLog: (log) => set((state) => ({ 
        logs: [...state.logs, log] 
      })),

      clearQueue: () => set({ files: [], activeFile: null, logs: [] }),

      updateFile: (index, data) => set((state) => ({
        files: state.files.map((f, i) => i === index ? { ...f, ...data } : f)
      })),

      setPipelinePath: (path) => set({ pipelinePath: path }),
      setPythonPath: (path) => set({ pythonPath: path }),
      setConcurrency: (value) => set({ concurrency: value }),

      processLogEvent: (logLine) => set((state) => {
        if (logLine.startsWith('__UI_EVENT__:')) {
          try {
            const eventData = JSON.parse(logLine.replace('__UI_EVENT__:', ''));
            if ((eventData.id || eventData.file || eventData.path) && eventData.status) {
              const eventFile = typeof eventData.file === 'string' ? eventData.file : '';
              const matchingOriginalNameCount = eventFile
                ? state.files.filter((f) => f.name === eventFile).length
                : 0;
              const runDir = eventData.runDir || eventData.run_dir;

              return {
                files: state.files.map((f) => {
                  const eventPath = typeof eventData.path === 'string' ? eventData.path.replace(/\\/g, '/') : '';
                  const fullPath = f.fullPath.replace(/\\/g, '/');
                  const matches =
                    eventData.id === f.id ||
                    eventFile === f.tempName ||
                    eventPath === fullPath ||
                    eventPath.endsWith(`/${f.tempName}`) ||
                    (matchingOriginalNameCount === 1 && eventFile === f.name);
                  const isDone = eventData.status === 'done';
                  const isWarning = eventData.status === 'warning';

                  return matches ? {
                    ...f,
                    status: eventData.status,
                    runDir: runDir || f.runDir,
                    rowCount: eventData.rowCount ?? eventData.row_count ?? f.rowCount,
                    batchId: eventData.batchId || eventData.batch_id || f.batchId,
                    errorMessage: isDone ? undefined : (eventData.message ?? f.errorMessage),
                    errorStage: isDone ? undefined : (eventData.errorStage || eventData.error_stage || f.errorStage),
                    errorStageLabel: isDone ? undefined : (eventData.errorStageLabel || eventData.error_stage_label || f.errorStageLabel),
                    diagnosticPath: isDone ? undefined : (eventData.diagnosticPath || eventData.diagnostic_path || f.diagnosticPath),
                    retryable: isDone ? undefined : (typeof eventData.retryable === 'boolean' ? eventData.retryable : f.retryable),
                    rawError: isDone ? undefined : (eventData.rawError || eventData.raw_error || f.rawError),
                    nextAction: isDone ? undefined : (eventData.nextAction || eventData.next_action || f.nextAction),
                    reasonCode: isDone ? undefined : (eventData.reasonCode || eventData.reason_code || f.reasonCode),
                    severity: isDone ? undefined : (eventData.severity || (isWarning ? 'warning' : f.severity))
                  } : f;
                })
              };
            }
            if (eventData.status === 'batch_complete') {
              const pendingVision = eventData.pendingVision ?? eventData.pending_vision ?? 0;
              return {
                logs: [
                  ...state.logs,
                  `[SYSTEM] 初提取完成：共 ${eventData.total ?? 0} 篇，直接成功 ${eventData.success ?? 0} 篇，等待图像复核 ${pendingVision} 篇，失败 ${eventData.failed ?? 0} 篇。`
                ]
              };
            }
          } catch (e) {}
          return state;
        } else {
          return { logs: [...state.logs, logLine] };
        }
      }),
    }),
    {
      name: 'ai-reader-storage',
      partialize: (state) => ({ 
        pipelinePath: state.pipelinePath,
        pythonPath: state.pythonPath,
        concurrency: state.concurrency
      }),
    }
  )
);
