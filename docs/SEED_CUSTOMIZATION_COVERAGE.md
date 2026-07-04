# 预设 Seed 自定义覆盖矩阵

## 定位

本文追踪“预设 seed 中的能力”是否已经迁移为 `project.json` 受控字段、左侧模块、预览和导出测试。目标是把工作台做成完整皮肤设计器，而不是固定预设选择器。

预设只提供默认起点。用户通过左侧模块修改后的 `project.json` 才是预览、YAML、Jsonnet 和 cskin 的真源。

## 状态标记

| 状态 | 含义 |
|---|---|
| 已覆盖 | 有受控字段、有左侧模块、预览/导出链路已接入 |
| 部分覆盖 | 有受控字段或链路，但 UI、预览、导出测试有缺口 |
| 待补 | seed 或导出里有能力，但尚未形成完整受控模块 |
| 暂缓 | 底层保留，当前产品阶段不开放 |

## 覆盖矩阵

| 能力域 | seed 来源 | 受控字段 | 左侧模块 | 预览/导出链路 | 当前状态 | 下一步 |
|---|---|---|---|---|---|---|
| 键盘槽位与预设选择 | 示例 preset、`config.yaml` | `keyboardCombo`、`guide`、`config` | 使用引导 | `SkinEffectModel` 生成有效 config | 部分覆盖 | 继续补 9/14/17/18/26、数字、符号、Emoji、panel 的切换回归 |
| 26/9/14/17/18 布局骨架 | `nativeKeyboardPayloads.*.keyboardLayout` | `keyboardCombo.slots`、`keyboards.*.metrics` | 使用引导、自定义键盘、按键尺寸 | `sanitizeNativePayload()` 归一化后导出 | 部分覆盖 | 建立各布局可编辑项清单，避免 raw layout 成为黑盒 |
| 横屏 26 布局模式 | seed 横屏 payload | `guide.preferences.*LandscapeLayout` | 使用引导 | 预览已区分默认/常规 26 | 部分覆盖 | 补导出语义审查：确认常规 26 是否需要影响实际 YAML |
| 键盘高度与区域高度 | seed `preeditHeight`、`toolbarHeight`、`keyboardHeight` | `keyboardFrame` | 键盘高度 | 预览和导出读取 `SkinEffectModel` | 已覆盖 | 增加不同键盘类型的 focused 回归 |
| 键帽边距 | seed background style insets | `keyStyles.buttonInsets` | 按键边距 | 预览和导出共用 | 已覆盖 | 补数字/符号/panel 同类覆盖断言 |
| 键帽立体样式 | seed geometry style | `keyStyles.surfaceStyles` | 按键立体样式 | 预览和导出共用 | 已覆盖 | 收敛 9/14/17/18/数字使用同一视觉基调 |
| 颜色 | seed `normalColor` / `highlightColor` | `theme.light.colors`、`theme.dark.colors` | 颜色 | `SkinEffectModel` 覆盖 seed，预览同步 | 部分覆盖 | 扫描剩余 raw 颜色：collection、symbolic、panel、候选区 |
| 字号 | seed text style `fontSize` | `theme.shared.fontSize` | 字号 | 预览和导出共用 | 部分覆盖 | 按键、划动、toolbar、候选、panel 分组补完整覆盖表 |
| 前景偏移 | seed text/systemImage `center` | `theme.shared.center`、`customCenters` | 偏移 | 预览和导出共用；预览可做显示映射 | 部分覆盖 | 梳理单键中心、功能键、toolbar、候选、panel 是否都有 UI |
| 前景缩放 | preview-only seed 映射 | `theme.shared.scale` | 前景缩放 | 只应影响预览显示，不污染导出 | 部分覆盖 | 标明哪些缩放是预览校准字段，哪些应导出 |
| 键帽文案 | seed foreground `text` | `keyboards.keyboard26.*`、`toolbar.text` | 自定义键盘、toolbar | 预览和导出共用 | 部分覆盖 | 补 9/14/17/18、数字、符号、panel 的文案编辑入口 |
| 按键动作 | seed `action`、`swipe*Action` | `keyboards.*.keyActions`、`toolbar.actions`、`data.swipes` | 自定义键盘、划动设置、toolbar | 导出为 Hamster action；预览只模拟状态 | 部分覆盖 | 清点特殊动作：中英、123、返回、收起、panel、符号/Emoji |
| toolbar 布局与按钮 | seed `toolbarLayout`、toolbar buttons | `toolbar.*`、`keyboardCombo.toolbar` | 自定义键盘、候选样式、使用引导 | 预览和导出共用 | 部分覆盖 | 补横屏遮挡、按钮数量、顺序、动作的回归覆盖 |
| 候选区样式 | seed `candidateStyle`、candidate layouts | `toolbar.horizontalCandidates`、`toolbar.verticalCandidates`、`theme.*.colors` | 候选样式 | 预览和导出共用 | 部分覆盖 | 统一 14 候选颜色、展开候选、横竖候选测试 |
| 划动数据 | `swipeData*.libsonnet` / seed action | `data.swipes`、`keyboardCombo.swipeBehavior` | 划动设置 | 预览显示和导出动作共用 | 已覆盖 | 继续避免默认关闭时导出旧 seed 划动 |
| 长按候选 | `hintSymbolsData.libsonnet` / seed hint styles | `data.hints`、`theme.shared.fontSize/center` | 长按设置 | 预览和导出共用 | 部分覆盖 | 补 UI 易用性和按键级覆盖 |
| 符号/Emoji 数据源 | `collectionData.libsonnet` | `data.collections`、`keyboardCombo.slots.symbolic/emoji` | 符号数据源、使用引导 | 默认 App 内键盘；自定义时导出 | 部分覆盖 | 明确 system/custom 两条路径，补 emoji/panel 自定义入口 |
| 自定义 panel | seed panel payload | `keyboards.panel`、`keyboardCombo.slots.panel` | 自定义键盘 | 预览已有基础，导出部分接入 | 部分覆盖 | 补 panel 内容、图标、动作、尺寸的左侧编辑 |
| 图片素材 | seed fileImage / asset refs / resources yaml | `assets.resources` + `assets.images` | 图片素材 | 底层兼容，UI 暂禁用 | 进行中 | 先建立资源图集模型，再开放预览、编辑与导出 |
| 动画 | seed `animation` | `theme.shared.animation` | 按键动画 | 底层映射，UI 暂禁用 | 暂缓 | 等预览交互验证稳定后开放 |
| 导出包结构 | 旧 builder / template | `export`、`config`、package builder | 皮肤配置 | exporter 输出 YAML / Jsonnet / zip | 已覆盖 | 继续守住 GitHub Pages 静态和 Jsonnet 包结构约束 |

## 第一批优先级

1. **颜色与视觉基调残留**：继续扫 raw seed 中未被 `theme` / `keyStyles` 覆盖的颜色、阴影、collection 背景，优先影响 9/14/17/18、数字、符号、panel。
2. **布局/内容黑盒**：把各布局的键位文案、动作、功能键引用整理成受控字段，不让 raw `keyboardLayout` 独占最终效果。
3. **候选区统一**：14 键候选颜色、9 键数字、符号/Emoji/panel 的候选/collection 风格需要统一到中文键盘视觉基调。
4. **toolbar 横竖屏一致性**：按钮数量、间距、横屏遮挡、菜单/panel/收起动作继续补回归。
5. **暂缓模块显式禁用**：图片素材、动画保留底层字段，但左侧继续禁用，直到导入、缓存、导出闭环完整。

## 更新规则

- 每新增一个左侧模块，必须在本表把状态从“待补/部分覆盖”更新到更准确状态。
- 每发现 raw seed 字段影响实机导出，必须记录属于哪个能力域。
- 如果字段是用户应能自定义的能力，优先补 schema 和模块；不能只在 `sanitizeNativePayload()` 里长期特判。
- 如果字段只是兼容旧导入，需要写明“兼容输入”，避免误当产品功能。
