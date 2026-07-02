# 参考默认皮肤对齐设计

## 背景

当前 `hamster-skin-designer` 的默认模板与右侧预览，虽然已经覆盖了键盘、候选区、工具栏、气泡、长按、符号面板等核心能力，但默认视觉质感与参考工具 `https://ryanwuson.github.io/rime-liur-ios-skin/` 仍有明显差距。

用户本轮目标不是搬运参考工具的整套配置体系，而是：

- 以我们当前 `project.json` / 默认模板 / 预览链路为主；
- 让基础模板的默认皮肤结构、视觉数值、预览效果尽量对齐参考工具默认皮肤；
- 同时保留我们自己的上下滑、下滑、长按动作、hint、toolbar action 等行为数据；
- 工作台右侧预览显示尺寸仍按我们自己的界面缩放，不照搬参考工具页面大小。

用户已额外明确：

- 对齐范围不仅包括普通按键，还包括气泡、长按气泡及其预览效果。

## 目标

- 把基础模板默认视觉体系整体对齐到参考工具默认皮肤。
- 保持 `project.json` 作为唯一内部模型，不引入参考工具自己的 settings 生成体系。
- 让右侧预览在我们自己的显示比例下，呈现“参考默认皮肤缩放版”的观感。
- 保留现有交互行为与导出链路稳定性。

## 非目标

- 不直接照搬参考工具的页面结构、Vue 状态或导出格式。
- 不把当前项目切换到 `.cskin` / `Settings.libsonnet` 体系。
- 不重写 `swipes`、长按动作、hint 数据、toolbar action 语义。
- 不修改工作台整体预览区域的外层尺寸策略。

## 参考结论

根据参考工具源码中的默认值，当前可直接借鉴的主要是以下默认视觉体系：

- 26 键字母键、系统键、空格键、回车键的背景/高亮/字号/边框/阴影/提示字大小；
- 候选区选中态、未选中态、候选控制按钮样式；
- toolbar 按钮颜色与字号；
- 数字键盘数字键、左侧面板、系统键、回车键样式；
- 符号/Emoji 左右 panel 样式；
- 键盘背景、toolbar 背景；
- 气泡文字颜色；
- 默认 swipe hint 文字颜色与大小。

这些值可以映射为我们自己的 `theme`、`keyStyles`、`keyboardFrame`、`metrics`、预览渲染参数，而不必引入参考工具的数据结构。

## 方案比较

### 方案 A：只改预览 CSS

做法：

- 不动默认模板数据，只在 `apps/workbench` 里把右侧预览做得更像参考工具。

问题：

- 新建项目、导出结果、编辑默认值仍不是参考默认皮肤。
- 预览和导出默认值会继续分裂。

结论：

- 不采用。

### 方案 B：映射参考默认视觉值到我们的基础模板与预览

做法：

- 更新默认模板与模板运行时数据；
- 同步修正预览引擎对字体、偏移、气泡、长按、候选区、toolbar、数字/符号/Emoji 样式的默认取值；
- 保留我们的行为层数据与工作台显示缩放。

优点：

- 满足“整体像参考默认皮肤，但仍是我们项目”的目标；
- 预览、默认模板、导出一致；
- 风险可控。

结论：

- 采用本方案。

### 方案 C：整体迁移到参考工具配置体系

问题：

- 会破坏现有 `project.json` 主链；
- 风险远超本轮目标；
- 导出器、schema、编辑器都要被拖入重构。

结论：

- 不采用。

## 确认后的总体方案

采用方案 B，并严格按以下边界执行：

### 1. 对齐层

以下内容尽量按参考工具默认皮肤对齐：

- `theme.shared.fontSize`
- `theme.shared.center`
- `theme.shared.scale`
- `theme.shared.animation`
- `theme.light.colors`
- `theme.dark.colors`
- `keyboardFrame`
- `keyStyles.surfaceStyles`
- `keyStyles.buttonInsets`
- 主要键盘默认 `metrics`
- 候选区默认视觉
- toolbar 默认视觉
- 数字/符号/Emoji 默认视觉
- 气泡与长按气泡预览效果相关的默认视觉参数

### 2. 保留层

以下内容继续保留本项目现有定义：

- `swipes`
- 上下滑动作语义
- 长按动作数据
- hint / hintSymbols 数据
- toolbar action 语义
- panel 按钮行为
- 导出目标结构

### 3. 预览层

- 工作台右侧预览容器尺寸、缩放逻辑继续以我们当前界面为准；
- 只让容器内部渲染出来的默认皮肤样式尽量接近参考默认皮肤；
- 最终效果应理解为“参考默认皮肤在我们工作台里的缩放版”。

## 实施设计

### 阶段 1：统一默认模板真源

主要修改：

- `packages/project-schema/defaults/project.sample.json`
- `apps/web/data/templates/hamster-ios/project-data.json`

目标：

- 让新建项目与模板运行时默认值一致；
- 默认皮肤视觉层改成参考风格；
- 不动行为数据层。

### 阶段 2：修正预览默认渲染

主要修改：

- `apps/workbench/src/ui/preview.js`
- 必要时 `apps/workbench/styles.css`

目标：

- 让右侧预览正确消费更新后的默认值；
- 补齐气泡、长按气泡、候选区、toolbar、数字/符号/Emoji 的视觉细节；
- 保证预览效果和默认模板一致。

### 阶段 3：验证导出与预览一致性

主要验证：

- schema 校验通过；
- 预览构建通过；
- exporter 测试通过；
- build 通过；
- 人工确认右侧预览观感接近参考默认皮肤。

## 风险与应对

### 风险 1：只改了 sample，没改运行时模板数据

应对：

- 同时检查 `project.sample.json` 与 `apps/web/data/templates/hamster-ios/project-data.json`。

### 风险 2：预览对默认值解析不完整

应对：

- 重点复核 `preview.js` 里颜色、字号、偏移、阴影、气泡、长按、候选区和 toolbar 的 fallback。

### 风险 3：视觉对齐时误改行为层

应对：

- 不触碰 swipe action、长按动作、toolbar 行为语义；
- 仅调整视觉 token 和渲染参数。

### 风险 4：参考视觉默认值与我们当前键位几何结构不完全一致

应对：

- 可以调整默认 `metrics` 和 frame；
- 但不重写我们现有键盘布局结构。

## 验证策略

至少执行：

```powershell
rtk npm run validate:project-schema
rtk npm run test:exporter
rtk npm run test:preview
rtk npm run build
```

人工验证重点：

- 新建项目后的默认皮肤是否明显接近参考工具默认皮肤；
- 26 键、数字、符号、Emoji、候选区、toolbar 是否一致提升；
- 气泡与长按气泡观感是否一起改善；
- 上下滑、长按动作数据是否仍按我们自己的现有逻辑工作；
- 工作台右侧预览尺寸仍是我们的界面比例，而不是照搬参考工具页面大小。

## 成功标准

本轮成功标准只有四条：

1. 默认模板的视觉体系明显接近参考工具默认皮肤；
2. 右侧预览在我们自己的显示比例下，仍呈现接近参考默认皮肤的效果；
3. 气泡、长按、候选区、toolbar 不再明显掉队；
4. 我们自己的 swipe / hint / 长按动作 / toolbar 行为语义保持不变。
