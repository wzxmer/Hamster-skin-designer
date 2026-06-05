# 元书输入法皮肤工作台开发文档

## 定位

本文是新版皮肤工作台的开发入口文档。

当前项目不继续修补旧 `apps/web`，新版工作台以 `project.json` 作为唯一内部模型，先做 GitHub Pages 可运行的纯前端版本。

核心链路：

```text
示例皮肤
  -> project.json
  -> 网页编辑器
  -> 实时预览
  -> YAML 皮肤包
  -> Jsonnet 源码包
  -> 浏览器本地模板缓存
```

## 开发原则

- `project.json` 是工作台唯一内部数据模型。
- UI 只修改 `project.json`，不直接修改 YAML 或 Jsonnet 文件。
- 导出器必须是纯函数：输入 `project.json + assets`，输出文件树或 zip。
- YAML 是默认安装产物。
- Jsonnet 是高级模板源码产物。
- 示例皮肤中所有可调参数必须沉淀到 `示例皮肤/jsonnet/lib` 下的配置文件，键盘生成层只引用配置。
- GitHub Pages 是首要运行环境，不依赖本地服务和服务端 API。
- 本地模板保存使用浏览器缓存，用户可以手动保存模板，不要求下载到磁盘。

## 当前事实

旧前端状态：

- `apps/web/app.js` 已有语法错误，不建议继续修补。
- 旧编辑模型围绕 Jsonnet/lib 直接编辑，和新版 `project.json` 路线不一致。
- 旧代码只作为预览、导出、模板读取和 zip 打包的参考来源。

示例皮肤状态：

- `packages/project-schema/defaults/project.sample.json` 已以 `示例皮肤` 作为默认模板数据。
- `示例皮肤/config.yaml` 已映射到 `project.config`，并同步项目名称、作者和各键盘文件映射。
- `collectionData.libsonnet` 已进入 `data.collections`。
- `swipeData.libsonnet` / `swipeData-en.libsonnet` 已进入 `data.swipes`。
- 当前集中配置入口是 `示例皮肤/jsonnet/lib/config/keys.libsonnet`。
- 已迁入按键 insets、图片素材引用、键盘高度、面板参数、按键文案、部分 text 样式和偏移。
- `color.libsonnet`、`fontSize.libsonnet`、`center.libsonnet`、`keyboardLayout.libsonnet` 继续作为主题和布局配置入口。
- `swipeData`、`hintSymbolsData`、`collectionData` 是数据型配置，暂不强行拆碎。

新版工作台状态：

- `apps/workbench` 是当前主入口，根 `index.html` 会跳转到该目录。
- 页面标题使用“元书输入法皮肤工作台”。
- “皮肤配置”模块的默认值来自示例模板，名称、作者、下载位置为空时以灰色提示显示，并可编辑 `config.yaml` 中各设备键盘文件映射。
- 下载位置默认提示使用浏览器或系统默认下载目录，不在公开文档记录个人电脑路径。
- 预览列表直接使用 `config.yaml` 中的真实键盘文件名；预览方向由所选键盘名的 `portrait` / `landscape` 后缀决定，不再单独提供竖屏 / 横屏切换。
- 预览支持把当前选择的键盘添加为自定义预览项，并可删除手动添加项；内置 `config.yaml` 键盘项不可在预览区删除。
- 预览已按 Hamster3 CALayer 风格实现 26 键、数字键盘、符号键盘、面板、候选栏、展开候选、toolbar 和划动标记。
- 预览中的 `center.x/y` 按按键可视区域等比例计算，用于接近实际皮肤效果。
- 自定义布局、数字键盘、符号键盘和工具栏已统一为可视化 token 编辑方式，点击按键后在当前行下方显示编辑条。
- 26 键按键编辑支持设置按键类型 `symbols` / `character`，以及显示类型 `text` / `systemImageName`；`systemImageName` 对应前景 SF Symbol 图标，不等同于 `normalImage` 背景图片引用。

## 当前目录

```text
apps/workbench/
  index.html
  src/
    app/
    editor/
    preview/
    storage/
    export/
    templates/

packages/project-schema/
  index.js
  defaults/
  validators/

packages/exporter/
  yaml/
  jsonnet/
  zip/

packages/preview-engine/
  index.js
```

现有旧目录暂不删除：

- `apps/workbench/`：新版纯前端工作台，当前根入口会跳转到这里。
- `apps/web/`：旧网页实现，只读参考。
- `apps/builder/`：旧本地构建服务，只读参考。
- `packages/shared-schema/`、`packages/template-adapters/`、`packages/preview-engine/`：按需迁移或重建。
- `templates/hamster-ios/`：旧模板副本，和 `示例皮肤/` 对照使用。

## 开发顺序

### 1. 完成示例皮肤收口

目的：让示例皮肤成为稳定模板，不让可调参数散落在 keyboard 生成层。

任务：

- 继续迁移 `numeric_9_portrait.jsonnet`、`numeric_9_landscape.jsonnet` 的布局参数。
- 继续迁移 `symbolic_portrait.jsonnet` 的布局和 collection 尺寸参数。
- 拆分 `toolbar.libsonnet`：配置留在 lib 配置层，生成逻辑留在生成器。
- 抽取 `pinyin_26.jsonnet` 和 `alphabetic_26.jsonnet` 的重复生成逻辑，形成 `keyboard26Factory`。

验收：

- 新增可调参数只进入 `lib/config` 或明确的数据配置文件。
- keyboard 文件只负责组装、引用、生成。
- 执行 `rtk jsonnet "示例皮肤/jsonnet/main.jsonnet"` 通过。

### 2. 建立 project schema 包

目的：让工作台、预览和导出共用同一个数据模型。

建议先建：

```text
packages/project-schema/
  index.js
  defaults/project.sample.json
  validators/project-validator.js
```

首版字段：

- `meta`：名称、作者、描述、版本。
- `assets.images`：图片素材引用。
- `theme.light/dark`：颜色、字号、偏移、动画等 token。
- `keyboardFrame`：竖屏、横屏高度和面板参数。
- `keyStyles.buttonInsets`：普通键、功能键、候选栏、面板等 insets。
- `keyboards.keyboard26`：26 键布局、文案、spaceRight、回车文案。
- `keyboards.numeric`：数字键盘布局和文案。
- `keyboards.symbolic`：符号键盘布局、集合区配置和文案。
- `toolbar`：工具栏按钮、候选栏样式、图标字号。
- `data`：划动、长按、符号集合等数据型配置。
- `export`：导出目标和映射策略。

验收：

- `project.sample.json` 能覆盖示例皮肤当前已确认的可调参数。
- light / dark 差异可以独立表达。
- schema 字段能映射到 YAML 和 Jsonnet 两个导出目标。

### 3. 实现无 UI 导出核心

目的：先把生成链路跑通，再做前端。

建议模块：

```text
packages/exporter/
  index.js
  yaml/build-yaml-tree.js
  jsonnet/build-jsonnet-tree.js
  zip/build-zip.js
```

接口建议：

```js
export function buildYamlTree(project, assets) {}
export function buildJsonnetTree(project, assets) {}
export async function buildSkinZip(project, assets, options) {}
```

约束：

- 导出器不读取 DOM。
- 导出器不读取 UI store。
- 导出器不隐式读取浏览器缓存。
- 所有路径、文件名、资源引用从 `project.json` 或函数参数进入。

验收：

- 固定 `project.sample.json` 能生成完整 YAML 文件树。
- 能生成 Jsonnet 源码文件树。
- zip 内包含配置文件、light/dark 文件和资源文件。
- Jsonnet 源码包可以被 jsonnet 编译。

### 4. 建立预览引擎

目的：让 UI 预览和导出逻辑解耦。

建议接口：

```js
export function buildPreviewModel(project, viewport) {}
```

首版预览范围：

- 26 键竖屏。
- 数字键盘竖屏。
- 候选栏、展开候选和 toolbar。
- 普通按键、功能按键、空格、回车。
- key insets。
- 字号、文字偏移、颜色。
- 键盘高度和工具栏高度。
- 示例划动数据。

后续扩展：

- 横屏。
- 符号键盘。
- 面板。
- 长按和 collection 预览。

验收：

- 预览输入只依赖 `project.json`。
- 预览不反向修改项目数据。
- 同一个 `project.json` 的预览结果稳定可复现。

### 5. 新建网页工作台

目的：做一个干净的可运行 MVP。

建议新建 `apps/workbench`，不沿用旧 `apps/web/app.js`。

首版页面结构：

- 左侧：参数编辑区。
- 中间：参数编辑区。
- 右侧：按 `config.yaml` 键盘文件名选择的实时预览、模板保存、导出操作区。

首版编辑能力：

- 基础信息。
- `config.yaml` 键盘文件映射。
- light / dark 颜色。
- 字号。
- 文字偏移。
- 键盘高度。
- 普通键和功能键 insets。
- 按键 text。
- 图片素材引用。

本地保存：

- `localStorage` 保存最后打开项目 id 和轻量 UI 状态。
- `IndexedDB` 保存模板快照、项目 JSON 和图片素材。
- 用户手动点击保存模板。
- 刷新后能恢复上次模板。

验收：

- GitHub Pages 静态部署可用。
- 无服务端依赖。
- 可编辑参数并实时预览。
- 可导出 YAML zip。
- 可导出 Jsonnet 源码 zip。
- 可手动保存模板并在刷新后恢复。

## 命令约定

项目已配置 RTK。执行 shell 命令时优先使用 `rtk`：

```powershell
rtk jsonnet "示例皮肤/jsonnet/main.jsonnet"
rtk npm run dev
rtk npm run build
rtk git status --short
```

`rtk npm run dev` 默认启动新版工作台，入口为 `http://127.0.0.1:4317/`。旧 builder 服务保留为 `rtk npm run dev:builder`，仅作历史参考。

PowerShell 自带文件读取、枚举命令不需要强行套 `rtk`。

## 文档索引

- `README.md`：项目总览。
- `docs/WORKBENCH_ARCHITECTURE.md`：新版工作台架构。
- `docs/PROJECT_SCHEMA.md`：`project.json` schema 草案。
- `docs/SAMPLE_SKIN_FIELD_MAP.md`：示例皮肤字段到 `project.json` 的映射。
- `docs/NEXT_DEVELOPMENT_PLAN.md`：下一步阶段计划。
- `docs/WORKBENCH_REBUILD_PLAN.md`：重建路线和旧前端取舍。
- `示例皮肤/jsonnet/lib/README.md`：示例皮肤 lib 结构说明。

## 风险与边界

- 不要把 Jsonnet 的完整自由度直接暴露给普通用户，否则工作台会变成代码编辑器。
- 不要把 YAML 作为工作台内部状态，否则 light / dark 和多端差异会反复双份手改。
- 不要在 UI 中直接拼接导出文件，导出逻辑必须放到独立包。
- 不要急着删除旧代码，等新版 MVP 能稳定导出后再归档。
- 不要把数据型配置拆得过碎，`swipeData`、`hintSymbolsData`、`collectionData` 可以先保持独立。

## 当前可执行任务

1. 持续审查 `示例皮肤/jsonnet/lib` 中新增的可调项，并同步到 `project.sample.json`。
2. 在 `apps/workbench` 为新增字段补可视化编辑模块。
3. 在 `packages/exporter` 实现 `project.json -> YAML 文件树` 的最小闭环。
4. 再补 Jsonnet 源码包导出。

## lib 自定义项与网页模块

当前 `apps/workbench` 已按 lib 可调项拆出这些网页模块：

- `config.yaml`：皮肤配置模块，覆盖皮肤信息和各设备键盘文件映射。
- `color.libsonnet`：颜色模块，覆盖 light / dark 颜色 token。
- `fontSize.libsonnet`：字号模块。
- `center.libsonnet`：偏移模块和前景缩放模块。
- `animation.libsonnet`：按键动画模块。
- `config/keys.libsonnet`：图片素材、键盘高度、按键边距、26 键文案、数字键盘文案、符号键盘、toolbar、panel 模块。
- `keyboardLayout.libsonnet`：26 键布局和按键尺寸模块。
- `swipeData*.libsonnet`：划动数据模块，首版用 JSON 编辑。
- `hintSymbolsData.libsonnet`：长按候选模块，首版用 JSON 编辑。
- `collectionData.libsonnet`：集合数据模块，首版用 JSON 编辑。

后续原则：每次把新的可调项沉淀到 lib 后，都必须同步补三个位置：`project.sample.json`、工作台编辑模块、导出映射。
