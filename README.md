# 混凝土耐久性预测系统 (Scientific Rebuild v2.0)

本项目是基于 Tauri v2 + React + Rust 构建的混凝土耐久性预测系统，旨在复刻并超越原始 C# 系统的功能。

## 核心特性
- **高性能科学引擎**: 采用 Rust 异步执行 SVM (ONNX) 推理与 SQLite 查询。
- **现代化 UI/UX**: 采用极简至深的玻璃拟态设计，提供向导式预测流程。
- **科研数据闭环**: 集成材料聚类 (KNN)、热力学压力转换 (ReduceD) 以及海港资源库。
- **AI 辅助能力**: 预留 AI 文献识别接口，支持从 PDF 中自动提取实验参数。

## 快速开始
1. **环境要求**:
   - Node.js 20+
   - Rust (latest stable)
   - Tauri v2 CLI (`npm install -g @tauri-apps/cli`)

2. **安装依赖**:
   ```bash
   npm install
   ```

3. **启动开发环境**:
   ```bash
   npm run tauri dev
   ```

## 项目结构
- `src-tauri/`: Rust 后端，负责 ONNX 推理与数据库 I/O。
- `src/utils/math/`: TypeScript 实现的科学核心算法。
- `src/components/WizardSteps/`: 6 步预测向导组件。
- `src/services/`: 前后端桥接服务。

## 声明
本系统已成功从损坏的 v2 项目中恢复并完成了逻辑对齐。18 维特征向量已根据审计报告进行精准校准。
