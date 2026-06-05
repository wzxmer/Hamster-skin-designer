# Hamster 键盘皮肤规范

本文用于把 Hamster v3 键盘皮肤的官方配置面和本项目 `示例皮肤` 中的实际写法整理成可查漏的规范。后续检查皮肤工具功能属性时，以本文的“字段覆盖清单”为入口，再回到官方文档和示例文件确认细节。

## 信息来源

- 官方文档：
  - [键盘皮肤结构](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/structure/)
  - [预编辑区](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/preedit/)
  - [工具栏区](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/toolbar/)
  - [按键区](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/keysarea/)
  - [布局](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/layout/)
  - [样式](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/styles/)
  - [集合视图](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/collection/)
  - [按键动作](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/action/)
  - [事件通知](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/notifications/)
  - [按键动画](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/animation/)
  - [配置参数](https://ihsiao.com/apps/hamster/v3/docs/guides/skins/parameters/)
- 历史示例资料：已归档在仓库外，只作为字段覆盖来源。
  - 7 个示例目录。
  - 7 个 `config.yaml`。
  - 84 个键盘 YAML 文件，均可按 JSON/YAML 对象解析。

## 皮肤包结构

一个键盘皮肤包至少由入口配置和主题键盘文件组成：

```text
皮肤目录/
  config.yaml
  light/
    <keyboardName>.yaml
    resources/
      <imageName>.png
      <imageName>.yaml
  dark/
    <keyboardName>.yaml
    resources/
      <imageName>.png
      <imageName>.yaml
```

要点：

- `config.yaml` 负责皮肤元信息、字体、字符范围和键盘类型到具体 YAML 文件的映射。
- `light/` 与 `dark/` 存放浅色和深色主题下的同名或同语义键盘文件。
- 键盘文件名在 `config.yaml` 中不带 `.yaml` 后缀。
- `resources/*.yaml` 描述图片切片和九宫格拉伸参数，键盘样式通过 `file` / `image` 引用。
- 示例中存在只提供部分键盘类型的皮肤，例如只配置 `pinyin`，工具不应假设每个皮肤都包含 `alphabetic` / `numeric` / `symbolic` / `panel`。

## config.yaml

### 元信息与字体

常见字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 皮肤名。示例中并非每个配置都提供。 |
| `author` | string | 作者。示例中并非每个配置都提供。 |
| `fontFace` | array | 自定义字体列表。 |
| `fontFace[].url` | string | 字体文件路径。 |
| `fontFace[].ranges` | array | 字体作用的字符范围。 |
| `ranges[].location` | number | Unicode 起点。 |
| `ranges[].length` | number | 范围长度。 |

### 键盘映射

键盘类型映射结构：

```yaml
pinyin:
  iPhone:
    portrait: "pinyinPortrait"
    landscape: "pinyinLandscape"
  iPad:
    portrait: "iPadPinyinPortrait"
    landscape: "iPadPinyinLandscape"
    floating: "pinyinPortrait"
```

官方和示例共同覆盖的键盘类型：

| 类型 | 含义 | 示例情况 |
|---|---|---|
| `pinyin` | 中文/主输入键盘 | 7 个示例均有。 |
| `alphabetic` | 英文键盘 | 示例 1、3、7 有。 |
| `numeric` | 数字键盘 | 示例 1、3、4、7 有；示例 2 用 `pinyin` 映射数字键盘文件。 |
| `symbolic` | 符号键盘 | 示例 1、4 有。 |
| `panel` | 浮动面板 | 示例 1 有。 |

设备和方向字段：

| 字段 | 说明 |
|---|---|
| `iPhone.portrait` | iPhone 竖屏键盘文件。 |
| `iPhone.landscape` | iPhone 横屏键盘文件。 |
| `iPad.portrait` | iPad 竖屏键盘文件。 |
| `iPad.landscape` | iPad 横屏键盘文件。 |
| `iPad.floating` | iPad 浮动键盘文件。 |

示例中的实际变体：

- 同一文件可被多个位置复用，例如 iPad 竖屏映射到横屏文件。
- `symbolic.landscape` 可复用 `numeric` 或 `pinyin` 文件。
- 文件命名没有强制格式：示例同时存在 `pinyin_26_portrait`、`pinyinPortrait`、`portraitPinyin` 等风格。
- 工具侧应把 `config.yaml` 映射视为权威来源，而不是从文件名猜键盘类型。

## 键盘 YAML 顶层结构

键盘 YAML 是一个对象，顶层字段没有固定白名单：除系统识别字段外，大量字段只是可被其他字段引用的按键、样式、集合或通知名称。

核心系统字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `preeditHeight` | number/string | 预编辑区高度。可为数字，也可为类似视口单位的字符串。 |
| `preeditStyle` | object | 预编辑区样式。 |
| `toolbarHeight` | number/string | 工具栏/候选栏高度。 |
| `toolbarStyle` | object | 工具栏背景和内边距。 |
| `toolbarLayout` | layout | 工具栏布局。 |
| `horizontalCandidatesStyle` | object | 横向候选区外层样式。 |
| `horizontalCandidatesLayout` | layout | 横向候选区布局。 |
| `verticalCandidatesStyle` | object | 纵向候选区外层样式。 |
| `verticalCandidatesLayout` | layout | 纵向候选区布局。 |
| `keyboardHeight` | number/string | 按键区高度。 |
| `keyboardStyle` | object | 按键区背景和内边距。 |
| `keyboardLayout` | layout | 按键区布局。 |
| `candidateContextMenu` | array/object/null | 候选上下文菜单。 |
| `floatTargetScale` | object | 浮动键盘目标缩放。 |
| `floatKeyboardLockedState` | bool | 浮动键盘锁定状态。 |
| `floatKeyboardAlpha` | number | 浮动键盘透明度。 |

示例中常见的顶层命名类型：

- `*Button`：按键定义，例如 `qButton`、`spaceButton`、`enterButton`。
- `*Style`：样式定义，例如 `keyboardBackgroundStyle`、`qButtonForegroundStyle`。
- `*Notification`：通知响应定义，例如 `returnKeyTypeChangedNotification`。
- `*Animation`：动画定义，例如 `ButtonScaleAnimation`。
- `*Collection`：集合视图定义，例如 `categoryCollection`、`horizontalCandidates`。
- 数据源字段：例如 `symbols`、`category`、`常用`、`中文` 等。

## 布局 DSL

布局由栈和单元格组成。

| 节点 | 说明 |
|---|---|
| `HStack` | 横向排列子视图。 |
| `VStack` | 纵向排列子视图。 |
| `Cell` | 引用一个顶层定义的按键、集合或候选视图。 |

布局节点常见属性：

| 字段 | 说明 |
|---|---|
| `subviews` | 子视图数组。`HStack` / `VStack` 必须依赖它组织内容。 |
| `style` | 引用一个样式对象，常用于设置行高、列宽、间距等。 |
| `size` | 设置宽高，可写在被引用的 Cell 对象或 style 对象上。 |
| `bounds` | 设置更细的布局边界和对齐。 |

尺寸写法：

| 写法 | 说明 |
|---|---|
| number | 绝对尺寸。 |
| `"1/3"` | 比例字符串。 |
| `{ percentage: 0.22 }` | 百分比对象，示例中大量用于列宽。 |

布局实践：

- 26 键常用多行 `HStack`。
- 数字键盘常用多个 `VStack` 组成列式布局。
- 横屏可能在一个 `HStack` 中左右分区，中间留空 `VStack`。
- 符号键盘常把分类集合、描述集合和功能键混排。
- `keyboardLayout`、`toolbarLayout`、`horizontalCandidatesLayout`、`verticalCandidatesLayout` 都使用同一套布局 DSL。

## 按键定义

按键对象通过 `Cell` 引用，常见结构如下：

```yaml
exampleButton:
  size:
    width: "1/3"
  backgroundStyle: "systemButtonBackgroundStyle"
  foregroundStyle: "exampleButtonForegroundStyle"
  action:
    character: "a"
  swipeUpAction:
    symbol: "!"
  repeatAction: "backspace"
  notification:
    - "returnKeyTypeChangedNotification"
  animation:
    - "ButtonScaleAnimation"
```

按键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `size` | object | 按键宽高。 |
| `bounds` | object | 对齐和边界。 |
| `backgroundStyle` | string/object/array | 背景样式引用或条件样式。 |
| `foregroundStyle` | string/array/object | 前景样式引用，可叠加多层。 |
| `uppercasedStateForegroundStyle` | string/array/object | 大写状态前景样式。 |
| `capsLockedStateForegroundStyle` | string/array/object | Caps Lock 状态前景样式。 |
| `action` | string/object | 主动作。 |
| `preeditStateAction` | string/object | 有预编辑文本时的动作。 |
| `uppercasedStateAction` | string/object | 大写状态动作。 |
| `swipeUpAction` | string/object | 上划动作。 |
| `swipeDownAction` | string/object | 下划动作。 |
| `repeatAction` | string/object | 长按重复动作。 |
| `hintStyle` | string/array/object | 长按提示样式。 |
| `notification` | array | 绑定通知配置名称。 |
| `animation` | array | 绑定动画配置名称。 |

示例中观察到的状态字段：

- `uppercasedStateAction`
- `uppercasedStateForegroundStyle`
- `capsLockedStateForegroundStyle`
- `preeditStateAction`
- `swipeUpForegroundStyle`
- `selectedBackgroundStyle`
- `hintStyle`

## 样式系统

样式分为背景样式和前景样式。样式本身以顶层命名对象存在，由按键、候选、集合或区域引用。

### 样式类型

官方样式类型和示例实测枚举一致：

| `buttonStyleType` | 用途 |
|---|---|
| `geometry` | 几何背景或透明占位，可设置颜色、圆角、边框、阴影、底边缘等。 |
| `systemImage` | SF Symbol 或系统图标前景。 |
| `assetImage` | 资源资产图片。 |
| `fileImage` | 通过 `resources/*.yaml` 中的图片切片渲染。 |
| `text` | 文本前景。 |

### 背景样式字段

| 字段 | 说明 |
|---|---|
| `buttonStyleType` | 样式类型。背景常用 `geometry` / `fileImage`。 |
| `insets` | 九宫格或绘制内边距。 |
| `normalColor` / `highlightColor` | 普通/高亮颜色。 |
| `normalImage` / `highlightImage` | 普通/高亮图片引用。 |
| `cornerRadius` | 圆角。 |
| `borderSize` | 边框宽度。 |
| `normalBorderColor` / `highlightBorderColor` | 边框颜色。 |
| `normalLowerEdgeColor` / `highlightLowerEdgeColor` | 底边缘颜色。 |
| `normalShadowColor` / `highlightShadowColor` | 阴影颜色。 |
| `shadowRadius` / `shadowOffset` / `shadowOpacity` | 阴影参数。 |
| `colorLocation` / `colorStartPoint` / `colorEndPoint` / `colorGradientType` | 渐变参数。 |

### 前景样式字段

| 字段 | 说明 |
|---|---|
| `buttonStyleType` | 前景常用 `text` / `systemImage` / `fileImage` / `assetImage`。 |
| `text` | 显示文本，可使用 `$rimePreedit`、`$rimeCandidate`、`$rimeCandidateComment`、`$rimeSchemaName`、`$returnKeyType` 等动态值。 |
| `systemImageName` / `highlightSystemImageName` | 系统图标名。 |
| `assetImageName` | 资产图片名。 |
| `normalImage` / `highlightImage` | 图片引用。 |
| `normalColor` / `highlightColor` | 普通/高亮颜色。 |
| `fontSize` | 字号。 |
| `fontWeight` | 字重。 |
| `center` | 前景偏移。 |
| `badgeNormalColor` / `badgeHighlightColor` | 集合视图角标颜色。 |
| `badgeFontSize` | 集合视图角标字号。 |

### 条件样式

样式引用可以是条件数组：

```yaml
foregroundStyle:
  - styleName: "unlockButtonForegroundStyle"
    conditionKey: "$symbolicKeyboardLockState"
    conditionValue: false
  - styleName: "lockButtonForegroundStyle"
    conditionKey: "$symbolicKeyboardLockState"
    conditionValue: true
```

示例中出现的 `conditionKey`：

- `$returnKeyType`
- `$symbolicKeyboardLockState`
- `rime$simplification`

官方参数页还说明 `rime${optionName}` 形式可用于 RIME 选项状态。

## 预编辑区

预编辑区由高度和样式组成：

| 字段 | 说明 |
|---|---|
| `preeditHeight` | 预编辑区高度。 |
| `preeditStyle.insets` | 区域内边距。 |
| `preeditStyle.backgroundStyle` | 背景样式引用。 |
| `preeditStyle.foregroundStyle` | 文本前景样式引用。 |

关联动态文本：

- 预编辑区前景通常使用 `text` 类型样式。
- 需要显示当前预编辑文本时，可使用 `$rimePreedit` 这类动态文本变量。

## 工具栏与候选栏

### 工具栏

| 字段 | 说明 |
|---|---|
| `toolbarHeight` | 工具栏高度。 |
| `toolbarStyle.insets` | 工具栏内边距。 |
| `toolbarStyle.backgroundStyle` | 背景样式引用。 |
| `toolbarLayout` | 工具栏布局。 |

示例中工具栏按钮常见动作：

- `floatKeyboardType: panel`
- `keyboardType: symbolic`
- `keyboardType: emojis`
- `shortcut: #showPhraseView`
- `shortcut: #showPasteboardView`
- `shortcut: #toggleScriptView`
- `dismissKeyboard`

### 横向候选字栏

| 字段 | 说明 |
|---|---|
| `horizontalCandidatesStyle` | 外层样式。 |
| `horizontalCandidatesLayout` | 布局，通常包含 `horizontalCandidates` 和展开按钮。 |
| `horizontalCandidates` | 集合视图，`type: horizontalCandidates`。 |
| `horizontalCandidates.candidateStyle` | 候选项样式引用。 |

候选样式字段：

- `highlightBackgroundColor`
- `preferredBackgroundColor`
- `preferredIndexColor`
- `preferredTextColor`
- `preferredCommentColor`
- `indexColor`
- `textColor`
- `commentColor`
- `indexFontSize`
- `textFontSize`
- `commentFontSize`

### 纵向候选字栏

| 字段 | 说明 |
|---|---|
| `verticalCandidatesStyle` | 外层样式。 |
| `verticalCandidatesLayout` | 布局，通常包含候选列表和翻页/返回/退格按钮。 |
| `verticalCandidates` | 集合视图，`type: verticalCandidates`。 |
| `verticalCandidates.maxRows` | 最大行数。 |
| `verticalCandidates.maxColumns` | 最大列数。 |
| `verticalCandidates.separatorColor` | 分隔线颜色。 |
| `verticalCandidates.candidateStyle` | 候选项样式引用。 |

示例中纵向候选功能按钮常见动作：

- `shortcut: #candidatesBarStateToggle`
- `shortcut: #verticalCandidatesPageUp`
- `shortcut: #verticalCandidatesPageDown`
- `backspace`

## 集合视图

集合视图既可作为按键区的一部分，也可作为候选区或符号区。

官方分类和示例实测类型：

| `type` | 用途 |
|---|---|
| `symbols` | 纵向符号列表。 |
| `horizontalSymbols` | 横向符号列表。官方有说明；当前示例统计未出现该值。 |
| `classifiedSymbols` | 分类符号列表左侧分类。 |
| `subClassifiedSymbols` | 分类符号列表右侧内容。 |
| `numericSymbols` | 数字键盘符号集合。 |
| `categorySymbols` | 示例中出现的分类符号变体。 |
| `t9Symbols` | 示例中出现的 T9 符号集合。 |
| `horizontalCandidates` | 横向候选字列表。 |
| `verticalCandidates` | 纵向候选字列表。 |

集合字段：

| 字段 | 说明 |
|---|---|
| `type` | 集合类型。 |
| `size` | 集合尺寸。 |
| `insets` | 集合内边距。 |
| `backgroundStyle` | 集合背景样式。 |
| `selectedBackgroundStyle` | 选中背景样式。 |
| `cellStyle` | 单元格样式。 |
| `candidateStyle` | 候选单元格样式。 |
| `dataSource` | 数据源字段名。 |
| `maxRows` / `maxColumns` | 最大行列数。 |
| `maximumRow` / `maximumColumn` | 示例中也有该命名，用于符号内容集合。 |
| `displaySeparatorLine` | 是否显示分隔线。 |
| `separatorLineColor` / `separatorColor` | 分隔线颜色。 |
| `contentRightToLeft` | 横向符号列表从右向左。 |

数据源写法：

- 简单数组：`symbols: ["+", "-", "*"]`。
- 分类数组：`category: ["常用", "中文", "英文"]`，同时用同名字段提供每类内容。
- 对象项：符号列表项可包含 `label`、`action`、`styleName`。

## 按键动作

示例中观察到的字符串动作：

| 动作 | 说明 |
|---|---|
| `space` | 空格。 |
| `enter` | 回车。 |
| `backspace` | 删除。 |
| `tab` | Tab。 |
| `shift` | Shift。 |
| `nextKeyboard` | 下一个键盘。 |
| `returnLastKeyboard` | 返回上一个键盘。 |
| `returnPrimaryKeyboard` | 返回主键盘。 |
| `dismissKeyboard` | 收起键盘。 |
| `symbolicKeyboardLockStateToggle` | 符号键盘锁定切换。 |

示例中观察到的对象动作键：

| 动作键 | 说明 |
|---|---|
| `character` | 输入字符。 |
| `symbol` | 输入符号。 |
| `sendKeys` | 发送组合键或组合文本。 |
| `openURL` | 打开链接或特殊 URL。 |
| `runScript` | 运行脚本。 |
| `runTranslateScript` | 运行翻译脚本。 |
| `keyboardType` | 切换到指定键盘。 |
| `floatKeyboardType` | 打开浮动键盘类型，例如 `panel`。 |
| `shortcut` | 执行快捷指令。 |
| `shortcutCommand` | 示例中出现的快捷命令动作。 |

官方还说明：

- `switchRimeSchema` 可切换 RIME 方案。
- `combine` 是组合 Action，属于实验能力。

示例中观察到的 `keyboardType`：

- `pinyin`
- `alphabetic`
- `numeric`
- `symbolic`
- `emojis`

示例中观察到的 `shortcut`：

- `#RimeSwitcher`
- `#candidatesBarStateToggle`
- `#copy`
- `#cut`
- `#keyboardMenu`
- `#paste`
- `#selectText`
- `#showPasteboardView`
- `#showPhraseView`
- `#subCollectionPageDown`
- `#subCollectionPageUp`
- `#toggleEmbeddedInputMode`
- `#toggleScriptView`
- `#verticalCandidatesPageDown`
- `#verticalCandidatesPageUp`
- `#三选上屏`
- `#中英切换`
- `#换行`
- `#方案切换`
- `#次选上屏`
- `#行尾`
- `#行首`
- `#重输`

## 事件通知

通知对象可以被按键的 `notification` 数组引用。通知命中后可改写背景、前景和动作。

通知类型：

| `notificationType` | 说明 |
|---|---|
| `rime` | RIME 状态通知。 |
| `keyboardAction` | 键盘动作通知。 |
| `returnKeyType` | 回车键类型通知。 |
| `preeditChanged` | 预编辑文本变化通知。 |

示例中观察到的通知字段：

| 字段 | 说明 |
|---|---|
| `rimeNotificationType` | RIME 通知类型，示例中出现 `optionChanged`。 |
| `rimeOptionName` | RIME 选项名。 |
| `rimeOptionValue` | RIME 选项值。 |
| `notificationKeyboardAction` | 用于匹配键盘动作。 |
| `returnKeyType` | 回车键类型数组或值。 |
| `lockedNotificationMatchState` | 锁定通知匹配状态。 |
| `backgroundStyle` | 命中后背景样式。 |
| `foregroundStyle` | 命中后前景样式。 |
| `action` | 命中后动作。 |

官方说明 `rimeNotificationType` 还可用于方案变化等 RIME 通知；示例中主要覆盖 `optionChanged`。

## 动画

按键通过 `animation` 数组引用动画对象。

官方动画类型：

| `animationType` | 说明 |
|---|---|
| `scale` | 缩放动画。 |
| `cartoon` | 图片播放动画。 |
| `physics` | 物理动画。 |

示例中实测：

- 当前 84 个键盘 YAML 中只观察到 `animationType: scale`。
- 不能因此认为工具只需支持 `scale`；官方还定义了 `cartoon` 和 `physics`。

常见字段：

| 字段 | 说明 |
|---|---|
| `isAutoReverse` | 是否自动反向。 |
| `scale` | 缩放比例。 |
| `pressDuration` | 按下时长。 |
| `releaseDuration` | 释放时长。 |
| `fps` | 图片播放帧率。 |
| `targetScale` | 目标缩放。 |
| `zPosition` | 层级位置。 |
| `images` | 图片帧数组。 |
| `duration` | 动画时长。 |
| `randomImage` | 是否随机图片。 |
| `startPosition` / `endPosition` / `randomPosition` | 位移参数。 |
| `useOpacity` / `startOpacity` / `endOpacity` | 透明度参数。 |
| `useRotation` / `startAngle` / `endAngle` / `randomAngle` | 旋转参数。 |

## 图片资源描述

`resources/<file>.yaml` 描述图片切片：

| 字段 | 说明 |
|---|---|
| `<imageName>.rect` | 图片区域，含 `x`、`y`、`width`、`height`。 |
| `<imageName>.insets` | 九宫格拉伸内边距，含 `top`、`bottom`、`left`、`right`。 |

样式引用形式：

```yaml
normalImage:
  file: "hold_back"
  image: "IMG1"
```

要点：

- `file` 对应 `resources/<file>.yaml` 与图片资源名。
- `image` 对应该资源描述文件里的切片名。
- 示例中 `fileImage` 与 `normalImage` / `highlightImage` 组合大量存在。

## 示例皮肤变体记录

| 示例 | config 覆盖 | 键盘 YAML 数 | 说明 |
|---|---:|---:|---|
| 示例1 | `pinyin`、`alphabetic`、`numeric`、`symbolic`、`panel`，含 iPhone/iPad/floating | 20 | 覆盖最完整，含面板、emoji、资源图片。 |
| 示例2 | 只配置 `pinyin`，但映射到数字键盘文件 | 4 | 说明键盘类型名和文件内容不一定一致。 |
| 示例3 | iPhone 的 `pinyin`、`alphabetic`、`numeric` | 12 | 文件命名为 `portraitPinyin` / `landscapePinyin` 等。 |
| 示例4 | `pinyin`、`numeric`、`symbolic`，含 iPad 文件 | 20 | `symbolic.iPad` 可映射到 pinyin 文件。 |
| 示例5 | 只配置 `pinyin`，含皮肤名 | 8 | 仓颉示例，仍用 `pinyin` 类型承载主键盘。 |
| 示例6 | 只配置 `pinyin` | 8 | 与示例5类似的主键盘皮肤。 |
| 示例7 | `pinyin`、`alphabetic`、`numeric` | 12 | 大千注音示例。 |

## 工作台字段覆盖清单

后续检查皮肤工具时，可按下列清单核对。

### 已应优先覆盖的核心模型

- `config.yaml`：
  - `name`
  - `author`
  - `fontFace`
  - `fontFace.ranges`
  - `pinyin` / `alphabetic` / `numeric` / `symbolic` / `panel`
  - `iPhone.portrait` / `iPhone.landscape`
  - `iPad.portrait` / `iPad.landscape` / `iPad.floating`
- 区域尺寸：
  - `preeditHeight`
  - `toolbarHeight`
  - `keyboardHeight`
- 区域样式：
  - `preeditStyle`
  - `toolbarStyle`
  - `keyboardStyle`
  - `horizontalCandidatesStyle`
  - `verticalCandidatesStyle`
- 布局：
  - `keyboardLayout`
  - `toolbarLayout`
  - `horizontalCandidatesLayout`
  - `verticalCandidatesLayout`
  - `HStack` / `VStack` / `Cell`
  - `style` 引用
  - `size` / `bounds`
- 按键：
  - `backgroundStyle`
  - `foregroundStyle`
  - `uppercasedStateForegroundStyle`
  - `capsLockedStateForegroundStyle`
  - `action`
  - `preeditStateAction`
  - `uppercasedStateAction`
  - `swipeUpAction`
  - `swipeDownAction`
  - `repeatAction`
  - `hintStyle`
  - `notification`
  - `animation`
- 样式：
  - `geometry`
  - `text`
  - `systemImage`
  - `fileImage`
  - `assetImage`
  - 条件样式数组
- 集合：
  - `symbols`
  - `horizontalSymbols`
  - `classifiedSymbols`
  - `subClassifiedSymbols`
  - `numericSymbols`
  - `categorySymbols`
  - `t9Symbols`
  - `horizontalCandidates`
  - `verticalCandidates`
- 动作：
  - 字符串标准动作。
  - `character`
  - `symbol`
  - `sendKeys`
  - `openURL`
  - `runScript`
  - `runTranslateScript`
  - `keyboardType`
  - `floatKeyboardType`
  - `shortcut`
  - `shortcutCommand`
  - `switchRimeSchema`
  - `combine`
- 通知：
  - `rime`
  - `keyboardAction`
  - `returnKeyType`
  - `preeditChanged`
  - `optionChanged`
  - `schemaChanged`
  - `lockedNotificationMatchState`
- 动画：
  - `scale`
  - `cartoon`
  - `physics`
- 资源：
  - `resources/*.yaml`
  - `rect`
  - `insets`
  - `normalImage`
  - `highlightImage`

### 当前项目已有文档提示的覆盖

根据 `docs/SAMPLE_SKIN_FIELD_MAP.md` 和 `docs/PROJECT_SCHEMA.md`，工作台当前已经覆盖或正在建模的重点包括：

- `config.yaml` 的键盘映射。
- 颜色、字号、偏移。
- 键盘高度。
- 按键 insets。
- 图片素材引用。
- 26 键竖屏/横屏布局。
- 26 键单键编辑。
- 数字键盘、符号键盘、工具栏的可视化布局编辑。
- 候选栏、展开候选、toolbar 预览。
- 划动显示和全局划动开关。

### 高优先级查漏项

这些字段在官方文档或示例中明确存在，但容易被简化模型遗漏：

- `fontFace` 与 `ranges`。
- 非完整皮肤包：只配置部分键盘类型。
- 键盘类型和文件内容不一致的映射。
- iPad `floating` 映射。
- `preeditHeight` / `toolbarHeight` / `keyboardHeight` 的字符串高度形式。
- `bounds`、`alignment`、`percentage` 尺寸对象。
- 条件样式数组，尤其 `$returnKeyType`、`$symbolicKeyboardLockState`、`rime$option`。
- `uppercasedStateAction` 和大小写状态前景。
- `preeditStateAction`。
- `repeatAction`。
- `hintStyle` 与多层长按提示前景。
- `selectedBackgroundStyle`。
- `candidateContextMenu`。
- 纵向候选区翻页和功能键布局。
- `classifiedSymbols` / `subClassifiedSymbols` 双集合符号键盘。
- `horizontalSymbols`，虽然当前示例未出现，但官方有定义。
- `categorySymbols` / `t9Symbols`，虽然官方页标题未单独列出，但示例中出现。
- `openURL` 的特殊片段组合。
- `runScript` / `runTranslateScript`。
- `switchRimeSchema`。
- 实验性 `combine` action。
- `keyboardAction` 通知。
- `schemaChanged` RIME 通知。
- `cartoon` / `physics` 动画。
- `assetImage` 样式。
- `resources` 图片切片编辑。

## 对工作台内部模型的建议分层

为了保持 `project.json` 可编辑且能导出原生 YAML，建议按三层理解字段：

| 层级 | 目标 | 处理策略 |
|---|---|---|
| 产品级结构 | 用户高频编辑项，例如键盘映射、尺寸、颜色、布局、按键动作、候选栏样式 | 明确建模到 `project.json` 并提供 UI。 |
| 原生能力扩展 | 条件样式、通知、复杂集合、动画、资源切片 | 可先以高级面板或结构化 JSON 编辑承载，避免导入后丢失。 |
| 未识别字段 | 示例或用户皮肤中的自定义顶层对象 | 导入导出应尽量保留，至少不应静默丢弃。 |

验收原则：

- 导入示例皮肤后，未被 UI 编辑的原生字段不应无提示丢失。
- 导出的 `config.yaml` 必须以 `project.json.config` 中的映射为准。
- 预览列表必须来自实际键盘映射，而不是硬编码“26 键”等抽象项。
- 新增功能必须保持 GitHub Pages 纯前端运行，不依赖本地路径、后端服务或开发服务器专属能力。
