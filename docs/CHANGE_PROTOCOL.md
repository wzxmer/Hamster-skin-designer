# 修改联动协议

## 定位

本文规定每次修复、升级、重构、文档调整的固定流程。目标是减少局部补丁导致的跨链路回归。

## 改前流程

1. 明确任务类型：
   - 预览
   - 导出
   - schema / 默认值
   - 左侧编辑模块
   - 键盘布局 / 组合
   - UI 视觉 / 交互
   - 文档 / 规则
2. 查 `docs/INDEX.md` 对应入口。
3. 查 `docs/REGRESSION_MATRIX.md` 对应行。
4. 明确责任层：
   - 状态层：`project.json`
   - resolved 层：`packages/skin-effect`
   - 预览映射层：preview adapter
   - 预览渲染层：preview renderer / CSS
   - 导出层：exporter / Jsonnet
   - 展示层：workbench UI
5. 看当前 `git diff`，不要覆盖用户已有改动。

## 改中规则

- 不跨责任层写临时补丁。
- 不为视觉显示修改真实导出语义，除非需求明确要求改变最终皮肤产物。
- 不为单个键盘路径叠长期特判；同类键盘要走共享模型或明确分支。
- 不把 `nativeKeyboardPayloads` 恢复成运行真源。
- 不让 preview/export/import 各自维护隐形默认值。
- 不把 `jsonnet/generated/` 放入默认应用包。
- 不把 Obsidian 看板当作规则真源。

## 改后流程

1. 按 `docs/REGRESSION_MATRIX.md` 跑对应验证。
2. 检查是否需要同步文档：
   - 行为变化：`docs/REQUIREMENTS.md`
   - 架构边界变化：`docs/ARCHITECTURE_DECISIONS.md`、`docs/WORKBENCH_ARCHITECTURE.md`
   - 字段/schema 变化：`docs/PROJECT_SCHEMA.md`、`docs/SAMPLE_SKIN_FIELD_MAP.md`
   - 验证门禁变化：`docs/REGRESSION_MATRIX.md`
   - 阶段计划变化：`docs/NEXT_DEVELOPMENT_PLAN.md`
   - 文档入口变化：`docs/INDEX.md`、`README.md`
3. 做 diff 自审：
   - 有没有临时日志。
   - 有没有死代码或死文档。
   - 有没有改到无关文件。
   - 有没有让预览和导出分叉。
4. final 报告：
   - 改了什么。
   - 同步了哪些文档。
   - 跑了哪些验证。
   - 哪些验证未跑及原因。
   - 剩余风险。

## 校准类任务流程

适用描述：

- 右侧预览与真机效果不符。
- 实机预览有偏差。
- 校准预览。
- 看起来偏上、太小、不一致、没联动。

流程：

1. 把用户描述翻译成具体层级问题：
   - 模型字段错误。
   - adapter 映射错误。
   - renderer/CSS 映射错误。
   - 导出语义错误。
2. 优先改 preview adapter / renderer。
3. 需要观察真实字号或中心点时，可使用预览校准模式；校准模式不得写回项目状态或改变导出。
4. 只有证据显示最终皮肤产物语义错误，才改 `packages/skin-effect` 或 `packages/exporter`。
5. 检查同类键盘：
   - 26
   - 9 / 14 / 17 / 18
   - 数字
   - 符号
   - Emoji
   - panel
   - 竖屏 / 横屏
6. 跑：

```powershell
rtk npm run test:preview
rtk npm run build
```

## 导出类任务流程

适用范围：

- YAML 输出。
- Jsonnet 源码包。
- zip / cskin 包结构。
- demo 图。
- config.yaml 映射。

流程：

1. 先确认是否改变实机语义。
2. 检查直接 YAML 和 Jsonnet 源码包两条路径。
3. 检查包结构硬约束。
4. 检查模板兼容字段是否保留。
5. 跑：

```powershell
rtk npm run test:exporter
rtk npm run build
```

## Schema / 默认值任务流程

流程：

1. 先更新 `project.sample.json` 和 validator。
2. 同步工作台编辑模块。
3. 同步 `SkinEffectModel`。
4. 同步预览和导出。
5. 同步文档：
   - `PROJECT_SCHEMA.md`
   - `SAMPLE_SKIN_FIELD_MAP.md`
   - `REQUIREMENTS.md`，如果用户可见行为变化
6. 跑：

```powershell
rtk npm run validate:project-schema
rtk npm run test:preview
rtk npm run test:exporter
rtk npm run build
```

## 引导 / 键盘组合任务流程

流程：

1. 明确改动影响 `guide.preferences`、`keyboardCombo`、`config`、`toolbar` 还是 `data.swipes`。
2. 切换预设时检查旧 config 映射是否被清理。
3. 横屏布局选项只影响 26 键横屏；中文 14 / 17 / 18 等变体横屏不得被覆盖。
4. 检查预览和导出：

```powershell
rtk npm run test:preview
rtk npm run test:exporter
rtk npm run build
```

## 文档任务流程

流程：

1. 先判断文档属于：
   - 索引
   - 需求
   - 决策
   - 流程
   - 回归矩阵
   - schema
   - 计划
2. 不把同一规则复制到太多地方。优先写在拥有该规则的文档，再从索引链接。
3. 写完检查：
   - 是否和 AGENTS 冲突。
   - 是否和 README 入口冲突。
   - 是否有过期路径。
   - 是否有无验证的绝对结论。

## 停手信号

出现以下情况，停止继续叠补丁，重新梳理链路：

- 同一路径连续两次靠新增特判修复。
- 修一个键盘导致另一个键盘回退。
- 预览修复改变导出语义，但需求未要求。
- 导出修复破坏 Jsonnet 包结构。
- 文档和代码事实相反。
- 当前 git diff 包含不理解的用户改动，且会影响本次任务。
