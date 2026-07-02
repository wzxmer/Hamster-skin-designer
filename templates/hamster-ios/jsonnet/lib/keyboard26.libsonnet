{
  // 26 键模板配置。
  rows: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ],

  enterLabels: {
    default: '回车',
    go: '前往',
    search: '搜索',
    send: '发送',
    done: '完成',
  },

  enterNotifications: {
    default: {
      labelKey: 'default',
      tone: 'default',
      returnKeyType: [0, 2, 3, 5, 8, 10, 11],
      lockedNotificationMatchState: false,
    },
    go: {
      labelKey: 'go',
      tone: 'accent',
      returnKeyType: [1, 4],
      lockedNotificationMatchState: false,
    },
    search: {
      labelKey: 'search',
      tone: 'accent',
      returnKeyType: [6],
      lockedNotificationMatchState: false,
    },
    send: {
      labelKey: 'send',
      tone: 'accent',
      returnKeyType: [7],
      lockedNotificationMatchState: false,
    },
    done: {
      labelKey: 'done',
      tone: 'accent',
      returnKeyType: [9],
      lockedNotificationMatchState: false,
    },
  },

  systemKeys: {
    shift: {
      normal: {
        kind: 'systemImage',
        systemImageName: 'shift',
        fontSizeKey: '按键前景文字大小',
      },
      uppercased: {
        kind: 'systemImage',
        systemImageName: 'shift.fill',
        fontSizeKey: '按键前景文字大小',
      },
      capsLocked: {
        kind: 'systemImage',
        systemImageName: 'capslock.fill',
        fontSizeKey: '按键前景文字大小',
      },
    },
    backspace: {
      kind: 'systemImage',
      systemImageName: 'delete.left',
      fontSizeKey: '按键前景文字大小',
      targetScale: 0.7,
    },
    cnen: {
      kind: 'systemImage',
      systemImageName: 'globe',
      fontSizeKey: '按键前景文字大小',
    },
    numericSwitch: {
      kind: 'text',
      text: '123',
      fontSizeKey: '按键前景文字大小',
      fontSizeOffset: -3,
      center: { x: 0.5, y: 0.5 },
    },
  },

  bottomForegrounds: {
    symbol: {
      kind: 'text',
      fontSizeKey: '按键前景文字大小',
      fontSizeOffset: -3,
      center: { x: 0.5, y: 0.5 },
      colorKey: '按键前景颜色',
      highlightColorKey: '按键前景颜色',
    },
    space: {
      kind: 'text',
      fontSizeKey: '按键前景文字大小',
      fontSizeOffset: -3,
      center: { x: 0.5, y: 0.47 },
      colorKey: '按键前景颜色',
      highlightColorKey: '按键前景颜色',
    },
    enterDefault: {
      kind: 'text',
      fontSizeKey: '按键前景文字大小',
      fontSizeOffset: -3,
      center: { x: 0.5, y: 0.47 },
      colorKey: '按键前景颜色',
      highlightColorKey: '按键前景颜色',
    },
    enterAccent: {
      kind: 'text',
      fontSizeKey: '按键前景文字大小',
      fontSizeOffset: -3,
      center: { x: 0.5, y: 0.47 },
      colorKey: '长按选中字体颜色',
      highlightColorKey: '长按非选中字体颜色',
    },
  },

  // 这里可以补 26 键自定义功能键。
  // 用法:
  // 1. 在 layout.libsonnet 的 26 键布局里加入键名
  // 2. 在这里为同名键补配置
  //
  // 示例:
  // buttons: {
  //   myKey: {
  //     sizeRef: 'symbol',
  //     action: { character: '@' },
  //     label: {
  //       text: '@',
  //       fontSizeKey: '按键前景文字大小',
  //     },
  //   },
  // },
  buttons: {},
  customKeys: {},

  pinyin: {
    schemaKey: '中文键盘方案',
    cnenTarget: 'alphabetic',
    symbolLabel: '#+=',
    spaceLabel: '',
    schemaLabel: {
      text: '$rimeSchemaName',
      fontSize: 8,
      center: { x: 0.17, y: 0.2 },
      colorKey: '划动字符颜色',
    },
    spaceRight: {
      action: { character: '，' },
      labels: [
        {
          text: '，',
          fontSizeKey: '按键前景文字大小',
          center: { x: 0.64, y: 0.45 },
        },
        {
          text: '。',
          fontSizeKey: '按键前景文字大小',
          fontSizeOffset: -2,
          center: { x: 0.6, y: 0.3 },
        },
      ],
    },
    buttons: {},
    customKeys: {},
  },

  alphabetic: {
    schemaKey: '英文键盘方案',
    cnenTarget: 'pinyin',
    symbolLabel: '#+=',
    spaceLabel: '',
    spaceRight: {
      action: { symbol: '.' },
      labels: [
        {
          text: ',',
          fontSizeKey: '按键前景文字大小',
          center: { x: 0.5, y: 0.34 },
        },
        {
          text: '.',
          fontSizeKey: '按键前景文字大小',
          center: { x: 0.5, y: 0.54 },
        },
      ],
    },
    buttons: {},
    customKeys: {},
  },
}
