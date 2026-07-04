# Obsidian 看板模板

## 定位

本文是 Obsidian 看板模板。复制到 Obsidian 后只做导航和当前状态提醒。长期规则仍以仓库 docs 为准。

## 模板

```md
# Hamster Skin Designer 看板

## 当前目标
-

## 当前任务类型
- [ ] 预览
- [ ] 导出
- [ ] schema / 默认值
- [ ] 左侧编辑模块
- [ ] 键盘布局 / 组合
- [ ] UI 视觉 / 交互
- [ ] 文档 / 规则

## 改前必读
- [ ] AGENTS.md
- [ ] README.md
- [ ] docs/INDEX.md
- [ ] docs/REQUIREMENTS.md
- [ ] docs/REGRESSION_MATRIX.md
- [ ] 当前 git diff

## 本次涉及责任层
- [ ] project.json
- [ ] packages/skin-effect
- [ ] preview adapter
- [ ] preview renderer / CSS
- [ ] exporter / Jsonnet
- [ ] workbench UI
- [ ] docs

## 当前风险
- [ ] preview/export/import 是否同源
- [ ] Jsonnet 包结构是否回退
- [ ] 26 / 9 / 14 / 17 / 18 是否漏验
- [ ] 数字 / 符号 / Emoji / panel 是否漏验
- [ ] 横屏是否漏验
- [ ] toolbar action 是否只看了视觉
- [ ] 是否把 Obsidian 当成规则真源

## 需同步文档
- [ ] docs/REQUIREMENTS.md
- [ ] docs/ARCHITECTURE_DECISIONS.md
- [ ] docs/CHANGE_PROTOCOL.md
- [ ] docs/REGRESSION_MATRIX.md
- [ ] docs/PROJECT_SCHEMA.md
- [ ] docs/SAMPLE_SKIN_FIELD_MAP.md
- [ ] docs/NEXT_DEVELOPMENT_PLAN.md
- [ ] docs/INDEX.md

## 需跑验证
- [ ] rtk npm run validate:project-schema
- [ ] rtk npm run test:preview
- [ ] rtk npm run test:exporter
- [ ] rtk npm run build
- [ ] 浏览器截图 / 手测
- [ ] 手机导入 / cskin 验证

## 快捷入口
- repo: D:\GithubProject\hamster-skin-designer
- index: docs/INDEX.md
- requirements: docs/REQUIREMENTS.md
- decisions: docs/ARCHITECTURE_DECISIONS.md
- protocol: docs/CHANGE_PROTOCOL.md
- matrix: docs/REGRESSION_MATRIX.md

## 本次结论
- 改了什么：
- 同步了哪些文档：
- 跑了哪些验证：
- 剩余风险：
```

## 使用规则

- 看板只记录当前任务状态。
- 新需求、新约束、新决策必须回写仓库 docs。
- 看板里的勾选状态不作为代码审查依据。
- 交接新会话时，把仓库路径、目标、已读文档、当前 diff 风险、下一步写清楚即可。
