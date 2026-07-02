local toolbarLayout = ['menu', 'symbol', 'translate', 'emoji', 'phrase', 'pasteboard', 'script', 'close'];

{
  preedit: {
    style: {
      insets: { top: 2, left: 8, bottom: 0, right: 0 },
      backgroundColorKey: '键盘背景颜色',
      textColorKey: '候选字体未选中字体颜色',
      fontSizeKey: 'preedit区字体大小',
      fontWeight: 0,
    },
  },

  style: {
    insets: {},
  },

  // 工具栏主按钮。
  default: {
    layout: toolbarLayout,
    buttons: {
      menu: {
        key: 'toolbarMenu',
        action: { keyboardType: 'panel' },
        label: { systemImageName: 'gear' },
        fontSize: 20,
      },
      symbol: {
        key: 'toolbarSymbol',
        action: { keyboardType: 'symbolic' },
        label: { systemImageName: 'xmark.triangle.circle.square' },
        fontSize: 20,
      },
      translate: {
        key: 'toolbarTranslate',
        action: { runScript: 'AI翻译' },
        label: { systemImageName: 'translate' },
        fontSize: 20,
      },
      emoji: {
        key: 'toolbarEmoji',
        action: { keyboardType: 'emojis' },
        label: { systemImageName: 'face.smiling' },
        fontSize: 20,
      },
      phrase: {
        key: 'toolbarPhrase',
        action: { shortcut: '#showPhraseView' },
        label: { systemImageName: 'list.bullet.clipboard' },
        fontSize: 20,
      },
      pasteboard: {
        key: 'toolbarPasteboard',
        action: { shortcut: '#showPasteboardView' },
        label: { systemImageName: 'doc.on.clipboard' },
        fontSize: 20,
      },
      script: {
        key: 'toolbarScript',
        action: { shortcut: '#toggleScriptView' },
        label: { systemImageName: 'apple.terminal' },
        fontSize: 20,
      },
      close: {
        key: 'toolbarClose',
        action: 'dismissKeyboard',
        label: { systemImageName: 'keyboard.chevron.compact.down' },
        fontSize: 20,
      },
    },
  },

  english: {
    layout: toolbarLayout,
    overrides: {},
  },

  // 简繁切换按钮。
  simpToggle: {
    off: {
      kind: 'text',
      text: '简',
      fontSize: 20,
      centerKey: 'toolbar按键偏移',
    },
    on: {
      kind: 'text',
      text: '繁',
      fontSize: 20,
      centerKey: 'toolbar按键偏移',
    },
    notification: {
      notificationType: 'rime',
      rimeNotificationType: 'optionChanged',
      rimeOptionName: 'jffh',
      rimeOptionValue: true,
      lockedNotificationMatchState: false,
    },
  },

  candidateContextMenu: null,

  // 候选栏附加按钮。
  horizontalCandidates: {
    style: {
      insets: { top: 8, left: 5, bottom: 3, right: 0 },
      backgroundColorKey: '键盘背景颜色',
    },
    layout: ['horizontalCandidates', 'expandButton'],
    candidate: {
      width: '7/8',
      insets: { top: 0, left: 3, bottom: 0, right: 0 },
      maxColumns: null,
    },
    candidateStyle: {},
    expandButton: {
      action: { shortcut: '#candidatesBarStateToggle' },
      kind: 'systemImage',
      systemImageName: 'chevron.down',
      fontSizeKey: 'toolbar按键前景sf符号大小',
    },
  },

  verticalCandidates: {
    style: {
      insets: { top: 3, left: 3, bottom: 1, right: 0 },
      backgroundImage: {
        file: 'bg',
        image: 'IMG1',
      },
    },
    layout: {
      direction: 'column',
      content: ['verticalCandidates'],
      actions: ['returnButton', 'backspaceButton', 'pageUpButton', 'pageDownButton'],
    },
    candidate: {
      insets: { top: 3, left: 4, bottom: 3, right: 4 },
      maxRows: null,
      maxColumns: null,
      separatorColor: null,
    },
    candidateStyle: {},
    returnButton: {
      action: { shortcut: '#candidatesBarStateToggle' },
      kind: 'text',
      text: '返回',
      fontSizeKey: '按键前景文字大小',
      fontSizeOffset: -3,
    },
    backspaceButton: {
      action: 'backspace',
      kind: 'systemImage',
      systemImageName: 'delete.left',
      fontSizeKey: '数字键盘数字前景字体大小',
      fontSizeOffset: -3,
      center: { y: 0.53 },
    },
    pageUpButton: {
      action: { shortcut: '#verticalCandidatesPageUp' },
      kind: 'systemImage',
      systemImageName: 'chevron.up',
      fontSizeKey: '数字键盘数字前景字体大小',
      fontSizeOffset: -3,
      center: { y: 0.53 },
    },
    pageDownButton: {
      action: { shortcut: '#verticalCandidatesPageDown' },
      kind: 'systemImage',
      systemImageName: 'chevron.down',
      fontSizeKey: '数字键盘数字前景字体大小',
      fontSizeOffset: -3,
      center: { y: 0.53 },
    },
  },
}
