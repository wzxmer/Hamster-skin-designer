# 仿ios-新 配置说明

这份说明用于帮助阅读和修改本皮肤的配置文件。

## 目录结构

- `config.yaml`
  皮肤入口映射文件。
  现在它不仅是皮肤加载入口，也是源码构建时的映射来源。
  也就是说，直接修改这里的键盘映射名，重新生成后就会按这里生效。

- `light/` 与 `dark/`
  生成后的浅色/深色皮肤文件，一般不建议手改。

- `jsonnet/`
  皮肤源码目录。

## 推荐阅读顺序

如果只是想快速上手修改，建议按下面顺序看：

1. `config.yaml`
2. `jsonnet/lib/layout.libsonnet`
3. 对应功能的 `jsonnet/lib/*.libsonnet`

## 核心分层

### 1. `jsonnet/lib/`

这是主要 DIY 配置层，也是日常最常修改的地方。

- `layout.libsonnet`
  整个皮肤的布局总配置。
  包含：
  - 26 键横竖屏布局结构
  - 数字键盘横竖屏布局结构
  - 符号键盘布局结构
  - 各键尺寸、分栏比例、边距、工具栏尺寸、面板尺寸

- `keyboard26.libsonnet`
  26 键功能配置。
  包含：
  - 回车键文字
  - 中英文模式配置
  - 底栏按钮文案
  - 空格右侧按钮样式
  - 自定义功能键 `customKeys`

- `numeric.libsonnet`
  数字键盘功能键配置。
  例如返回、空格、退格、换行、`#+=` 等。

- `symbolic.libsonnet`
  符号键盘底部功能键配置。
  例如返回、翻页、锁定、退格。

- `toolbar.libsonnet`
  工具栏按钮定义、排列和英文模式覆盖。

- `panel.libsonnet`
  面板按钮内容和排列。

- `color.libsonnet`
  颜色配置。

- `fontSize.libsonnet`
  字体大小配置。

- `theme.libsonnet`
  偏移、动画等通用主题配置。

- `others.libsonnet`
  键盘高度、工具栏高度、预编辑区高度、方案名等杂项配置。

### 2. `jsonnet/lib/` 中的数据文件

这些文件偏内容数据，改动频率通常比布局低：

- `hintSymbolsData.libsonnet`
  长按气泡数据。

- `swipeData.libsonnet`
  中文 26 键划动数据。

- `swipeData-en.libsonnet`
  英文 26 键划动数据。

- `collectionData.libsonnet`
  符号分类、数字键盘左侧符号列表等数据源。

### 3. `jsonnet/keyboard/`

这是键盘渲染层。
这里主要负责把 `lib` 中的配置转换成最终键盘结构，通常不建议优先修改。

常见文件：

- `keyboard26Template.libsonnet`
  26 键公共模板。
  中文 26 键和英文 26 键都由它生成。

- `keyboardLayout.libsonnet`
  26 键布局渲染。

- `numeric_9_portrait.jsonnet`
  数字键盘竖屏渲染。

- `numeric_9_landscape.jsonnet`
  数字键盘横屏渲染。

- `symbolic_portrait.jsonnet`
  符号键盘竖屏渲染。

- `panel.jsonnet`
  面板渲染。

### 4. `jsonnet/core/`

这是通用工具层，通常不需要日常修改。

- `styleFactory.libsonnet`
  公共前景样式、按钮对象生成工具。

- `layoutRenderer.libsonnet`
  公共布局渲染与短键名映射。

- `toolbar.libsonnet`
  工具栏渲染。

- `utils.libsonnet`
  通用样式方法。

- `hintSymbolsStyles.libsonnet`
  长按气泡样式生成。

- `swipeStyles.libsonnet`
  划动文字样式生成。

- `build.libsonnet`
  读取 `config.yaml`，汇总并输出所有皮肤文件。

## 看哪里改哪里

### 想改键盘映射

看 `config.yaml`

适合：

- 改不同键盘类型对应的输出文件名
- 改 iPhone / iPad / portrait / landscape / floating 的映射

说明：

- 现在 `config.yaml` 是映射源文件
- 直接改它后，重新生成产物就会按新映射输出
- 如果你把某个映射名改成新的名字，对应的 `light/` 与 `dark/` 生成文件名也会一起变
- 改成新名字后，旧名字对应的已生成文件不会自动删除
- 不同结构的键盘不要随意共用同一个新文件名，除非你本来就是要复用同一份输出

### 想改键盘布局和尺寸

看 `jsonnet/lib/layout.libsonnet`

适合：

- 改 26 键横竖屏按键排列
- 改数字键盘横竖屏布局
- 改符号键盘布局
- 改宽度、高度、边距、比例

### 想改 26 键底栏、回车键、中英文逻辑、自定义功能键

看 `jsonnet/lib/keyboard26.libsonnet`

说明：

- 新增功能键优先写在 `buttons`
- 旧的 `customKeys` 仍兼容，但现在更推荐统一写 `buttons`

### 想改数字键盘功能键

看 `jsonnet/lib/numeric.libsonnet`

### 想改符号键盘功能键

看 `jsonnet/lib/symbolic.libsonnet`

### 想改工具栏

看 `jsonnet/lib/toolbar.libsonnet`

### 想改面板

看 `jsonnet/lib/panel.libsonnet`

### 想改颜色、字体、偏移、动画

分别看：

- `jsonnet/lib/color.libsonnet`
- `jsonnet/lib/fontSize.libsonnet`
- `jsonnet/lib/theme.libsonnet`

### 想改键盘高度、预编辑区高度、工具栏高度

看 `jsonnet/lib/others.libsonnet`

### 想改长按、划动、符号数据

分别看：

- `jsonnet/lib/hintSymbolsData.libsonnet`
- `jsonnet/lib/swipeData.libsonnet`
- `jsonnet/lib/swipeData-en.libsonnet`
- `jsonnet/lib/collectionData.libsonnet`

## 新增按键怎么改

### 统一按钮模板字段

三类键盘现在尽量统一用下面这些字段：

- `label`
  单前景写法，文本和 SF Symbol 都可以写这里

- `labels`
  多前景写法，适合一个按钮叠两层或多层前景

- `lockedLabel` / `unlockedLabel`
  适合有状态切换的按钮

- `repeat`
  简写，等同 `repeatAction`

- `swipes.up` / `swipes.down`
  简写，分别对应上划和下划动作

- `sizeRef`
  尺寸别名，优先从 `layout.libsonnet` 或当前键盘内建尺寸模板里取值

示例：

```jsonnet
myKey: {
  action: { character: '@' },
  label: {
    text: '@',
    fontSizeKey: '按键前景文字大小',
  },
}
```

系统图标示例：

```jsonnet
myDelete: {
  action: 'backspace',
  repeat: 'backspace',
  label: {
    systemImageName: 'delete.left',
    fontSizeKey: '按键前景sf符号大小',
  },
}
```

尺寸别名示例：

```jsonnet
myLock: {
  sizeRef: 'action',
  action: 'symbolicKeyboardLockStateToggle',
  unlockedLabel: {
    systemImageName: 'lock.open',
    fontSizeKey: '按键前景sf符号大小',
  },
  lockedLabel: {
    systemImageName: 'lock',
    fontSizeKey: '按键前景sf符号大小',
  },
}
```

### 26 键新增功能键

做两步：

1. 在 `jsonnet/lib/layout.libsonnet` 对应布局位置加入键名
2. 在 `jsonnet/lib/keyboard26.libsonnet` 的 `buttons` 中补同名配置

说明：

- 全局通用键放根级 `buttons`
- 只给中文键盘用，放 `pinyin.buttons`
- 只给英文键盘用，放 `alphabetic.buttons`
- 旧的 `customKeys` 仍可用，但推荐以后统一改成 `buttons`

### 数字键盘新增功能键

做两步：

1. 在 `jsonnet/lib/layout.libsonnet` 的数字键盘布局里加入键名
2. 在 `jsonnet/lib/numeric.libsonnet` 的 `buttons` 中补同名配置

说明：

- 数字键盘大多数按键会自动按所在列适配宽度
- 如果你确实要给功能键固定尺寸，可以加 `sizeRef` 或 `size`

### 符号键盘新增功能键

做两步：

1. 在 `jsonnet/lib/layout.libsonnet` 的符号键盘布局里加入键名
2. 在 `jsonnet/lib/symbolic.libsonnet` 的 `buttons` 中补同名配置

说明：

- 符号键盘底部按钮现在优先推荐写 `sizeRef`
- 当前可直接用的尺寸别名在 `layout.libsonnet` 的 `symbolic.portrait.buttonSizes`

## `config.yaml` 对应关系

当前皮肤入口如下：

- `pinyin`
  中文 26 键

- `alphabetic`
  英文 26 键

- `numeric`
  数字键盘

- `symbolic`
  符号键盘

- `panel`
  面板

### 输出文件与源码关系

- `pinyin` / `alphabetic`
  由 `jsonnet/keyboard/keyboard26Template.libsonnet` 生成
  主要配置来源：
  - `jsonnet/lib/layout.libsonnet`
  - `jsonnet/lib/keyboard26.libsonnet`
  - `jsonnet/lib/color.libsonnet`
  - `jsonnet/lib/fontSize.libsonnet`
  - `jsonnet/lib/theme.libsonnet`
  - `jsonnet/lib/others.libsonnet`
  - `jsonnet/lib/hintSymbolsData.libsonnet`
  - `jsonnet/lib/swipeData.libsonnet`
  - `jsonnet/lib/swipeData-en.libsonnet`

- `numeric_9_portrait.yaml`
  来源：`jsonnet/keyboard/numeric_9_portrait.jsonnet`
  主要配置来源：
  - `jsonnet/lib/layout.libsonnet`
  - `jsonnet/lib/numeric.libsonnet`
  - `jsonnet/lib/collectionData.libsonnet`
  - `jsonnet/lib/hintSymbolsData.libsonnet`
  - `jsonnet/lib/swipeData.libsonnet`

- `numeric_9_landscape.yaml`
  来源：`jsonnet/keyboard/numeric_9_landscape.jsonnet`
  主要配置来源：
  - `jsonnet/lib/layout.libsonnet`
  - `jsonnet/lib/numeric.libsonnet`
  - `jsonnet/lib/symbolic.libsonnet`
  - `jsonnet/lib/collectionData.libsonnet`

- `symbolic_portrait.yaml`
  来源：`jsonnet/keyboard/symbolic_portrait.jsonnet`
  主要配置来源：
  - `jsonnet/lib/layout.libsonnet`
  - `jsonnet/lib/symbolic.libsonnet`
  - `jsonnet/lib/collectionData.libsonnet`

- `panel_portrait.yaml` / `panel_landscape.yaml`
  来源：`jsonnet/keyboard/panel.jsonnet`
  主要配置来源：
  - `jsonnet/lib/layout.libsonnet`
  - `jsonnet/lib/panel.libsonnet`

## 日常修改建议

如果只是普通 DIY，优先只改下面这些文件：

- `config.yaml`
- `jsonnet/lib/layout.libsonnet`
- `jsonnet/lib/keyboard26.libsonnet`
- `jsonnet/lib/numeric.libsonnet`
- `jsonnet/lib/symbolic.libsonnet`
- `jsonnet/lib/toolbar.libsonnet`
- `jsonnet/lib/panel.libsonnet`
- `jsonnet/lib/color.libsonnet`
- `jsonnet/lib/fontSize.libsonnet`
- `jsonnet/lib/theme.libsonnet`
- `jsonnet/lib/others.libsonnet`

如果不是在做源码级重构，不建议优先修改 `jsonnet/core/` 和 `jsonnet/keyboard/`。
