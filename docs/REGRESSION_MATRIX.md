# 回归矩阵

## 定位

本文规定“改哪里必须查哪里、测哪里、同步哪里”。它是每次修改前后的检查表。

## 总矩阵

| 改动区域 | 必查链路 | 必测 | 必同步文档 |
|---|---|---|---|
| `apps/workbench/src/ui/preview-adapter.js` | 26、当前目标预设、数字、符号、Emoji、panel、竖屏/横屏、toolbar | `rtk npm run test:preview`、`rtk npm run build` | `REQUIREMENTS.md`，如行为变化；`ARCHITECTURE_DECISIONS.md`，如边界变化 |
| `apps/workbench/src/ui/preview.js` / `styles.css` | renderer/CSS 是否只影响显示；是否覆盖 adapter 责任 | `rtk npm run test:preview`、`rtk npm run build`，必要时截图 | `REQUIREMENTS.md`，如用户可见行为变化 |
| `packages/skin-effect/index.js` | preview、YAML、Jsonnet、cskin、seed 兼容 | `rtk npm run test:preview`、`rtk npm run test:exporter`、`rtk npm run build` | `PROJECT_SCHEMA.md`、`REQUIREMENTS.md`、`ARCHITECTURE_DECISIONS.md` |
| `packages/exporter/index.js` | 直接 YAML、Jsonnet source、zip 包结构、demo、config.yaml | `rtk npm run test:exporter`、`rtk npm run build` | `REQUIREMENTS.md`、`ARCHITECTURE_DECISIONS.md` |
| `packages/project-schema/defaults/project.sample.json` | validator、UI 默认值、SkinEffectModel、preview、exporter | `rtk npm run validate:project-schema`、`rtk npm run test:preview`、`rtk npm run test:exporter` | `PROJECT_SCHEMA.md`、`SAMPLE_SKIN_FIELD_MAP.md` |
| `apps/workbench/src/app.js` | 左侧字段、右侧预览、重置路径、导出字段、localStorage/IndexedDB | `rtk npm run test:preview`、`rtk npm run build` | `REQUIREMENTS.md`，如用户流程变化 |
| `apps/workbench/src/data/modules.js` | 模块是否写受控字段；是否有对应预览/导出 | `rtk npm run test:preview`、`rtk npm run build` | `PROJECT_SCHEMA.md`、`REQUIREMENTS.md` |
| `apps/workbench/index.html` | 启动遮罩、样式加载、脚本加载、GitHub Pages 子路径 | `rtk npm run build`，必要时浏览器手测 | `REQUIREMENTS.md`，如启动体验变化 |
| `package.json` scripts | README / DEVELOPMENT_GUIDE / GitHub Pages 约束是否仍匹配 | 相关脚本实际运行或文档自审 | `README.md`、`DEVELOPMENT_GUIDE.md`、`ARCHITECTURE_DECISIONS.md` |
| `packages/preview-engine/test-preview-linkage.js` | 测试是否覆盖当前行为，不只覆盖实现细节 | `rtk npm run test:preview` | `REGRESSION_MATRIX.md`，如门禁变化 |
| `packages/exporter/test-exporter.js` | YAML / Jsonnet / 包结构断言是否同步 | `rtk npm run test:exporter` | `REGRESSION_MATRIX.md`，如门禁变化 |
| `docs/*` | 是否和 AGENTS / README / 当前代码事实冲突 | 文档自审，必要时跑相关测试 | `INDEX.md`，如入口变化 |

## 键盘覆盖矩阵

| 场景 | 必看 |
|---|---|
| 26 键视觉变化 | 26、无划动 26、Shift、123、cnen、space、enter、backspace、toolbar |
| 中文变体变化 | 9、14、17、18、26、space row、cnen、symbol、返回 |
| 数字键盘变化 | iOS 数字、9 键数字、return、symbol、period、equal、enter、collection |
| 符号键盘变化 | symbolic、collections、category、return、toolbar symbol action |
| Emoji 变化 | system/custom 来源、toolbar emoji action、config.yaml 是否写映射 |
| panel 变化 | panel layout、浮动缩放、圆角、toolbar menu action |
| toolbar 变化 | 图标/文字模式、actions、候选栏、展开候选、关闭按钮 |
| 划动变化 | `swipesEnabled`、pinyin、alphabetic、numeric、visible/hidden/disabled |
| 横屏变化 | landscape 高度、split/standard 26、toolbar、候选栏、所有目标键盘 |
| 校准模式变化 | 真实字号、真实中心点、preview-only 缩放关闭、导出不变 |
| 引导预设切换 | `keyboardCombo`、effective config、旧 config 映射清理、preview list |

## 导出包结构矩阵

| 检查项 | 要求 |
|---|---|
| 根目录 | 皮肤名文件夹 |
| 必含文件 | `config.yaml`、`README.md` |
| 必含目录 | `light/`、`dark/`、`jsonnet/` |
| Jsonnet 入口 | `jsonnet/main.jsonnet` |
| Jsonnet 入口内容 | `import 'core/build.libsonnet'` |
| 必含源码目录 | `jsonnet/core/`、`jsonnet/keyboard/`、`jsonnet/lib/` |
| 主路线 | Jsonnet 模式应用和复用为主，YAML 为同源安装/兼容产物 |
| 默认不含 | `project.json`、`jsonnet/generated/` |
| 可选 | `demo.png` |

## 验证命令选择

| 改动类型 | 最小验证 | 完整验证 |
|---|---|---|
| 只改文档 | 文档自审 | 可选 `git diff --check` |
| schema / 默认值 | `rtk npm run validate:project-schema` | 加 `test:preview`、`test:exporter`、`build` |
| 预览 | `rtk npm run test:preview` | 加 `rtk npm run build`、浏览器截图 |
| 导出 | `rtk npm run test:exporter` | 加 `rtk npm run build`、Jsonnet 编译对比 |
| preview/export 同源 | `test:preview` + `test:exporter` | 加 `build` 和 import-test |
| UI 工作流 | `rtk npm run build` | 加浏览器手测 |
| 引导/键盘组合 | `rtk npm run test:preview` + `rtk npm run test:exporter` | 加 `rtk npm run build` |

## 文档同步矩阵

| 变化 | 文档 |
|---|---|
| 用户目标或体验变化 | `docs/REQUIREMENTS.md` |
| 架构真源或责任层变化 | `docs/ARCHITECTURE_DECISIONS.md`、`docs/WORKBENCH_ARCHITECTURE.md` |
| 字段结构变化 | `docs/PROJECT_SCHEMA.md` |
| 示例字段来源变化 | `docs/SAMPLE_SKIN_FIELD_MAP.md` |
| 验证策略变化 | `docs/REGRESSION_MATRIX.md` |
| 修改流程变化 | `docs/CHANGE_PROTOCOL.md` |
| 当前阶段变化 | `docs/NEXT_DEVELOPMENT_PLAN.md` |
| 文档新增/重命名 | `docs/INDEX.md`、`README.md` |

## 高风险组合

- 改 `packages/skin-effect` 但只跑预览测试。
- 改 `preview-adapter` 后未看数字/符号/panel。
- 改导出包结构但只检查 zip 内 YAML。
- Jsonnet 主路线被降级成可选附带物。
- 改 `project.sample.json` 后没同步 schema 文档。
- 改 toolbar actions 后只看视觉、不看导出动作对象。
- 用预览隐藏状态影响导出键盘文件。
- 只在 Obsidian 记录新规则，仓库 docs 未同步。
- 切换中文/数字预设后，`config.yaml` 残留上一轮键盘映射。
- 校准模式改变导出结果。
- 恢复旧 `apps/builder` 为核心链路。
