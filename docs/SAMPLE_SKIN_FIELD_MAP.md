# 示例皮肤字段映射

## 目的

本文记录 `示例皮肤` 中已经确认的可调参数如何映射到新版 `project.json`。

```text
示例皮肤 Jsonnet lib
  -> project.json
  -> YAML / Jsonnet 导出
```

## 配置入口

当前主要入口：

- `示例皮肤/config.yaml`
- `示例皮肤/jsonnet/lib/config/keys.libsonnet`
- `示例皮肤/jsonnet/lib/color.libsonnet`
- `示例皮肤/jsonnet/lib/fontSize.libsonnet`
- `示例皮肤/jsonnet/lib/center.libsonnet`
- `示例皮肤/jsonnet/lib/keyboardLayout.libsonnet`
- `示例皮肤/jsonnet/lib/swipeData.libsonnet`
- `示例皮肤/jsonnet/lib/swipeData-en.libsonnet`
- `示例皮肤/jsonnet/lib/hintSymbolsData.libsonnet`
- `示例皮肤/jsonnet/lib/collectionData.libsonnet`

## config.yaml 映射

| YAML 字段 | project.json 字段 | 说明 |
|---|---|---|
| `name` | `config.name` / `meta.name` | 皮肤名称，工作台默认模板名来自这里 |
| `author` | `config.author` / `meta.author` | 作者 |
| `pinyin.*` | `config.pinyin.*` | 拼音键盘设备与方向映射 |
| `alphabetic.*` | `config.alphabetic.*` | 英文键盘设备与方向映射 |
| `numeric.*` | `config.numeric.*` | 数字键盘设备与方向映射 |
| `symbolic.*` | `config.symbolic.*` | 符号键盘设备与方向映射 |
| `panel.*` | `config.panel.*` | 面板设备与方向映射 |

工作台“皮肤配置”模块以表单方式编辑这些映射。右侧预览列表也直接使用这些键盘文件名；`portrait` / `landscape` 后缀决定预览方向，不再使用独立的竖屏 / 横屏切换按钮。

## keys.libsonnet 映射

| Jsonnet 字段 | project.json 字段 | 说明 |
|---|---|---|
| `buttonInsets.keyboard26.normal` | `keyStyles.buttonInsets.keyboard26.normal` | 26 键普通键背景 insets |
| `buttonInsets.keyboard26.functionKey` | `keyStyles.buttonInsets.keyboard26.functionKey` | 26 键功能键背景 insets |
| `buttonInsets.keyboard26.enterAccent` | `keyStyles.buttonInsets.keyboard26.enterAccent` | 高亮回车键背景 insets |
| `buttonInsets.numeric.normal` | `keyStyles.buttonInsets.numeric.normal` | 数字键普通键背景 insets |
| `buttonInsets.numeric.functionKey` | `keyStyles.buttonInsets.numeric.functionKey` | 数字键功能键背景 insets |
| `buttonInsets.numeric.collection` | `keyStyles.buttonInsets.numeric.collection` | 数字键左侧 collection 背景 insets |
| `buttonInsets.numeric.collectionCell` | `keyStyles.buttonInsets.numeric.collectionCell` | 数字键 collection cell insets |
| `buttonInsets.symbolic.*` | `keyStyles.buttonInsets.symbolic.*` | 符号键盘 collection / 功能键 insets |
| `buttonInsets.panel.normal` | `keyStyles.buttonInsets.panel.normal` | 面板按钮背景 insets |
| `buttonInsets.panel.frame` | `keyStyles.buttonInsets.panel.frame` | 面板键盘外框 insets |
| `buttonInsets.toolbar.*` | `keyStyles.buttonInsets.toolbar.*` | 候选栏和 toolbar 相关 insets |
| `buttonInsets.hint.*` | `keyStyles.buttonInsets.hint.*` | 长按候选相关 insets |
| `imageRefs.*` | `assets.images.*` | 图片素材引用 |
| `keyboardFrame.portrait.*` | `keyboardFrame.portrait.*` | 竖屏高度 |
| `keyboardFrame.landscape.*` | `keyboardFrame.landscape.*` | 横屏高度 |
| `keyboardFrame.panel.*` | `keyboardFrame.panel.*` | 面板浮动缩放和圆角 |
| `text.keyboard26.*` | `keyboards.keyboard26.text / spaceRight` | 26 键文案和附属标签配置 |
| `text.keyboard26.pinyinSchemaName` | `keyboards.keyboard26.pinyinSchemaName` | 显示方案名的文字、字号、颜色 token 和中心偏移 |
| `text.numeric.*` | `keyboards.numeric.text` | 数字键盘文案 |
| `text.symbolic.*` | `keyboards.symbolic.text` | 符号键盘文案和图标偏移 |
| `text.toolbar.*` | `toolbar.text / toolbar.iconFontSize` | 工具栏文案和图标样式 |
| `text.panel.*` | `keyboards.panel.text` | 面板按钮文案 |

## 颜色映射

| Jsonnet 文件 | project.json 字段 | 说明 |
|---|---|---|
| `color.libsonnet.light` | `theme.light.colors` | 浅色主题颜色 token |
| `color.libsonnet.dark` | `theme.dark.colors` | 深色主题颜色 token |

light / dark 在 `project.json` 中保留为独立对象，UI 可提供一键同步。

## 字号映射

| Jsonnet 文件 | project.json 字段 |
|---|---|
| `fontSize.libsonnet` | `theme.shared.fontSize` 或 `theme.light/fontSize` |

当前示例皮肤字号未区分 light / dark，可先映射到 shared。后续如果出现主题差异，再升级到 light / dark 独立字段。

## 偏移映射

| Jsonnet 文件 | project.json 字段 |
|---|---|
| `center.libsonnet` | `theme.shared.center` 或 `theme.light/dark.center` |

当前偏移未区分 light / dark，可先映射到 shared。

## 布局映射

| Jsonnet 文件 | project.json 字段 | 说明 |
|---|---|---|
| `keyboardLayout.libsonnet` 26 键布局 | `keyboards.keyboard26.layout` | 竖屏 / 横屏按键短名 |
| `keyboardLayout.libsonnet` 按键尺寸 | `keyboards.keyboard26.metrics` | 宽度、bounds、横屏 split |
| `panel.jsonnet` 面板布局 | `keyboards.panel.layout` | 面板按钮顺序 |
| `numeric_9_portrait.jsonnet` 数字键布局 | `keyboards.numeric.layout.portrait` | 后续应迁入配置 |
| `numeric_9_landscape.jsonnet` 数字横屏布局 | `keyboards.numeric.layout.landscape` | 后续应迁入配置 |
| `symbolic_portrait.jsonnet` 符号键布局 | `keyboards.symbolic.layout` | 后续应迁入配置 |

## 数据配置映射

| Jsonnet 文件 | project.json 字段 | 说明 |
|---|---|---|
| `swipeData.libsonnet` | `data.swipes.pinyin / numeric` | 中文 26 键和数字键盘划动 |
| `swipeData-en.libsonnet` | `data.swipes.alphabetic` | 英文 26 键划动 |
| 滑动总开关 | `data.swipesEnabled` | 关闭时保留原始划动数据，但预览和导出都不启用划动 |
| `hintSymbolsData.libsonnet` | `data.hints` | 长按候选 |
| `collectionData.libsonnet` | `data.collections` | 符号、emoji、分类数据 |

这些文件本身就是数据型配置，当前不强行拆到 `config/keys.libsonnet`。

## 仍需收口的字段

- `pinyin_26.jsonnet` 和 `alphabetic_26.jsonnet` 仍有大量重复生成逻辑。
- `numeric_9_portrait.jsonnet`、`numeric_9_landscape.jsonnet` 的布局还应迁到配置层。
- `symbolic_portrait.jsonnet` 的布局和 collection 尺寸还应迁到配置层。
- `toolbar.libsonnet` 仍应拆成配置和生成器。

## 工作台字段范围

当前工作台已覆盖：

- 颜色。
- 字号。
- 偏移。
- 键盘高度。
- 按键 insets。
- 按键文案。
- 图片素材引用保留在底层模型和导出链路，左侧编辑暂时禁用。
- 26 键竖屏 / 横屏布局。
- 26 键单键编辑，包含按键类型 `symbols` / `character` 和显示类型 `text` / `systemImageName`。
- 数字键盘、符号键盘和工具栏的可视化布局编辑。
- 数字键盘预览。
- 符号键盘和面板预览。
- 候选栏、展开候选、toolbar 预览。
- `swipeData` 划动显示。

其他复杂数据保留为后续阶段。
