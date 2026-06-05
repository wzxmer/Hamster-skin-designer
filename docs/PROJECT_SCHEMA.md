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
  "previewKeyboards": [],
  "hiddenPreviewKeyboards": []
}
```

## meta

项目基础信息。

```json
{
  "name": "示例模板1",
  "author": "浮生",
  "description": "C:\\Users\\Lenovo\\Downloads",
  "createdAt": "2026-05-19",
  "updatedAt": "2026-05-20"
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

按键样式配置。这里放通用 insets、圆角、背景素材引用，不放具体键盘布局。

```json
{
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
  }
}
```

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
  "name": "示例模板1",
  "author": "浮生",
  "pinyin": {
    "iPhone": {
      "portrait": "pinyin_26_portrait",
      "landscape": "pinyin_26_landscape"
    }
  }
}
```

工作台的“皮肤配置”模块直接编辑这些映射。预览区也以这些真实键盘文件名作为主要列表来源，选择 `*_portrait` 时显示竖屏预览，选择 `*_landscape` 时显示横屏预览。

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

`hiddenPreviewKeyboards` 保存用户从预览下拉列表中隐藏的内置键盘文件名。它不删除工作台内的原始 `config` 映射，但导出最终皮肤文件时会排除这些键盘：导出的 `config.yaml` 不包含隐藏键盘名，`light/` 和 `dark/` 下也不会生成对应键盘 YAML；预览列表最低保留一个项目。

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
