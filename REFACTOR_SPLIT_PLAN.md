# 重构拆分基线

## 当前判断

前端主文件 `apps/web/app.js` 已经承担了过多职责：

- 项目状态管理
- 模板加载与版本校验
- 导入导出
- 分享码
- 预设
- 预览渲染
- 可视化编辑器渲染
- JSON 编辑器
- 交互事件绑定
- 撤销重做
- 草稿存储
- 自定义下拉组件

这意味着后续重构不能直接“边改边挪”，必须先按职责切分。

新增前提：

这次切分默认以“GitHub 静态站可运行”为目标，因此优先抽离浏览器端逻辑，不优先扩展本地 builder。

## 建议拆分顺序

### 第一层：不改行为的抽离

先抽纯工具和纯数据逻辑：

- `utils/clone.js`
- `utils/dom.js`
- `utils/download.js`
- `utils/custom-select.js`
- `state/history.js`
- `state/draft.js`
- `state/ui-state.js`

### 第二层：预览与编辑器分家

把 UI 两个大块拆开：

- `preview/`
  - 设备参数
  - 预览样式计算
  - 各键盘预览渲染
  - 预览交互
- `editor/`
  - section 路由
  - 各模块编辑器
  - 表单字段渲染
  - action 编辑器

### 第三层：项目 runtime 独立

从 `app.js` 中分离：

- `runtime/project-loader.js`
- `runtime/project-import-export.js`
- `runtime/template-session.js`
- `runtime/github-safe-actions.js`

### 第四层：模块编辑器拆分

按 `shared-schema` 的 section 一块块拆：

- `editor/sections/mapping.js`
- `editor/sections/color.js`
- `editor/sections/font-size.js`
- `editor/sections/theme.js`
- `editor/sections/others.js`
- `editor/sections/layout.js`
- `editor/sections/keyboard26.js`
- `editor/sections/numeric.js`
- `editor/sections/symbolic.js`
- `editor/sections/toolbar.js`
- `editor/sections/panel.js`
- `editor/sections/hint-symbols.js`
- `editor/sections/swipe.js`
- `editor/sections/collection.js`

## 推荐先拆的最小闭环

如果要开始真正动 `app.js`，最推荐的第一刀是：

1. 自定义下拉组件
2. 草稿与本地 UI 状态
3. 下载与文件导出工具
4. 预览设备参数与预览样式计算

原因：

- 依赖少
- 风险低
- 对主流程影响小
- 拆完以后能明显减轻主文件体积

## 当前不要先做的事

现阶段不建议先做：

- 直接重写整套预览
- 直接把 `project schema` 全部改掉
- 直接切到纯 `yaml` 渲染器
- 一次性把 `app.js` 拆成十几个文件

也不建议先做：

- 围绕 `apps/builder` 扩展新的用户主能力
- 把必须依赖本地命令的链路继续做重

这些事都太容易引入行为漂移。

## 建议的执行策略

后续每一轮重构都按这个节奏：

1. 先抽离一类低耦合代码
2. 做一次功能不变验证
3. 再抽下一类
4. 等主文件压力明显下降后，再动 schema 和渲染链

## 当前辅助文件

为了后续每次改动都能快速对照，项目里已经有：

- `PROJECT_BASELINE.md`
- `REFACTOR_SPLIT_PLAN.md`
- `scripts/compare-template-to-sample.mjs`
- `GITHUB_RUNTIME_CONSTRAINTS.md`
