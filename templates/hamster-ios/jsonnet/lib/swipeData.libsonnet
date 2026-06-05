{
  /*
  说明:
    swipe_up和swipe_down为中文26键盘的划动数据
    下面对应的pinyin9(如果当前皮肤不是九键皮肤，就不用管)和number为中文九键和数字九键的划动数据
  格式说明:
    action: 必需， 格式同仓文档
    label:  非必需， 用于控制是否在按键上显示这个划动前景(也就是说不设置就不显示了)，可选text/systemImageName
    fontSize: 非必需，用于单独指定某个划动前景字符大小
    color: 非必需，用于单独指定某个划动前景字符颜色, 格式见下方q键
  */

  swipe_up: {
    q: {
      action: { character: '1' },
      // 单独对某个键的划动前景颜色设置示例
      // color: {
      //   light: { normalColor: '#121212', highlightColor: '#121212' },
      //   dark: { normalColor: '#E5C07B', highlightColor: '#E5C07B' },
      // },
    },
    w: { action: { character: '2' } },
    e: { action: { character: '3' } },
    r: { action: { character: '4' } },
    t: { action: { character: '5' } },
    y: { action: { character: '6' } },
    u: { action: { character: '7' } },
    i: { action: { character: '8' } },
    o: { action: { character: '9' } },
    p: { action: { character: '0' } },
    a: { action: { shortcut: '#selectText' }, center: { x: 0.5, y: 0.25 } },
    s: { action: { character: '-' } },
    d: { action: { character: '=' } },
    f: { action: { character: '[' } },
    g: { action: { character: ']' } },
    h: { action: { character: '\\' } },
    j: { action: { character: '/' } },
    k: { action: { character: ';' } },
    l: { action: { character: "'" } },
    z: { action: { character: '`' }, center: { x: 0.5, y: 0.25 } },
    x: {
      action: { shortcut: '#cut' },
      center: { x: 0.5, y: 0.25 },
    },
    c: {
      action: { shortcut: '#copy' },
      center: { x: 0.5, y: 0.25 },
    },
    v: {
      action: { shortcut: '#paste' },
      center: { x: 0.5, y: 0.25 },
    },
    b: {
      action: 'tab',
      center: { x: 0.5, y: 0.25 },
    },
    n: {
      action: { shortcut: '#行首' },
      center: { x: 0.5, y: 0.25 },
    },
    m: {
      action: { shortcut: '#行尾' },
      center: { x: 0.5, y: 0.25 },
    },
    '123': { action: { shortcut: '#RimeSwitcher' } },
    spaceRight: { action: { character: '。' } },
    space: { action: { shortcut: '#次选上屏' } },
    backspace: { action: { shortcut: '#undo' } },
    enter: { action: { shortcut: '#Enter' } },
    shift: { action: { shortcut: '#keyboardPerformance' } },
  },
  swipe_down: {
    q: { action: { character: '!' } },
    w: { action: { character: '@' } },
    e: { action: { character: '#' } },
    r: { action: { character: '$' } },
    t: { action: { character: '%' } },
    y: { action: { character: '^' } },
    u: { action: { character: '&' } },
    i: { action: { character: '*' } },
    o: { action: { character: '(' } },
    p: { action: { character: ')' } },
    a: { action: { character: '~' }, center: { x: 0.5, y: 0.8 } },
    s: { action: { character: '_' } },
    d: { action: { character: '+' } },
    f: { action: { character: '{' } },
    g: { action: { character: '}' } },
    h: { action: { character: '|' } },
    j: { action: { character: '—' } },
    k: { action: { character: ':' } },
    l: { action: { character: '"' } },
    z: { action: 'tab', center: { x: 0.5, y: 0.8 } },
    x: { action: { symbol: '「' }, center: { x: 0.5, y: 0.85 } },
    c: { action: { symbol: '」' }, center: { x: 0.5, y: 0.75 } },
    v: { action: { character: '<' }, center: { x: 0.5, y: 0.8 } },
    b: { action: { character: '>' }, center: { x: 0.5, y: 0.8 } },
    n: { action: { character: '？' }, center: { x: 0.5, y: 0.8 } },
    m: { action: { character: '...' }, center: { x: 0.5, y: 0.8 } },
    '123': { action: { shortcut: '#方案切换' } },
    backspace: { action: { shortcut: '#redo' } },
    space: { action: { shortcut: '#三选上屏' } },
  },

  // 中文九键划动
  cn9_swipe_up: {
    '1': { action: { symbol: '1' } },
    '2': { action: { symbol: '2' } },
    '3': { action: { symbol: '3' } },
    '4': { action: { symbol: '4' } },
    '5': { action: { symbol: '5' } },
    '6': { action: { symbol: '6' } },
    '7': { action: { symbol: '7' } },
    '8': { action: { symbol: '8' } },
    '9': { action: { symbol: '9' } },
    space: { action: { symbol: '0' } },
  },
  cn9_swipe_down: {
    '3': { action: { sendKeys: 'dt' } },
    '4': { action: { shortcut: '#行首' } },
    '5': { action: { shortcut: '#selectText' } },
    '6': { action: { shortcut: '#行尾' } },
    '7': { action: { shortcut: '#cut' } },
    '8': { action: { shortcut: '#copy' } },
    '9': { action: { shortcut: '#paste' } },

  },

  // 格式和上面一致
  number_swipe_up: {
    // '1': { action: { character: '-' }, label: { text: '-' } },
  },
  number_swipe_down: {
    // '1': { action: { character: '/' }, label: { text: '/' } },
  },
}
