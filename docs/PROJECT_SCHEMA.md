# project.json Schema 草案

## 定位

`project.json` 是新版皮肤工作台的唯一内部项目文件。

它不是 Hamster 原生 YAML，也不是 Jsonnet 源码，而是工作台自己的中间模型。

## 顶层结构

```json
{
  "schemaVersion": "0.1.0",
  "templateId": "sample-skin",
  "meta": {},
  "assets": {},
  "theme": {},
  "keyboardFrame": {},
  "keyStyles": {},
  "keyboards": {},
  "toolbar": {},
  "data": {},
  "export": {},
  "config": {},
  "keyboardCombo": {},
  "nativeKeyboardPayloads": {},
  "previewKeyboards": [],
  "hiddenPreviewKeyboards": []
}
```

## meta

项目基础信息。

```json
{
  "name": "皮肤1",
  "author": "https://wzxmer.github.io/Hamster-skin-designer/",
  "description": "浏览器默认下载位置",
  "createdAt": "2026-06-05 20:22:40",
  "updatedAt": "2026-06-05 20:22:40"
}
```

当前 `description` 字段在工作台 UI 中暂作为下载位置显示，默认值为当前电脑下载目录。

## assets

素材引用。网页内可以保存为 IndexedDB Blob，也可以在导出时写入 zip。

```json
{
  "images": {
    "keyboardBackground": {
      "file": "bg",
      "image": "IMG1",
      "source": "resources/bg.png"
    },
    "holdBackground": {
      "file": "hold_back",
      "image": "IMG1",
      "source": "resources/hold_back.png"
    }
  }
}
```

## theme

主题 token。light / dark 分开存，避免 YAML 双份手改。

```json
{
  "light": {
    "colors": {},
    "fontSize": {},
    "center": {},
    "animation": {}
  },
  "dark": {
    "colors": {},
    "fontSize": {},
    "center": {},
    "animation": {}
  }
}
```

如果某些 token 在 light / dark 完全一致，可以在 UI 层提供“一键同步”，但存储层仍保持明确值。

## keyboardFrame

键盘整体高度和浮动面板参数。

```json
{
  "portrait": {
    "preeditHeight": 22,
    "toolbarHeight": 41,
    "keyboardHeight": 210
  },
  "landscape": {
    "preeditHeight": 14,
    "toolbarHeight": 30,
    "keyboardHeight": 160
  },
  "panel": {
    "floatTargetScale": {
      "portrait": { "x": 0.8, "y": 0.6 },
      "landscape": { "x": 0.5, "y": 0.85 }
    },
    "cornerRadius": 15
  }
}
```

## keyStyles

按键样式配置。这里放通用 insets、立体样式参数，不放具体键盘布局。

```json
{
  "surfaceStyles": {
    "keyboard26": {
      "normal": { "cornerRadius": 7, "borderSize": 0.6, "shadowRadius": 2.4, "shadowOpacity": 1, "shadowOffset": { "x": 0, "y": 1.2 } },
      "functionKey": { "cornerRadius": 7, "borderSize": 0.6, "shadowRadius": 2.4, "shadowOpacity": 1, "shadowOffset": { "x": 0, "y": 1.2 } },
      "enterAccent": { "cornerRadius": 7, "borderSize": 0.6, "shadowRadius": 2.4, "shadowOpacity": 1, "shadowOffset": { "x": 0, "y": 1.2 } }
    }
  },
  "buttonInsets": {
    "keyboard26": {
      "normal": { "top": 5, "left": 3, "bottom": 5, "right": 3 },
      "functionKey": { "top": 5, "left": 3, "bottom": 6, "right": 3 },
      "enterAccent": { "top": 5, "left": 3, "bottom": 5, "right": 3 }
    },
    "numeric": {},
    "symbolic": {},
    "toolbar": {},
    "panel": {}
  }
}
```

## keyboards.keyboard26

26 键键盘配置。

```json
{
  "layout": {
    "portrait": {
      "top": ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      "middle": ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      "bottom": ["shift", "z", "x", "c", "v", "b", "n", "m", "backspace"],
      "footer": ["123", "cnen", "space", "spaceRight", "enter"]
    },
    "landscape": {}
  },
  "text": {
    "space": "空格",
    "symbol": "#+=",
    "numericSwitch": "123",
    "enter": {
      "default": "回车",
      "search": "搜索",
      "send": "发送",
      "go": "前往",
      "done": "完成"
    }
  },
  "spaceRight": {
    "pinyin": {
      "primary": { "text": "，", "center": { "x": 0.64, "y": 0.45 } },
      "secondary": { "text": "。", "center": { "x": 0.6, "y": 0.3 } }
    },
    "alphabetic": {
      "primary": { "text": ",", "center": { "x": 0.5, "y": 0.34 } },
      "secondary": { "text": ".", "center": { "x": 0.5, "y": 0.54 } }
    }
  },
  "variants": {
    "9": {
      "portraitRows": [["number1", "number2", "number3"], ["number4", "number5", "number6"], ["number7", "number8", "number9"], ["123", "space", "enter"]]
    },
    "14": {
      "portraitRows": [["qw", "er", "ty", "ui", "op"], ["as", "df", "gh", "jk", "l"], ["shift", "zx", "cv", "bn", "m", "backspace"], ["123", "spaceRight", "space", "cnen", "enter"]]
    }
  }
}
```

其中 `keyboards.keyboard26.variants` 用于保存中文 9 / 14 / 17 / 18 / 26 等不同布局骨架；当前工作台会优先根据 `keyboardCombo.slots.pinyin.variant` 选择对应变体的 `portraitRows` 预览。

## keyboards.numeric

数字键盘配置。

```json
{
  "layout": {
    "portrait": {},
    "landscape": {}
  },
  "text": {
    "return": "返回",
    "symbol": "#+=",
    "space": "空格",
    "period": ".",
    "equal": "=",
    "enter": "换行"
  }
}
```

## keyboards.symbolic

符号键盘配置。

```json
{
  "layout": {},
  "text": {
    "return": "返回"
  },
  "collections": {
    "category": {},
    "description": {}
  }
}
```

## toolbar

工具栏和候选栏配置。

```json
{
  "layout": ["menu", "symbol", "translate", "emoji", "phrase", "pasteboard", "script", "close"],
  "text": {
    "simplified": "简",
    "traditional": "繁",
    "verticalCandidateReturn": "返回"
  },
  "display": {
    "menu": { "type": "systemImageName", "systemImageName": "slider.horizontal.3" },
    "symbol": { "type": "systemImageName", "systemImageName": "xmark.triangle.circle.square" },
    "phrase": { "type": "systemImageName", "systemImageName": "list.bullet.clipboard" }
  },
  "actions": {
    "menu": { "keyboardType": "panel" },
    "symbol": { "keyboardType": "symbolic" },
    "emoji": { "keyboardType": "emojis" },
    "phrase": { "shortcut": "#showPhraseView" },
    "pasteboard": { "shortcut": "#showPasteboardView" },
    "script": { "shortcut": "#toggleScriptView" },
    "close": { "standard": "dismissKeyboard" }
  },
  "iconFontSize": 18,
  "verticalCandidateIconCenter": { "y": 0.53 },
  "horizontalCandidates": {
    "insets": { "left": 3 }
  },
  "verticalCandidates": {
    "styleInsets": { "left": 3, "bottom": 1, "top": 3 }
  }
}
```

其中：

- `toolbar.display.<key>` 控制工具栏按钮显示方式，当前工作台支持 `text` / `systemImageName`。
- `toolbar.actions.<key>` 保存工具栏按钮动作，结构直接对齐皮肤规范文档中的 action 对象。
- 工作台工具栏编辑面板提供“默认搭配 + 手动输入”两种方式；默认搭配会自动切换对应动作类型和值。

## data

数据型配置。首版可以直接保存结构化数组，不必过度拆分。

```json
{
  "swipesEnabled": true,
  "swipes": {
    "pinyin": {},
    "alphabetic": {},
    "numeric": {}
  },
  "hints": {},
  "collections": {}
}
```

当前默认模板已载入 `collectionData.libsonnet`、`swipeData.libsonnet` 和 `swipeData-en.libsonnet`，因此 `collections` 与 `swipes` 在样例文件中不是空对象。

`swipesEnabled` 是滑动功能总开关。关闭时工作台保留 `data.swipes` 原始配置，预览不显示划动标记，导出的 YAML / Jsonnet 也输出空滑动数据；重新开启后恢复使用原有配置。

## config

`config` 保存从 `示例皮肤/config.yaml` 读取的皮肤名称、作者和各设备键盘文件映射。

```json
{
  "name": "皮肤1",
  "author": "https://wzxmer.github.io/Hamster-skin-designer/",
  "pinyin": {
    "iPhone": {
      "portrait": "pinyin_26_portrait",
      "landscape": "pinyin_26_landscape"
    }
  }
}
```

工作台的“皮肤配置”模块直接编辑这些映射。预览区也以这些真实键盘文件名作为主要列表来源，选择 `*_portrait` 时显示竖屏预览，选择 `*_landscape` 时显示横屏预览。

## keyboardCombo

`keyboardCombo` 用于描述“用户最终想怎么组合这套键盘”。它先表达组合策略，再由工作台把组合结果映射回已有 `config`、`toolbar`、`data.swipes` 和具体键盘布局。

```json
{
  "inputStrategy": "separateAlphabetic",
  "slots": {
    "pinyin": { "enabled": true, "source": "custom", "variant": "26" },
    "alphabetic": { "enabled": true, "source": "custom", "variant": "26" },
    "numeric": { "enabled": true, "source": "custom", "variant": "9" },
    "symbolic": { "enabled": true, "source": "custom", "variant": "custom" },
    "emoji": { "enabled": true, "source": "system", "variant": "system" },
    "panel": { "enabled": true, "source": "custom", "variant": "panel" }
  },
  "toolbar": {
    "enabled": true,
    "displayStyle": "icon",
    "allowCustomCount": true
  },
  "swipeBehavior": {
    "mode": "visible"
  },
  "spaceRow": {
    "showSchemaNameOnSpace": true,
    "commaKey": { "enabled": true, "swipeUp": "。" },
    "semicolonKey": { "enabled": false, "swipeUpAction": "#次选上屏" }
  }
}
```

当前约定：

- `inputStrategy`
  - `separateAlphabetic`：独立英文键盘
  - `inlineAlphabetic`：中文键盘内切英文
  - `schemaToggle`：通过方案/开关切换英文输入
- `slots.<slot>.source`
  - `custom`：使用工作台自定义键盘
  - `system`：使用输入法 App 内置键盘
  - `disabled`：禁用该槽位
- `slots.<slot>.variant`
  - 中文键盘可取 `9` / `14` / `17` / `18` / `26`
  - 英文键盘当前可取 `26`
  - 数字键盘可取 `9` / `ios`
  - `symbolic` / `emoji` / `panel` 先用 `system` / `custom` / `panel` 等枚举表达来源

## nativeKeyboardPayloads

`nativeKeyboardPayloads` 是可选的高级原生键盘 seed / 兼容输入，用于保存从示例皮肤 YAML 读取到的实际键盘 payload。

```json
{
  "light": {
    "pinyin_26_portrait": {
      "preeditHeight": 22,
      "toolbarHeight": 41,
      "keyboardHeight": 216,
      "keyboardLayout": []
    }
  },
  "dark": {}
}
```

当前约定：

- 示例键盘预设可把对应示例皮肤的真实 YAML payload 写入这里，作为 `packages/skin-effect` 生成效果模型的 seed。
- 右侧预览不直接读取这里；预览通过 `SkinEffectModel` 获取 resolved native payload。
- YAML 导出不直接读取这里；导出通过 `buildSkinEffectFileEntries()` 获取文件级效果模型。
- 左侧模块不应写 raw payload。左侧只写 `project.json` 的受控字段，例如 `theme`、`keyStyles`、`toolbar`、`keyboardCombo`、`keyboards.*.metrics`。
- `nativeKeyboardPayloads` 只保留示例皮肤原始结构和导入兼容价值，不再作为长期运行真源。
- `swipeBehavior.mode`
  - `disabled`：无上下划动功能
  - `hidden`：有上下划动功能但不显示
  - `visible`：有上下划动功能并显示在按键上
- `toolbar.displayStyle`
  - `icon`：优先使用系统图标
  - `text`：使用纯文字按键名

当前导出约定：

- `symbolic.source = system` 时，直接应用包的 `config.yaml` 不写入 `symbolic` 映射，也不生成 `symbolic_system`；工具栏按钮保留 `keyboardType: symbolic` 指令，由 App 调用内置符号键盘。
- `emoji.source = system` 时，直接应用包的 `config.yaml` 不写入 `emoji` 映射，也不生成 `emoji_system`；工具栏按钮保留 `keyboardType: emojis` 指令，由 App 调用内置 Emoji 键盘。
- 默认“导出皮肤”生成完整皮肤目录包，包含 `config.yaml`、`light/`、`dark/`、`jsonnet/` 和 `demo.png`。
- Jsonnet 不再作为单独导出入口，而是随皮肤包一起导出。
- 默认应用包不包含 `jsonnet/generated/`。
- `jsonnet/main.jsonnet` 固定为 `import 'core/build.libsonnet'`。
- `jsonnet/core/build.libsonnet` 输出与直接 YAML 导出字节同源的 YAML 字符串映射；用 `jsonnet -S -m <out> jsonnet/main.jsonnet` 编译时，应与包内 `config.yaml`、`light/`、`dark/` 关键文件一致。

## previewKeyboards

`previewKeyboards` 保存用户在预览区手动添加的临时预览键盘项。

```json
[
  {
    "id": "keyboard-1780387460162",
    "name": "键盘1",
    "mode": "keyboard26",
    "orientation": "portrait",
    "source": "pinyin_26_portrait"
  }
]
```

这些项目用于工作台预览列表，不是 `config.yaml` 的内置键盘映射。删除手动添加项时会从该列表移除，不删除 `config` 中的真实键盘文件名。

`hiddenPreviewKeyboards` 保存用户从预览下拉列表中隐藏的内置键盘文件名。它只影响工作台预览列表，不删除工作台内的原始 `config` 映射，也不影响 `config.yaml`、`light/` 或 `dark/` 的导出文件。需要改变最终皮肤包含哪些键盘时，应修改 `config` 或 `keyboardCombo`，不能用预览隐藏状态作为导出真源。

## export

导出配置。

```json
{
  "targets": {
    "yaml": true,
    "jsonnet": true
  },
  "mapping": {
    "pinyin": {},
    "alphabetic": {},
    "numeric": {},
    "symbolic": {},
    "panel": {}
  }
}
```

## 兼容策略

- schema 版本必须写入 `schemaVersion`。
- 导入旧项目时通过 adapter 转为当前 schema。
- UI 不直接修改导出产物，只修改 `project.json`。
- 导出器必须是纯函数：输入 `project.json + assets`，输出文件树。
