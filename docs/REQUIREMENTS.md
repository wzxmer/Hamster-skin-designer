# 需求文档

## 定位

本文记录产品应满足的长期需求、行为契约和验收标准。它不记录临时聊天流水账，也不替代实现计划。

每次新增功能、修复用户可见行为、调整导出语义、改变预览逻辑后，都要检查本文是否需要同步。

## 产品目标

- 生成手机端实际可用的 Hamster3 皮肤包。
- 用户在网页中编辑受控参数，即可得到可预览、可导出、可复用的皮肤。
- 预览、直接 YAML、Jsonnet 源码包、cskin 导入语义必须同源。
- 工作台必须能作为 GitHub Pages 纯静态网页运行。
- 用户不需要本地 Node 服务、后端接口、绝对本机路径，也能完成核心编辑、预览、导入导出。

## 长期不变量

- `project.json` 是工作台唯一内部模型。
- `packages/skin-effect` 是预览和导出的共享 resolved effect 层。
- `nativeKeyboardPayloads` 只做预设 seed / 导入兼容输入，不做运行真源。
- 预设键盘只提供初始默认值，包括布局、配色、字号、偏移、动作、工具栏、候选区等；预设不是功能边界。
- 左侧模块负责修改 `project.json` 受控字段，长期目标是覆盖所有可导出的皮肤能力。
- 右侧预览负责接近手机端实际皮肤效果，不拥有导出语义。
- 导出器不读取 DOM、不读取 UI store、不隐式读取浏览器缓存。
- 工具路线以 Jsonnet 模式应用和复用为主；默认导出完整皮肤包，包内必须包含可用 Jsonnet 源码工程，同时包含同源生成的 YAML 和 demo 预览图。
- Obsidian 只做看板和导航镜像，规则真源必须在仓库文档内。

## 需求条目模板

新增需求时按此格式写，避免只写口号：

```md
## 需求：名称

### 用户目标
用户要完成什么。

### 当前行为
当前已经怎么做。

### 期望行为
最终应表现为什么。

### 真源
数据或行为由哪一层拥有。

### 责任边界
- 状态层：
- resolved 层：
- 预览层：
- 导出层：

### 禁止
- 不允许什么。

### 影响面
- 影响哪些键盘、导出格式、UI 模块或测试。

### 验收
- 必须跑什么验证。
```

## 需求：预览与导出同源

### 用户目标

用户在工作台调参数后，右侧预览应尽量反映最终手机端皮肤效果；导出的 YAML / Jsonnet / cskin 不应和预览使用两套隐形真源。

### 当前行为

核心链路为：

```text
project.json -> SkinEffectModel -> Preview Adapter -> 预览
project.json -> SkinEffectModel -> YAML / Jsonnet / cskin
```

### 期望行为

- 视觉类字段在右侧预览中可见，或能解释为何只能近似显示。
- 动作类字段右侧可以没有明显视觉变化，但必须能在导出 JSON / YAML / Jsonnet 中验证。
- 同一个字段不得由预览和导出分别维护不同默认值。

### 真源

`project.json` 和 `packages/skin-effect`。

### 责任边界

- 状态层：`project.json` 保存用户可控状态。
- resolved 层：`SkinEffectModel` 统一消化 preset seed、组合层、主题 token、metrics 和动作归一化。
- 预览层：preview adapter / renderer 只负责视觉近似。
- 导出层：exporter 输出最终手机端应用语义。

### 禁止

- 不允许 `preview.js` 绕过 `SkinEffectModel` 自建长期真源。
- 不允许为了预览好看修改 YAML / Jsonnet / cskin 导出语义。
- 不允许导出器直接读 UI 状态或 DOM。

### 影响面

- 26 键、9 / 14 / 17 / 18、数字、符号、Emoji、panel。
- 竖屏、横屏、toolbar、候选栏、按压态、上划/下划、长按候选。
- YAML、Jsonnet、cskin、demo 图。

### 验收

```powershell
rtk npm run test:preview
rtk npm run test:exporter
rtk npm run build
```

## 需求：预设只是默认 seed，模块提供完整自定义

### 用户目标

用户选择一个预设后，应得到一个可继续自由编辑的起点，而不是被限制在预设固定能力内。用户应能通过左侧模块逐步自定义每个布局、键盘内容、样式、动作、候选区、工具栏和导出相关能力。

### 当前行为

预设会写入 `project.json` 的受控字段，并可携带 `nativeKeyboardPayloads` 作为示例皮肤 seed。预览和导出通过 `SkinEffectModel` 消化这些 seed 和用户配置。

### 期望行为

- 预设只提供默认布局和默认视觉/行为参数。
- 用户改动后，以 `project.json` 中的受控字段为准。
- 左侧模块应逐步覆盖所有可导出字段；缺少 UI 的字段应进入开发计划，而不是被视为预设不可改限制。
- 预设之间可以有布局差异，但颜色、字体、阴影、边距、动作等能力应尽量模块化表达，不能藏在 raw seed 里成为不可控黑盒。

### 真源

`project.json` 的受控字段和 `packages/skin-effect` resolved 结果。

### 责任边界

- 状态层：保存用户选择和自定义字段。
- resolved 层：把 preset seed、用户字段、兼容输入归一为最终 native payload。
- 预览层：只显示 resolved 结果。
- 导出层：只导出 resolved 结果。

### 禁止

- 不允许把预设 seed 当作用户不可修改的最终规则。
- 不允许左侧模块直接写 raw `nativeKeyboardPayloads`。
- 不允许为了某个预设的临时效果，在预览或导出里维护第二套隐藏默认值。

### 影响面

- 9 / 14 / 17 / 18 / 26、数字、符号、Emoji、panel。
- 布局、键帽内容、颜色、字号、偏移、阴影、insets、toolbar、候选区、动作、划动。

### 验收

- 新增或清理 seed 字段时，需要确认是否已有对应受控字段或补入 `docs/NEXT_DEVELOPMENT_PLAN.md`。
- 修改任一预设时，需要检查同类字段是否仍能被左侧模块覆盖。

## 需求：预览校准不改变实机语义

### 用户目标

当用户反馈“右侧预览与真机效果不符”时，优先校准网页预览，让网站预设数值、右侧预览和真机效果保持一致。

### 期望行为

- 先判断差异属于 `SkinEffectModel`、preview adapter/model、renderer/CSS，还是导出语义。
- 纯预览缩放、锚点、字号显示、视觉中心偏移，应优先在 preview adapter / renderer 层解决。
- 工作台可提供预览校准模式，用真实字号、真实中心点和检查轮廓帮助定位遮挡或偏移问题。
- 校准模式只影响右侧预览显示，不改变 `project.json`、`SkinEffectModel`、YAML、Jsonnet 或 cskin 导出语义。
- 只有用户明确要求改变最终皮肤产物，才修改 `packages/skin-effect` 或 `packages/exporter` 的实机语义。

### 禁止

- 不允许用 renderer 局部特判掩盖上游模型字段错误。
- 不允许用修改 `project.sample.json` 默认值来掩盖预览映射偏差，除非默认值本身已被证据证明错误。

### 验收

```powershell
rtk npm run test:preview
rtk npm run build
```

必要时补浏览器截图或真机导入验证。

## 需求：导出包结构稳定

### 用户目标

用户导出的皮肤包应优先支持 Jsonnet 模式应用和复用，同时保留同源 YAML 作为安装/兼容产物。

### 期望行为

应用包根目录必须是皮肤名文件夹，内部包含：

- `config.yaml`
- `light/`
- `dark/`
- `jsonnet/main.jsonnet`
- `jsonnet/core/`
- `jsonnet/keyboard/`
- `jsonnet/lib/`
- `README.md`
- 可选 `demo.png`

### 禁止

- 默认应用包不包含 `project.json`。
- 默认应用包不包含 `jsonnet/generated/`。
- `jsonnet/main.jsonnet` 不得改成直接 import generated 快照；必须保持 `import 'core/build.libsonnet'`。
- `jsonnet/lib/*.libsonnet` 不得被内部 `project.json` schema 整包覆盖。
- 不允许只保证 zip 内 YAML 正确而忽略 Jsonnet 模式；Jsonnet 编译输出必须与直接 YAML 关键文件同源一致。

### 验收

```powershell
rtk npm run test:exporter
rtk npm run build
```

修改 Jsonnet 输出时，还要检查直接 YAML 与 Jsonnet 编译输出是否语义一致。

## 需求：GitHub Pages 静态可运行

### 用户目标

用户打开 GitHub Pages 页面即可使用核心工作台功能。

### 期望行为

- 编辑、预览、导入、导出不依赖本地 Node 服务。
- 不依赖绝对本机路径。
- 可选外部服务失败时，核心功能降级可用。
- 资源路径适配子路径部署。
- 旧 `apps/builder` 本地服务不是长期核心链路；后续架构不得围绕旧 builder 设计。
- 开发服务器只用于本地开发，不是用户主路径依赖。

### 验收

```powershell
rtk npm run build
```

必要时在本地静态入口或 Pages 部署后验收。

## 需求：本地模板缓存

### 用户目标

用户可以手动保存模板，刷新后继续编辑，不必每次下载文件。

### 期望行为

- `localStorage` 保存最后打开项目 id 和轻量 UI 状态。
- `IndexedDB` 保存模板快照、项目 JSON、素材 Blob。
- 导出文件仍来自当前 `project.json`，不能把缓存状态当作独立真源。

### 验收

- 刷新后恢复用户保存模板。
- 导出结果与当前项目状态一致。

## 需求：文档联动

### 用户目标

后续修复和升级时，代理不因忘记背景、只看局部文件、或跳过回归面而引入新 BUG。

### 期望行为

- 改前查 `docs/INDEX.md` 和 `docs/REGRESSION_MATRIX.md`。
- 行为变化同步 `docs/REQUIREMENTS.md`。
- 架构边界变化同步 `docs/ARCHITECTURE_DECISIONS.md`。
- 字段/schema 变化同步 `docs/PROJECT_SCHEMA.md` 和 `docs/SAMPLE_SKIN_FIELD_MAP.md`。
- final 必须报告同步过哪些文档、跑过哪些验证、剩余风险。

## 需求：键盘组合切换清理旧映射

### 用户目标

用户在引导模块切换中文预设、数字键盘类型或横屏布局后，导出的 `config.yaml` 应反映当前选择，不残留上一轮生成的旧键盘映射。

### 期望行为

- 中文预设切回 26 时，`config.pinyin` 应回到 `pinyin_26_portrait` / `pinyin_26_landscape`。
- 数字键盘从 iOS 切回 9 时，`config.numeric` 应回到 `numeric_9_portrait` / `numeric_9_landscape`。
- `SkinEffectModel` / exporter 生成有效 config 时，应以当前 `keyboardCombo` 覆盖旧 config 残留。
- 横屏 26 键可在引导偏好中选择默认 split 或常规 26，但该选项只影响 26 键横屏；14 / 17 / 18 等中文变体横屏保持专用布局。

### 验收

```powershell
rtk npm run test:exporter
rtk npm run test:preview
rtk npm run build
```

## 需求：图片素材模块暂不开放编辑

### 用户目标

用户应清楚当前开放性测试阶段的能力边界，避免误以为图片素材已经完整可编辑。

### 期望行为

- 图片素材引用保留在底层模型和导出链路。
- 左侧图片素材模块暂时禁用，直到素材 Blob 管理、导入、预览、导出闭环完整。
- 欢迎说明和开发文档必须说明“图片素材编辑尚未完整开放”。

### 验收

```powershell
rtk npm run build
```
