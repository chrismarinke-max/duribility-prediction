import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { DataPoint } from '../services/predictionService';

interface Props {
  data: DataPoint[];
}

const PredictionChart: React.FC<Props> = ({ data }) => {
  const times = data.map(d => d.time);
  const strengths = data.map(d => d.strength);
  
  // Confidence Interval calculation from ScientificAuditReport.md
  // Upper: +11.92%, Lower: -5.06%
  const upperBand = strengths.map(s => Number((s * 1.1192).toFixed(2)));
  const lowerBand = strengths.map(s => Number((s * 0.9494).toFixed(2)));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(59, 130, 246, 0.5)',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const time = params[0].axisValue;
        const s = params[0].data;
        const u = params[1].data;
        const l = params[2].data;
        return `
          <div style="padding: 4px">
            <div style="font-weight: bold; margin-bottom: 4px; color: #94a3b8">时间: ${time}d</div>
            <div style="color: #3b82f6">预测强度: ${s} MPa</div>
            <div style="color: #64748b; font-size: 10px">置信区间: ${l} - ${u} MPa</div>
          </div>
        `;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: '强度 (MPa)',
      nameTextStyle: { color: '#64748b', fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } }
    },
    series: [
      {
        name: '预测强度',
        type: 'line',
        data: strengths,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 3, color: '#3b82f6', shadowBlur: 10, shadowColor: 'rgba(59, 130, 246, 0.5)' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
              { offset: 1, color: 'transparent' }
            ]
          }
        },
        z: 10
      },
      {
        name: 'Upper Band',
        type: 'line',
        data: upperBand,
        smooth: true,
        lineStyle: { opacity: 0 },
        stack: 'confidence-band',
        symbol: 'none'
      },
      {
        name: 'Confidence Interval',
        type: 'line',
        data: lowerBand.map((l, i) => upperBand[i] - l),
        smooth: true,
        lineStyle: { opacity: 0 },
        stack: 'confidence-band',
        symbol: 'none',
        areaStyle: {
          color: 'rgba(59, 130, 246, 0.05)'
        }
      }
    ]
  };

  return (
    <div className="w-full h-full min-h-[400px]">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default PredictionChart;
