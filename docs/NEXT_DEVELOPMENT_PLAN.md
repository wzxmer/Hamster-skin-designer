# 下一步开发计划

## 目标

继续压实新版皮肤工作台从默认模板到可导出皮肤的闭环：

```text
project.sample.json -> SkinEffectModel -> 预览 -> YAML 导出 -> Jsonnet 源码导出 -> 浏览器本地保存
```

本项目不保留 `HamsterDoc`、`示例皮肤`、`蝦米輸入法` 等旧项目参考资料目录；需要追溯字段来源时回旧项目查看。

## 当前已完成基础

- 维护 `packages/project-schema/defaults/project.sample.json`。
- 维护最小 validator。
- 默认模板已固化旧示例皮肤的 `config.yaml`、`collectionData`、`swipeData` 和 `swipeData-en` 数据。
- `apps/workbench` 已作为新版入口，预览接近 Hamster3 CALayer 实际效果。
- 已覆盖 light/dark、insets、键盘高度、26 键布局、数字键盘、候选栏、toolbar、划动显示和导出目标校验。
- 已新增 `keyboardCombo` 组合层模型和工作台模块，用于表达键盘槽位、输入策略、工具栏风格、划动三态和空格行个性化；当前已部分映射到配置与预览行为。
- 已新增 `packages/skin-effect`，预览与导出共享 `SkinEffectModel` / 文件级效果模型。
- Jsonnet 随导出包输出：`effect-files.libsonnet` 保存对象数据，`effect-yaml.libsonnet` 保证 `jsonnet -S -m` 输出和直接 YAML 导出一致。

## 当前工作焦点

- `apps/workbench` 当前正在单独打磨竖屏预览，不处理横屏。
- 中文 `14 / 17 / 18 / 9` 已切到专用预览模板，当前剩余重点是按参考图继续收 `中文九键` 的整体几何关系：左列/右列宽度、三列主键等宽、底排五块比例。
- 英文 `26` 已保留原有带划动版本，并新增 `英文26键竖屏（无划动）` / `英文26键横屏（无划动）` 预览入口；`中英切换键` 使用 `中` + 小号 `/En` 的样式。

## 当前阶段台账

- 当前轮次已把 26 键、toolbar、候选、划动、metrics 的主要预览/导出链路收敛到 `SkinEffectModel`。
- `nativeKeyboardPayloads` 保留为 preset seed / 导入兼容输入，不再作为预览或导出的直接运行真源。
- 已核对 `apps/workbench/src/app.js`：当前只在套用预设时写入 `nativeKeyboardPayloads` 作为 seed；预览读取 `SkinEffectModel` 结果，不再直接跑旧 raw payload。
- 已补回归测试：旧 `nativeKeyboardPayloads` 可作为导入兼容补丁存在，但字号、surface、发送键阴影等左侧 `project.json` 字段必须在 `SkinEffectModel` 中覆盖旧值。
- 图片类样式已接入同源链路：键盘背景、toolbar 背景、展开候选背景、长按气泡和长按选中背景由预览与 `SkinEffectModel` 共同解析；图片素材模块已开放到左侧编辑。

验收：

```powershell
rtk npm run validate:project-schema
```

## 第一阶段：导出核心

- `project.json -> SkinEffectModel -> YAML files`
- `project.json -> SkinEffectModel -> Jsonnet source tree`
- `project.json + assets -> zip`
- 增加最小测试样例。

验收：

```powershell
rtk npm run test:exporter
```

## 第二阶段：预览引擎

- 继续校准 `project.json` 到实际预览的比例关系。
- 继续校准符号键盘、面板、长按候选和 collection 的细节编辑体验；当前已有基础预览和表单联动。
- 保持 `center.x/y` 与实际 CALayer 相对坐标等比例。

验收：

```powershell
rtk npm run test:preview
```

## 第三阶段：网页功能补齐

- 对照字段映射归档和默认模板审查剩余可调项。
- 为缺失字段补可视化编辑模块。
- 继续把 `keyboardCombo` 映射到现有 `config`、`toolbar`、`data.swipes`、预览来源和导出策略。
- 导出 YAML zip 和 Jsonnet zip。
- 手动保存到浏览器本地缓存，刷新后恢复。

验收：

```powershell
rtk npm run build
```

## 最终校验

每阶段通过后才能进入下一阶段。最终执行全量校验，若失败则修复后重跑。
