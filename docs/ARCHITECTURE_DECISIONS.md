# 架构决策

## 定位

本文记录长期有效的架构决策、原因、禁止事项和回滚信号。修改核心链路前先看本文。

## ADR-001：`project.json` 是唯一内部模型

### 决策

工作台内部只维护 `project.json`。YAML、Jsonnet、cskin 都是导出产物或兼容输入，不是 UI 状态真源。

### 原因

- 用户需要受控编辑，不需要面对完整 YAML / Jsonnet 自由度。
- light / dark、多设备、多键盘、多格式导出需要统一中间模型。
- 直接编辑导出产物会导致预览、导出、导入各维护一套状态。

### 禁止

- UI 模块直接写 YAML / Jsonnet 文件结构。
- 把 `nativeKeyboardPayloads` 当作左侧模块长期写入目标。
- 为局部预览方便新增第二套状态真源。

### 回滚信号

- 同一字段在 `project.json`、raw payload、preview model 中出现互相覆盖。
- 用户改左侧字段，右侧预览生效但导出不生效，或反过来。

## ADR-002：预设只是 seed，不是功能边界

### 决策

预设键盘只提供初始默认值，包括布局、配色、字号、偏移、动作、工具栏、候选区等。用户后续通过左侧模块修改的 `project.json` 受控字段才是预览和导出的真源。

### 原因

- 产品目标是皮肤设计器，不是固定预设选择器。
- 用户需要在任意预设基础上继续自由配置每个布局和键盘。
- raw seed 适合承接示例皮肤结构，但不适合作为长期不可编辑配置。

### 禁止

- 把某个预设中的固定值当作不可修改规则。
- 左侧模块直接写 `nativeKeyboardPayloads`。
- 为不同预设长期维护互相独立的颜色、字号、阴影或动作真源。

### 回滚信号

- 用户选中某个预设后，左侧模块无法覆盖该预设的导出效果。
- 修一个预设时，需要复制同类颜色、字号、动作逻辑到另一个预设。
- raw seed 字段长期影响导出，但没有对应 schema 字段、模块或明确兼容说明。

## ADR-003：`SkinEffectModel` 是预览和导出的共享 resolved 层

### 决策

预览和导出都必须通过 `packages/skin-effect` 生成效果模型。

### 原因

- 预设 seed、默认值、组合层、主题 token、metrics 和动作归一化需要统一处理。
- 直接 YAML、Jsonnet、cskin 和预览必须可追溯到同一 resolved 数据。

### 禁止

- exporter 和 preview adapter 各自补一套隐形默认值。
- 预览直接读取 raw `nativeKeyboardPayloads` 作为长期行为来源。
- 导出器跳过 `SkinEffectModel` 自行解析 UI 状态。

### 验收

```powershell
rtk npm run test:preview
rtk npm run test:exporter
```

## ADR-004：Preview Adapter 只做预览映射

### 决策

Preview Adapter 可以做字号放大、视觉中心偏移、引用别名兼容、行高压缩等显示层调整，但不能回写 `project.json`、`SkinEffectModel` 或导出语义。

### 原因

网页预览是实际 App 皮肤效果的近似模拟器，存在 CSS/CALayer 映射差异。显示差异应留在显示层处理。

### 禁止

- 为了预览接近真机，直接改导出字段语义。
- 在 renderer 中堆叠长期局部特判，绕过 adapter 的统一映射。
- 用预览隐藏状态决定导出包包含哪些键盘。

### 回滚信号

- 预览修复导致 YAML / Jsonnet 输出变化，但用户没有要求改变实机产物。
- 26 键修好了，9 / 14 / 17 / 18 或数字键盘视觉基调被改坏。

## ADR-005：默认导出完整应用包

### 决策

默认导出完整皮肤包。工具路线以 Jsonnet 模式应用和复用为主，包内必须包含可用 Jsonnet 源码工程；YAML 是从同一 `SkinEffectModel` 生成的安装/兼容产物。

### 原因

- 普通用户要直接应用皮肤。
- 高级用户需要 Jsonnet 源码复用和二次修改。
- App 可能使用 Jsonnet 模式应用皮肤，不能只保证 zip 内 YAML 文件正确。

### 禁止

- 默认应用包包含 `project.json`。
- 默认应用包包含 `jsonnet/generated/`。
- `jsonnet/main.jsonnet` 直接 import generated 快照。
- 用内部 schema dump 覆盖模板源码 lib。
- 只验证 YAML，不验证 Jsonnet 源码包结构和编译结果。

### 验收

```powershell
rtk npm run test:exporter
rtk npm run build
```

## ADR-006：GitHub Pages 是核心运行环境

### 决策

首要产品形态是纯前端网页工作台，可部署到 GitHub Pages。

### 原因

- 用户能直接打开网页使用。
- 核心能力不依赖本地服务，降低交付和维护成本。

### 禁止

- 核心编辑、预览、导入、导出依赖后端 API。
- 核心路径使用绝对本机路径。
- 只在开发服务器中成立的行为进入主流程。

### 验收

```powershell
rtk npm run build
```

## ADR-007：Obsidian 只做看板，不做规则真源

### 决策

Obsidian 用来聚合当前目标、风险、待同步文档和快捷入口。仓库 docs 才是长期规则真源。

### 原因

- 规则必须跟代码一起版本管理。
- 代理在仓库内能直接读取 docs。
- Obsidian 适合提醒和导航，不适合作为唯一工程契约。

### 禁止

- 只在 Obsidian 记录需求或架构规则，仓库 docs 不同步。
- 把 Obsidian 看板状态当成代码行为依据。

## ADR-008：旧本地 Builder 链路已移除

### 决策

旧 `apps/builder` 本地服务和相关脚本不再作为项目长期链路保留。当前核心链路以 `apps/workbench`、`packages/skin-effect`、`packages/exporter` 和纯前端静态运行约束为准。

### 原因

- 首要产品形态是 GitHub Pages 纯静态网页。
- 旧 builder 会让架构回到本地 Node 服务依赖，和用户主路径冲突。
- 模板抽取、比对、校验可作为维护脚本存在，但不能成为用户运行前提。

### 禁止

- 恢复 `apps/builder` 作为核心开发或用户主路径。
- 在 README 或运行文档中继续推荐 `dev:builder`。
- 新功能依赖本地 builder 才能编辑、预览、导入或导出。

## ADR-009：校准模式是预览诊断工具

### 决策

右侧预览可提供校准模式，用真实字号/中心点和检查轮廓定位遮挡、缩放、偏移问题。

### 原因

日常预览为了接近视觉效果，会有 preview-only 字号缩放和中心映射。校准时需要临时关闭这些预览增强，直接观察真实字段。

### 禁止

- 校准模式写回 `project.json`。
- 校准模式改变 `SkinEffectModel` 或导出结果。
- 用校准模式替代导出语义验证。
