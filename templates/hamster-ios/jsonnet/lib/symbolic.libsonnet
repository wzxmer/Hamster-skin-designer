{
  categoryCollection: {
    insets: null,
    displaySeparatorLine: null,
    separatorLineColorKey: null,
    foreground: {
      badgeFontSize: null,
      badgeNormalColorKey: null,
      badgeHighlightColorKey: null,
    },
  },

  descriptionCollection: {
    displaySeparatorLine: null,
    separatorLineColorKey: null,
    maximumRow: null,
    maximumColumn: null,
    foreground: {
      badgeFontSize: null,
      badgeNormalColorKey: null,
      badgeHighlightColorKey: null,
    },
  },

  // 符号键盘操作键。
  // 推荐使用统一模板字段:
  // - label: 单前景
  // - lockedLabel / unlockedLabel: 状态切换前景
  // - repeat: 等同 repeatAction
  //
  // 如果要新增一个符号键盘按键:
  // 1. 在 layout.libsonnet 的 symbolic.layout 中加入键名
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
    pageUp: {
      sizeRef: 'action',
      action: { shortcut: '#subCollectionPageUp' },
      label: {
        systemImageName: 'chevron.up',
        fontSizeKey: '按键前景sf符号大小',
        center: { y: 0.53 },
      },
    },
    pageDown: {
      sizeRef: 'action',
      action: { shortcut: '#subCollectionPageDown' },
      label: {
        systemImageName: 'chevron.down',
        fontSizeKey: '按键前景sf符号大小',
        center: { y: 0.53 },
      },
    },
    lock: {
      sizeRef: 'action',
      action: 'symbolicKeyboardLockStateToggle',
      unlockedLabel: {
        systemImageName: 'lock.open',
        fontSizeKey: '按键前景sf符号大小',
        center: { y: 0.53 },
      },
      lockedLabel: {
        systemImageName: 'lock',
        fontSizeKey: '按键前景sf符号大小',
        center: { y: 0.53 },
      },
    },
    backspace: {
      sizeRef: 'backspace',
      action: 'backspace',
      repeat: 'backspace',
      label: {
        systemImageName: 'delete.left',
        fontSizeKey: '数字键盘数字前景字体大小',
        fontSizeOffset: -3,
        center: { y: 0.53 },
      },
    },
  },
}
