import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Download, Maximize2, 
  Layers, FlaskConical, Globe2, BookOpen, Calculator, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { databaseService } from '../../services/databaseService';

const CATEGORIES = [
  { id: 'material', label: '材料与强度统计', icon: FlaskConical, color: 'bg-brand-600' },
  { id: 'environment', label: '环境与循环统计', icon: Globe2, color: 'bg-orange-500' },
  { id: 'source', label: '文献溯源统计', icon: BookOpen, color: 'bg-emerald-500' },
];

const METRICS = [
  { id: 'valid', label: '有效数据' },
  { id: 'missing', label: '遗漏数据' },
  { id: 'unique', label: '非重复数据' },
  { id: 'avg', label: '平均数' },
  { id: 'median', label: '中位数' },
  { id: 'mode', label: '众数' },
  { id: 'std', label: '标准差' },
  { id: 'var', label: '方差' },
  { id: 'max', label: '最大值' },
  { id: 'min', label: '最小值' },
];

// Map frontend labels to database column names
const COLUMN_MAPPING = {
  material: {
    '水泥种类': 'cement',
    '28d水泥强度': 'cementstrength',
    '试件类型': 'specimentype',
    '试件尺寸': 'specimenscale',
    '水灰比': 'wc',
    '表体比': 'specificarea',
    '砂率': 'sandratio',
    '初始强度': 'initialstrength',
    '粉煤灰': 'flyash',
    '矿渣': 'slag',
    '硅灰': 'silicafume',
  },
  environment: {
    'Na⁺浓度': 'Na',
    'Mg²⁺浓度': 'Mg',
    'Cl⁻浓度': 'Cl',
    'SO₄²⁻浓度': 'SO4',
    '润湿时间': 'wettingtime',
    '润湿温度': 'wettingtemp',
    '干燥时间': 'dryingtime',
    '干燥温度': 'dryingtemp',
    '周期': 'cycle',
    '暴露龄期': 'degradationtime',
    '最终强度': 'finalstrength',
  },
  source: {
    '数据来源': 'source',
    '文献标题': 'title',
    '期刊名称': 'journal',
    '作者': 'author',
    '研究机构': 'institute',
    '发表时间': 'time',
  }
};

const DataStatistics = () => {
  const [activeCat, setActiveCat] = useState('material');
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    console.info(`[Statistics] Calculating metrics for category: ${activeCat}`);
    const mapping = COLUMN_MAPPING[activeCat as keyof typeof COLUMN_MAPPING];
    const columns = Object.values(mapping);
    
    const newStats: any = {};
    try {
      // Calculate stats for each column in the active category
      for (const col of columns) {
        console.debug(`[Statistics] Processing column: ${col}`);
        const colStats = await databaseService.calculateColumnStats(col);
        newStats[col] = colStats;
      }
      setStats(newStats);
      console.info(`[Statistics] Calculation complete for ${activeCat}`);
    } catch (error) {
      console.error('[Statistics] Calculation failed:', error);
    } finally {
      setLoading(false);
    }
  }, [activeCat]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const headers = Object.keys(COLUMN_MAPPING[activeCat as keyof typeof COLUMN_MAPPING]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden p-8">
      {/* Tab Navigation */}
      <div className="flex items-center justify-center mb-10 shrink-0">
        <div className="flex p-1.5 bg-white shadow-xl shadow-slate-200/50 rounded-[32px] border border-slate-100">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`flex items-center gap-3 px-8 py-4 rounded-[24px] text-sm font-black transition-all ${
                  isActive ? `${cat.color} text-white shadow-lg` : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={20} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="flex-1 bg-white rounded-[48px] shadow-sm border border-slate-200 overflow-hidden flex flex-col p-8 relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
                <BarChart3 size={24} />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase italic">Statistical Analysis</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Scientific Data Distribution Report</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-100 transition-all disabled:opacity-50"
             >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 重新统计
             </button>
             <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-100 transition-all">
                <Download size={16} /> 导出报表
             </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto rounded-3xl border border-slate-50">
          {loading && Object.keys(stats).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 h-full">
               <RefreshCw size={40} className="animate-spin mb-4" />
               <p className="font-black text-sm uppercase tracking-widest">Calculating Metrics...</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50/50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-40">Metric</th>
                  {headers.map(header => (
                    <th key={header} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 min-w-[120px]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric, idx) => (
                  <tr key={metric.id} className="group hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-0">
                    <td className="px-6 py-5">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-tighter italic">{metric.label}</span>
                    </td>
                    {headers.map((header, i) => {
                      const colName = COLUMN_MAPPING[activeCat as keyof typeof COLUMN_MAPPING][header];
                      const val = stats[colName] ? stats[colName][metric.id] : '--';
                      
                      return (
                        <td key={i} className="px-6 py-5 text-xs font-black text-slate-600">
                          <span className={idx >= 3 ? 'text-brand-600' : 'text-slate-400'}>{val}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Decorative Watermark */}
        <div className="absolute bottom-10 right-10 opacity-[0.03] pointer-events-none select-none">
           <Calculator size={300} />
        </div>
      </div>
    </div>
  );
};

export default DataStatistics;

