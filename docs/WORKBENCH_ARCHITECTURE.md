# 皮肤工作台架构设计

## 目标

新版皮肤工作台不直接以 Jsonnet 或 YAML 作为用户编辑模型，而是维护一份受控的 `project.json`。

```text
project.json
  -> SkinEffectModel
  -> 实时预览
  -> Jsonnet source
  -> 完整皮肤包（YAML + Jsonnet + demo）
  -> 浏览器本地模板缓存
```

## 核心原则

- `project.json` 是工作台唯一内部数据模型。
- `SkinEffectModel` 是预览和导出的 resolved effect 层，负责消化 preset seed、组合层、主题 token、metrics 和动作归一化。
- 默认导出完整皮肤包，用于实际安装，也包含 Jsonnet 模板工程源码供高级修改和复用。
- 用户只编辑工作台暴露的受控参数，不直接面对完整 YAML 或完整 Jsonnet。
- 旧 `apps/web` 运行代码已移除，仅保留 `apps/web/data/templates/` 作为导出资源数据来源。

## 产品形态

首选 GitHub Pages 可部署的纯前端网页应用。

首版能力：

- 读取默认模板项目。
- 编辑颜色、字号、偏移、键盘高度、按键 insets、按键文案、素材引用。
- 按 Hamster3 CALayer 风格预览 26 键、数字键盘、候选栏、展开候选、toolbar、横屏键盘和划动标记。
- 导出包含 `config.yaml`、`light/`、`dark/`、`jsonnet/`、`demo.png` 的完整皮肤 zip。
- 浏览器本地保存模板。

后续能力：

- 符号键盘、面板编辑。
- 长按、数据源编辑。
- 多模板管理。
- IndexedDB 模板库。
- 可选 Tauri / exe 本地版。

## 模块划分

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

## 数据流

```text
默认模板
  -> project.json
  -> 编辑器变更
  -> 内存状态
  -> SkinEffectModel
  -> 预览模型
  -> 本地缓存
  -> 导出器
```

导出器不读取 DOM，不依赖 UI 状态，只接收 `project.json` 和素材文件。导出器通过 `packages/skin-effect` 生成文件级效果模型，再输出 `config.yaml`、`light/`、`dark/`、`jsonnet/generated/effect-files.libsonnet` 和 `jsonnet/generated/effect-yaml.libsonnet`。

`nativeKeyboardPayloads` 只作为示例皮肤 preset seed 和导入兼容输入存在。预览不直接读 raw payload，导出也不直接读 raw payload；两边都走 `SkinEffectModel`。

## 本地保存

本地保存分两层：

- `localStorage`：保存最后打开项目 id、轻量 UI 状态。
- `IndexedDB`：保存用户模板、项目快照、图片素材、编辑记录。

用户应能手动保存模板，不必每次下载。

## 旧代码策略

旧实现暂不删除。

可参考内容：

- YAML/Jsonnet 导出逻辑。
- zip 打包逻辑。
- 预览渲染思路。
- 模板读取和 preset 逻辑。

不直接复用内容：

- 旧 UI 状态结构。
- 旧 `app.js` 单文件编辑器。
- 直接围绕 Jsonnet/lib 的用户编辑模型。
