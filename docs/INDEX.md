# 文档索引

## 定位

本文是仓库文档总入口。新会话、修复、升级、重构前先看这里，再按任务类型进入对应文档。

文档真源在仓库内。Obsidian 只做看板和导航镜像，不保存唯一规则。

## 快速入口

| 目的 | 文档 |
|---|---|
| 项目总览 | `README.md` |
| 开发入口 | `docs/DEVELOPMENT_GUIDE.md` |
| 架构边界 | `docs/WORKBENCH_ARCHITECTURE.md` |
| 需求真源 | `docs/REQUIREMENTS.md` |
| 架构决策 | `docs/ARCHITECTURE_DECISIONS.md` |
| 修改流程 | `docs/CHANGE_PROTOCOL.md` |
| 回归矩阵 | `docs/REGRESSION_MATRIX.md` |
| 数据模型 | `docs/PROJECT_SCHEMA.md` |
| 字段映射 | `docs/SAMPLE_SKIN_FIELD_MAP.md` |
| Seed 自定义覆盖 | `docs/SEED_CUSTOMIZATION_COVERAGE.md` |
| 当前计划 | `docs/NEXT_DEVELOPMENT_PLAN.md` |
| Obsidian 看板模板 | `docs/OBSIDIAN_DASHBOARD.md` |

## 按任务查文档

| 任务类型 | 先读 | 改动后必须检查 | 验证 |
|---|---|---|---|
| 预览校准 | `REQUIREMENTS.md`、`WORKBENCH_ARCHITECTURE.md`、`REGRESSION_MATRIX.md` | 是否只改预览层；是否误改导出语义 | `rtk npm run test:preview`、`rtk npm run build` |
| 导出变更 | `REQUIREMENTS.md`、`ARCHITECTURE_DECISIONS.md`、`REGRESSION_MATRIX.md` | YAML / Jsonnet / cskin 是否同源；包结构是否回退 | `rtk npm run test:exporter`、`rtk npm run build` |
| Schema / 默认值 | `PROJECT_SCHEMA.md`、`SAMPLE_SKIN_FIELD_MAP.md`、`REGRESSION_MATRIX.md` | UI、预览、导出是否一起读取同一字段 | `rtk npm run validate:project-schema`、`rtk npm run test:preview`、`rtk npm run test:exporter` |
| 预设 seed 清理 | `SEED_CUSTOMIZATION_COVERAGE.md`、`PROJECT_SCHEMA.md`、`ARCHITECTURE_DECISIONS.md` | seed 字段是否迁移为受控字段；是否仍可被左侧模块覆盖 | `rtk npm run test:preview`、`rtk npm run test:exporter` |
| 左侧编辑模块 | `REQUIREMENTS.md`、`PROJECT_SCHEMA.md`、`DEVELOPMENT_GUIDE.md` | 右侧预览、导出字段、重置路径是否同步 | `rtk npm run test:preview`、`rtk npm run build` |
| 键盘布局/组合 | `REQUIREMENTS.md`、`PROJECT_SCHEMA.md`、`REGRESSION_MATRIX.md` | 26 / 9 / 14 / 17 / 18 / 数字 / 符号 / Emoji / panel 是否漏验 | `rtk npm run test:preview`、`rtk npm run test:exporter` |
| UI 视觉/交互 | `REQUIREMENTS.md`、`WORKBENCH_ARCHITECTURE.md` | 是否改变产品行为；是否需要同步需求 | `rtk npm run build`，必要时浏览器截图 |
| 引导模块/预设生成 | `PROJECT_SCHEMA.md`、`REQUIREMENTS.md`、`REGRESSION_MATRIX.md` | `guide`、`keyboardCombo`、`config` 是否同步；旧映射是否清理 | `rtk npm run test:preview`、`rtk npm run test:exporter`、`rtk npm run build` |
| 文档/规则调整 | `CHANGE_PROTOCOL.md`、`ARCHITECTURE_DECISIONS.md` | 是否和 AGENTS / README / 现有 docs 冲突 | 文档自审 |

## 责任层索引

| 责任 | 真源/入口 | 说明 |
|---|---|---|
| 用户可编辑项目状态 | `project.json` / `packages/project-schema/defaults/project.sample.json` | 工作台内部唯一模型 |
| resolved effect | `packages/skin-effect` | 预览和导出共享效果模型 |
| 预览专用映射 | `apps/workbench/src/ui/preview-adapter.js` | 只能做视觉近似和兼容映射，不回写真源 |
| 预览渲染 | `apps/workbench/src/ui/preview.js`、`apps/workbench/styles.css` | 负责显示，不拥有导出语义 |
| 工作台编辑 | `apps/workbench/src/app.js`、`apps/workbench/src/data/modules.js` | 左侧模块写 `project.json` 受控字段 |
| 导出 | `packages/exporter` | 输出 YAML / Jsonnet / zip / cskin 相关文件 |
| 预览联动测试 | `packages/preview-engine/test-preview-linkage.js` | 检查预览链路 |
| 导出测试 | `packages/exporter/test-exporter.js` | 检查导出链路 |

## 文档同步规则

| 如果改了 | 同步 |
|---|---|
| 产品目标、用户可见行为、验收标准 | `docs/REQUIREMENTS.md` |
| 架构边界、真源归属、禁止事项 | `docs/ARCHITECTURE_DECISIONS.md`、`docs/WORKBENCH_ARCHITECTURE.md` |
| 字段、默认值、schema、兼容输入 | `docs/PROJECT_SCHEMA.md`、`docs/SAMPLE_SKIN_FIELD_MAP.md` |
| 修改流程、验证门禁、回归范围 | `docs/CHANGE_PROTOCOL.md`、`docs/REGRESSION_MATRIX.md` |
| 当前阶段计划或优先级 | `docs/NEXT_DEVELOPMENT_PLAN.md` |
| 文档入口、文件职责、导航 | `docs/INDEX.md`、`README.md` |

## 新会话最低阅读顺序

1. `AGENTS.md`
2. `README.md`
3. `docs/INDEX.md`
4. `docs/REQUIREMENTS.md`
5. `docs/WORKBENCH_ARCHITECTURE.md`
6. `docs/PROJECT_SCHEMA.md`
7. `docs/NEXT_DEVELOPMENT_PLAN.md`
8. 当前 `git diff`
