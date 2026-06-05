{
  collection: {
    type: 'symbols',
    insets: null,
    maxColumns: null,
    contentRightToLeft: null,
    useRimeEngine: null,
    foreground: {
      badgeFontSize: null,
      badgeNormalColorKey: null,
      badgeHighlightColorKey: null,
    },
  },

  // 数字键盘功能键。
  // 推荐使用统一模板字段:
  // - label: 单前景
  // - labels: 多前景
  // - repeat: 等同 repeatAction
  // - swipes.up / swipes.down: 上下划动作
  //
  // 如果要新增一个数字键盘按键:
  // 1. 在 layout.libsonnet 的 numeric.layout 中加入键名
  // 2. 在这里的 buttons 中补同名配置
  // 这样无需再去 keyboard 层手写按钮对象。
  buttons: {
    return: {
      action: 'returnLastKeyboard',
      label: {
        text: '返回',
        fontSizeKey: '按键前景文字大小',
        fontSizeOffset: -3,
      },
    },
    symbol: {
      action: { keyboardType: 'symbolic' },
      label: {
        text: '#+=',
        fontSizeKey: '按键前景文字大小',
        fontSizeOffset: -3,
      },
    },
    space: {
      action: 'space',
      label: {
        text: '空格',
        fontSizeKey: '按键前景文字大小',
        fontSizeOffset: -3,
      },
    },
    backspace: {
      action: 'backspace',
      repeat: 'backspace',
      label: {
        systemImageName: 'delete.left',
        fontSizeKey: '数字键盘数字前景字体大小',
        fontSizeOffset: -3,
        center: { y: 0.53 },
      },
    },
    period: {
      action: { character: '.' },
      label: {
        text: '.',
        fontSizeKey: '数字键盘数字前景字体大小',
      },
    },
    equal: {
      action: { character: '=' },
      label: {
        text: '=',
        fontSizeKey: 'collection前景字体大小',
        fontWeight: 0,
      },
    },
    enter: {
      action: 'enter',
      label: {
        text: '换行',
        fontSizeKey: '按键前景文字大小',
        fontSizeOffset: -3,
      },
    },
  },
}
