import { NATIVE_KEYBOARD_PRESET_PAYLOADS } from './native-keyboard-presets.generated.js';
import { sanitizeLegacyNativePayloads } from '../../../../packages/skin-effect/legacy-seed-sanitizer.js';

const IOS_KEYBOARD_SURFACE = {
  cornerRadius: 8.5,
  borderSize: 0.45,
  shadowRadius: 2.2,
  shadowOpacity: 1,
  shadowOffset: { x: 0, y: 1.1 },
};

const IOS_ENTER_SURFACE = {
  cornerRadius: 8.5,
  borderSize: 0,
  shadowRadius: 0.6,
  shadowOpacity: 0.45,
  shadowOffset: { x: 0, y: 0.45 },
};

const IOS18_KEY_SURFACE = {
  cornerRadius: 8.5,
  borderSize: 0,
  shadowRadius: 0,
  shadowOpacity: 0,
  shadowOffset: { x: 0, y: 0 },
};

const IOS26_KEYBOARD_INSETS = {
  normal: { top: 4, left: 3, bottom: 5, right: 3 },
  functionKey: { top: 4, left: 3, bottom: 6, right: 3 },
};

const IOS26_METRICS = {
  portrait: {
    normal: { width: { percentage: 0.1 } },
    a: { width: { percentage: 0.15 }, bounds: { width: '2/3', alignment: 'right' } },
    l: { width: { percentage: 0.15 }, bounds: { width: '2/3', alignment: 'left' } },
    shift: { width: { percentage: 0.15 } },
    backspace: { width: { percentage: 0.15 } },
    '123': { width: { percentage: 0.18 } },
    cnen: { width: { percentage: 0.1 } },
    spaceRight: { width: { percentage: 0.1 } },
    space: { width: { percentage: 0.44 } },
    enter: { width: { percentage: 0.18 } },
  },
  landscape: {
    normal: { width: '146/784' },
    t: { width: '200/784', bounds: { width: '146/200', alignment: 'left' } },
    y: { width: '200/784', bounds: { width: '146/200', alignment: 'right' } },
    a: { width: '200/784', bounds: { width: '146/200', alignment: 'right' } },
    l: { width: '200/784', bounds: { width: '146/200', alignment: 'left' } },
    shift: { width: '200/784' },
    backspace: { width: '200/784' },
    '123': { width: '173/784' },
    cnen: { width: '173/784' },
    spaceRight: { width: '173/784' },
    space: { width: '438/784' },
    enter: { width: '173/784' },
  },
};

const IOS26_TOOLBAR = {
  layout: ['menu', 'symbol', 'translate', 'emoji', 'phrase', 'pasteboard', 'script', 'close'],
  display: {
    menu: { type: 'systemImageName', systemImageName: 'gear' },
    symbol: { type: 'systemImageName', systemImageName: 'xmark.triangle.circle.square' },
    translate: { type: 'systemImageName', systemImageName: 'translate' },
    emoji: { type: 'systemImageName', systemImageName: 'face.smiling' },
    phrase: { type: 'systemImageName', systemImageName: 'list.bullet.clipboard' },
    pasteboard: { type: 'systemImageName', systemImageName: 'doc.on.clipboard' },
    simp2tran: { type: 'text', text: '简体' },
    script: { type: 'systemImageName', systemImageName: 'apple.terminal' },
    close: { type: 'systemImageName', systemImageName: 'keyboard.chevron.compact.down' },
  },
  text: {
    phrase: '短语',
    simp2tran: '简体',
  },
  iconFontSize: 20,
};

const SWIPE_SHORTCUT_LABELS = {
  '#selectText': 'select',
  '#cut': 'cut',
  '#copy': 'copy',
  '#paste': 'paste',
  '#行首': 'home',
  '#行尾': 'end',
};

function swipeLabelTextForAction(action) {
  if (typeof action === 'string') {
    return action === 'tab' ? 'tab' : '';
  }
  if (!action || typeof action !== 'object') return '';
  if (action.character !== undefined && action.character !== null) return String(action.character);
  if (action.symbol !== undefined && action.symbol !== null) return String(action.symbol);
  if (action.shortcut !== undefined && action.shortcut !== null) return SWIPE_SHORTCUT_LABELS[String(action.shortcut)] || '';
  return '';
}

function withSwipeLabels(profiles = {}) {
  const next = structuredClone(profiles);
  for (const profile of Object.values(next)) {
    if (!profile || typeof profile !== 'object') continue;
    for (const direction of ['swipe_up', 'swipe_down']) {
      const entries = profile[direction];
      if (!entries || typeof entries !== 'object') continue;
      Object.values(entries).forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        if (entry.label?.text !== undefined || entry.label?.systemImageName) return;
        const text = swipeLabelTextForAction(entry.action);
        if (!text) return;
        entry.label = { text };
      });
    }
  }
  return next;
}

const IOS26_SWIPE_DATA = withSwipeLabels({
  pinyin: {
    swipe_up: {
      q: { action: { character: '1' } },
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
      x: { action: { shortcut: '#cut' }, center: { x: 0.5, y: 0.25 } },
      c: { action: { shortcut: '#copy' }, center: { x: 0.5, y: 0.25 } },
      v: { action: { shortcut: '#paste' }, center: { x: 0.5, y: 0.25 } },
      b: { action: 'tab', center: { x: 0.5, y: 0.25 } },
      n: { action: { shortcut: '#行首' }, center: { x: 0.5, y: 0.25 } },
      m: { action: { shortcut: '#行尾' }, center: { x: 0.5, y: 0.25 } },
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
  },
  alphabetic: {
    swipe_up: {
      q: { action: { symbol: '1' } },
      w: { action: { symbol: '2' } },
      e: { action: { symbol: '3' } },
      r: { action: { symbol: '4' } },
      t: { action: { symbol: '5' } },
      y: { action: { symbol: '6' } },
      u: { action: { symbol: '7' } },
      i: { action: { symbol: '8' } },
      o: { action: { symbol: '9' } },
      p: { action: { symbol: '0' } },
      a: { action: { shortcut: '#selectText' }, center: { x: 0.5, y: 0.25 } },
      s: { action: { symbol: '-' } },
      d: { action: { symbol: '=' } },
      f: { action: { symbol: '[' } },
      g: { action: { symbol: ']' } },
      h: { action: { symbol: '\\' } },
      j: { action: { symbol: '/' } },
      k: { action: { symbol: ';' } },
      l: { action: { symbol: "'" } },
      z: { action: { symbol: '`' }, center: { x: 0.5, y: 0.25 } },
      x: { action: { shortcut: '#cut' }, center: { x: 0.5, y: 0.25 } },
      c: { action: { shortcut: '#copy' }, center: { x: 0.5, y: 0.25 } },
      v: { action: { shortcut: '#paste' }, center: { x: 0.5, y: 0.25 } },
      b: { action: 'tab', center: { x: 0.5, y: 0.25 } },
      n: { action: { shortcut: '#行首' }, center: { x: 0.5, y: 0.25 } },
      m: { action: { shortcut: '#行尾' }, center: { x: 0.5, y: 0.25 } },
      '123': { action: { shortcut: '#RimeSwitcher' } },
      spaceRight: { action: { symbol: ',' } },
      space: { action: { shortcut: '#次选上屏' } },
      backspace: { action: { shortcut: '#undo' } },
    },
    swipe_down: {
      q: { action: { symbol: '!' } },
      w: { action: { symbol: '@' } },
      e: { action: { symbol: '#' } },
      r: { action: { symbol: '$' } },
      t: { action: { symbol: '%' } },
      y: { action: { symbol: '^' } },
      u: { action: { symbol: '&' } },
      i: { action: { symbol: '*' } },
      o: { action: { symbol: '(' } },
      p: { action: { symbol: ')' } },
      a: { action: { character: '~' }, center: { x: 0.5, y: 0.8 } },
      s: { action: { symbol: '_' } },
      d: { action: { symbol: '+' } },
      f: { action: { symbol: '{' } },
      g: { action: { symbol: '}' } },
      h: { action: { symbol: '|' } },
      j: { action: { symbol: '?' } },
      k: { action: { symbol: ':' } },
      l: { action: { symbol: '"' } },
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
  },
  numeric: {
    swipe_up: {},
    swipe_down: {},
  },
});

function deepCloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function syncToolbarPresetPayloads(nativePayloads, toolbarConfig) {
  const nextPayloads = deepCloneJson(nativePayloads || {});
  const layout = Array.isArray(toolbarConfig?.layout) ? toolbarConfig.layout : [];
  const display = toolbarConfig?.display || {};
  const textMap = toolbarConfig?.text || {};
  const iconFontSize = Number(toolbarConfig?.iconFontSize || 20);
  const buttonNameMap = {
    menu: 'toolbarMenuButton',
    symbol: 'toolbarSymbolButton',
    translate: 'toolbarTranslateButton',
    emoji: 'toolbarEmojiButton',
    phrase: 'toolbarPhraseButton',
    pasteboard: 'toolbarPasteboardButton',
    script: 'toolbarScriptButton',
    close: 'toolbarCloseButton',
    simp2tran: 'toolbarSimp2tranButton',
  };
  for (const themePayloads of Object.values(nextPayloads || {})) {
    if (!themePayloads || typeof themePayloads !== 'object') continue;
    for (const payload of Object.values(themePayloads)) {
      if (!payload || typeof payload !== 'object') continue;
      if (Array.isArray(payload.toolbarLayout) && payload.toolbarLayout.length) {
        payload.toolbarLayout = [{
          HStack: {
            subviews: layout
              .map((key) => buttonNameMap[key])
              .filter(Boolean)
              .map((cellName) => ({ Cell: cellName })),
          },
        }];
      }
      for (const key of layout) {
        const buttonName = buttonNameMap[key];
        if (!buttonName) continue;
        const styleName = `${buttonName}ForegroundStyle`;
        const style = payload[styleName] || payload.toolbarButtonForegroundStyle || payload.toolbarMenuButtonForegroundStyle || {};
        if (!payload[buttonName]) {
          payload[buttonName] = {
            action: key === 'symbol' ? { keyboardType: 'symbolic' } : {},
            backgroundStyle: 'toolbarButtonBackgroundStyle',
            foregroundStyle: styleName,
          };
        } else if (!payload[buttonName].foregroundStyle) {
          payload[buttonName].foregroundStyle = styleName;
        }
        if (!style || typeof style !== 'object') continue;
        const displayValue = display[key] || {};
        if (displayValue.type === 'systemImageName' && displayValue.systemImageName) {
          payload[styleName] = {
            ...style,
            buttonStyleType: 'systemImage',
            systemImageName: displayValue.systemImageName,
            fontSize: iconFontSize,
            center: { x: 0.5, y: 0.55 },
          };
          delete payload[styleName].text;
          continue;
        }
        payload[styleName] = {
          ...style,
          buttonStyleType: 'text',
          text: textMap[key] || displayValue.text || key,
        };
        delete payload[styleName].systemImageName;
      }
    }
  }
  return nextPayloads;
}

function cleanPresetPayloads(nativePayloads) {
  return sanitizeLegacyNativePayloads(nativePayloads || {});
}

const IOS9_VARIANT = {
  portraitRows: [
    ['punctuationColumn', 'number1', 'number2', 'number3', 'backspace'],
    ['punctuationColumn', 'number4', 'number5', 'number6', 'reinput'],
    ['punctuationColumn', 'number7', 'number8', 'number9'],
    ['symbol', '123', 'space', 'cnen', 'enter'],
  ],
  landscapeRows: [
    ['punctuationColumn', 'number1', 'number2', 'number3', 'backspace'],
    ['punctuationColumn', 'number4', 'number5', 'number6', 'reinput'],
    ['punctuationColumn', 'number7', 'number8', 'number9', 'number0'],
    ['symbol', '123', 'space', 'cnen', 'enter'],
  ],
  metrics: {
    portrait: {
      normal: { width: { percentage: 0.3333 } },
      '123': { width: { percentage: 0.18 } },
      space: { width: { percentage: 0.62 } },
      enter: { width: { percentage: 0.2 } },
    },
    landscape: {
      normal: { width: '1/3' },
      '123': { width: '9/50' },
      space: { width: '31/50' },
      enter: { width: '1/5' },
    },
  },
};

const IOS14_VARIANT = {
  portraitRows: [
    ['qw', 'er', 'ty', 'ui', 'op'],
    ['as', 'df', 'gh', 'jk', 'l'],
    ['word', 'zx', 'cv', 'bn', 'm', 'backspace'],
    ['123', 'semicolon', 'space', 'cnen', 'enter'],
  ],
  landscapeRows: [
    ['qw', 'er', 'ty', 'number1', 'number2', 'number3', 'ty', 'ui', 'op'],
    ['as', 'df', 'gh', 'number4', 'number5', 'number6', 'gh', 'jk', 'l'],
    ['word', 'zx', 'cv', 'number7', 'number8', 'number9', 'bn', 'm', 'backspace'],
    ['symbol', 'semicolon', 'space', 'number0', 'space', 'cnen', 'enter'],
  ],
  metrics: {
    portrait: {
      normal: { width: { percentage: 0.2 } },
      shift: { width: { percentage: 0.12795 } },
      backspace: { width: { percentage: 0.1307 } },
      z: { width: { percentage: 0.2 } },
      x: { width: { percentage: 0.2 } },
      c: { width: { percentage: 0.2 } },
      v: { width: { percentage: 0.2 } },
      '123': { width: { percentage: 0.165 } },
      spaceRight: { width: { percentage: 0.135 } },
      cnen: { width: { percentage: 0.135 } },
      space: { width: { percentage: 0.35 } },
      enter: { width: { percentage: 0.215 } },
    },
    landscape: {
      normal: { width: '1/5' },
      shift: { width: '12795/100000' },
      backspace: { width: '1307/10000' },
      z: { width: '1/5' },
      x: { width: '1/5' },
      c: { width: '1/5' },
      v: { width: '1/5' },
      '123': { width: '33/200' },
      spaceRight: { width: '27/200' },
      cnen: { width: '27/200' },
      space: { width: '7/20' },
      enter: { width: '43/200' },
    },
  },
};

const IOS17_VARIANT = {
  portraitRows: [
    ['h', 's', 'z', 'b', 'x', 'm'],
    ['l', 'd', 'y', 'w', 'j', 'n'],
    ['c', 'q', 'g', 'f', 't', 'backspace'],
    ['123', 'cnen', 'space', 'semicolon', 'enter'],
  ],
  landscapeRows: [
    ['h', 's', 'z', 'b', 'x', 'm'],
    ['l', 'd', 'y', 'w', 'j', 'n'],
    ['c', 'q', 'g', 'f', 't', 'backspace'],
    ['123', 'cnen', 'space', 'space', 'semicolon', 'enter'],
  ],
  metrics: {
    portrait: {
      normal: { width: { percentage: 1 / 6 } },
      backspace: { width: { percentage: 0.15 } },
      '123': { width: { percentage: 0.15 } },
      cnen: { width: { percentage: 0.115 } },
      spaceRight: { width: { percentage: 0.135 } },
      space: { width: { percentage: 0.435 } },
      enter: { width: { percentage: 0.2 } },
    },
    landscape: {
      normal: { width: '1/6' },
      backspace: { width: '3/20' },
      '123': { width: '3/20' },
      cnen: { width: '23/200' },
      spaceRight: { width: '27/200' },
      space: { width: '87/200' },
      enter: { width: '1/5' },
    },
  },
};

const IOS18_VARIANT = {
  portraitRows: [
    ['q', 'we', 'rt', 'y', 'u', 'io', 'p'],
    ['a', 'sd', 'fg', 'h', 'jk', 'l'],
    ['word', 'z', 'xc', 'v', 'bn', 'm', 'backspace'],
    ['123', 'semicolon', 'space', 'cnen', 'enter'],
  ],
  landscapeRows: [
    ['q', 'we', 'rt', 'y', 'u', 'io', 'p'],
    ['a', 'sd', 'fg', 'h', 'jk', 'l'],
    ['word', 'z', 'xc', 'v', 'bn', 'm', 'backspace'],
    ['123', 'semicolon', 'space', 'cnen', 'enter'],
  ],
  metrics: {
    portrait: {
      normal: { width: { percentage: 1 / 7 } },
      shift: { width: { percentage: 0.15 } },
      backspace: { width: { percentage: 0.15 } },
      '123': { width: { percentage: 0.2 } },
      spaceRight: { width: { percentage: 0.12 } },
      cnen: { width: { percentage: 0.12 } },
      space: { width: { percentage: 0.4 } },
      enter: { width: { percentage: 0.22 } },
      a: { width: '1.5/7', bounds: { width: '1/1.5', alignment: 'right' } },
      l: { width: '1.5/7', bounds: { width: '1/1.5', alignment: 'left' } },
    },
    landscape: {
      normal: { width: '1/7' },
      shift: { width: '3/20' },
      backspace: { width: '3/20' },
      '123': { width: '1/5' },
      spaceRight: { width: '3/25' },
      cnen: { width: '3/25' },
      space: { width: '2/5' },
      enter: { width: '11/50' },
      a: { width: '3/14', bounds: { width: '2/3', alignment: 'right' } },
      l: { width: '3/14', bounds: { width: '2/3', alignment: 'left' } },
    },
  },
};

const BASE_IOS_PATCH = {
  theme: {
    light: {
      colors: {
        '字母键背景颜色-普通': '#FFFFFF',
        '字母键背景颜色-高亮': '#FFFFFFE6',
        '功能键背景颜色-普通': '#979FAF80',
        '功能键背景颜色-高亮': '#FFFFFFE6',
        '底边缘颜色-普通': '#88898D',
        '底边缘颜色-高亮': '#89898B',
        '按键边缘颜色': '#C7C7CC',
        '按键前景颜色': '#000000',
        '键盘背景颜色': '#D0D3DA',
      },
    },
    dark: {
      colors: {
        '字母键背景颜色-普通': '#3A3A3C',
        '字母键背景颜色-高亮': '#3A3A3C',
        '功能键背景颜色-普通': '#3A3A3C',
        '功能键背景颜色-高亮': '#6B7280',
        '底边缘颜色-普通': '#1E1E1E',
        '底边缘颜色-高亮': '#343941',
        '按键边缘颜色': '#2C2C2E',
        '按键前景颜色': '#FFFFFF',
        '键盘背景颜色': '#474747',
      },
    },
  },
  keyStyles: {
    surfaceStyles: {
      keyboard26: {
        normal: IOS_KEYBOARD_SURFACE,
        functionKey: IOS_KEYBOARD_SURFACE,
        enterAccent: IOS_ENTER_SURFACE,
      },
    },
    buttonInsets: {
      keyboard26: {
        normal: IOS26_KEYBOARD_INSETS.normal,
        functionKey: IOS26_KEYBOARD_INSETS.functionKey,
      },
      numeric: {
        normal: { top: 4, left: 3, bottom: 4, right: 3 },
        functionKey: { top: 4, left: 3, bottom: 4, right: 3 },
      },
      toolbar: {
        menu: { top: 5, left: 3, bottom: 6, right: 3 },
        horizontalCandidates: { top: 0, left: 3, bottom: 0, right: 0 },
      },
    },
  },
  keyboards: {
    keyboard26: {
      metrics: IOS26_METRICS,
      variants: {
        '9': IOS9_VARIANT,
        '14': IOS14_VARIANT,
        '17': IOS17_VARIANT,
        '18': IOS18_VARIANT,
      },
    },
  },
};

function presetPatch({ layout, frame, theme = {}, keyStyles = {}, toolbarStyleInsets = {}, toolbar = {}, spacebarRow, swipesEnabled = true }) {
  return {
    ...BASE_IOS_PATCH,
    theme: {
      ...BASE_IOS_PATCH.theme,
      ...theme,
      shared: {
        ...(BASE_IOS_PATCH.theme.shared || {}),
        ...(theme.shared || {}),
        center: {
          ...(BASE_IOS_PATCH.theme.shared?.center || {}),
          ...(theme.shared?.center || {}),
        },
      },
    },
    keyboardFrame: {
      portrait: {
        preeditHeight: frame.portrait.preeditHeight,
        toolbarHeight: frame.portrait.toolbarHeight,
        keyboardHeight: frame.portrait.keyboardHeight,
      },
      landscape: {
        preeditHeight: frame.landscape.preeditHeight,
        toolbarHeight: frame.landscape.toolbarHeight,
        keyboardHeight: frame.landscape.keyboardHeight,
      },
    },
    keyStyles: {
      ...BASE_IOS_PATCH.keyStyles,
      ...keyStyles,
      surfaceStyles: {
        ...BASE_IOS_PATCH.keyStyles.surfaceStyles,
        ...(keyStyles.surfaceStyles || {}),
      },
      buttonInsets: {
        ...BASE_IOS_PATCH.keyStyles.buttonInsets,
        ...(keyStyles.buttonInsets || {}),
      },
    },
    guide: {
      preferences: {
        keyboardPreset: `ios-${layout}`,
        chineseLayout: layout,
        symbolLayout: 'system',
        emojiLayout: 'system',
        spacebarRow,
      },
    },
    data: {
      swipesEnabled,
      swipes: IOS26_SWIPE_DATA,
    },
    toolbar: {
      ...toolbar,
      style: {
        ...(toolbar.style || {}),
        insets: toolbarStyleInsets,
      },
    },
    keyboardCombo: {
      slots: {
        pinyin: { enabled: true, source: 'custom', variant: layout },
        alphabetic: { enabled: true, source: 'custom', variant: '26' },
        numeric: { enabled: true, source: 'custom', variant: '9' },
        symbolic: { enabled: true, source: 'system', variant: 'system' },
        emoji: { enabled: true, source: 'system', variant: 'system' },
      },
    },
  };
}

export const KEYBOARD_SKIN_PRESETS = [
  {
    value: 'ios-26',
    label: '仿 iOS 26键',
    layout: '26',
    nativePayloads: cleanPresetPayloads(syncToolbarPresetPayloads(NATIVE_KEYBOARD_PRESET_PAYLOADS['ios-26'], IOS26_TOOLBAR)),
    patch: presetPatch({
      layout: '26',
      frame: {
        portrait: { preeditHeight: 22, toolbarHeight: 41, keyboardHeight: 216 },
        landscape: { preeditHeight: 14, toolbarHeight: 30, keyboardHeight: 160 },
      },
      toolbar: IOS26_TOOLBAR,
      theme: {
        shared: {
          center: {
            'toolbar按键偏移': { x: 0.5, y: 0.6 },
          },
        },
      },
      spacebarRow: ['123', 'cnen', 'space', 'spaceRight', 'enter'],
    }),
  },
  {
    value: 'ios-9',
    label: '仿 iOS 9键',
    layout: '9',
    nativePayloads: cleanPresetPayloads(NATIVE_KEYBOARD_PRESET_PAYLOADS['ios-9']),
    patch: presetPatch({
      layout: '9',
      frame: {
        portrait: { preeditHeight: 22, toolbarHeight: 41, keyboardHeight: 216 },
        landscape: { preeditHeight: 14, toolbarHeight: 30, keyboardHeight: 160 },
      },
      spacebarRow: ['symbol', '123', 'space', 'cnen', 'enter'],
    }),
  },
  {
    value: 'ios-14',
    label: '示例 14键',
    layout: '14',
    nativePayloads: cleanPresetPayloads(NATIVE_KEYBOARD_PRESET_PAYLOADS['ios-14']),
    patch: presetPatch({
      layout: '14',
      frame: {
        portrait: { preeditHeight: 22, toolbarHeight: 41, keyboardHeight: 216 },
        landscape: { preeditHeight: 14, toolbarHeight: 30, keyboardHeight: 160 },
      },
      spacebarRow: ['123', 'semicolon', 'space', 'cnen', 'enter'],
      swipesEnabled: false,
    }),
  },
  {
    value: 'ios-17',
    label: '示例 17键',
    layout: '17',
    nativePayloads: cleanPresetPayloads(NATIVE_KEYBOARD_PRESET_PAYLOADS['ios-17']),
    patch: presetPatch({
      layout: '17',
      frame: {
        portrait: { preeditHeight: 22, toolbarHeight: 41, keyboardHeight: 216 },
        landscape: { preeditHeight: 14, toolbarHeight: 30, keyboardHeight: 160 },
      },
      spacebarRow: ['123', 'cnen', 'space', 'semicolon', 'enter'],
      swipesEnabled: false,
    }),
  },
  {
    value: 'ios-18',
    label: '示例 18键',
    layout: '18',
    nativePayloads: cleanPresetPayloads(NATIVE_KEYBOARD_PRESET_PAYLOADS['ios-18']),
    patch: presetPatch({
      layout: '18',
      frame: {
        portrait: { preeditHeight: 22, toolbarHeight: 41, keyboardHeight: 216 },
        landscape: { preeditHeight: 14, toolbarHeight: 30, keyboardHeight: 160 },
      },
      keyStyles: {
        surfaceStyles: {
          keyboard26: {
            normal: IOS18_KEY_SURFACE,
            functionKey: IOS18_KEY_SURFACE,
            enterAccent: IOS18_KEY_SURFACE,
          },
        },
        buttonInsets: {
          keyboard26: {
            normal: { top: 5, left: 3, bottom: 5, right: 3 },
            functionKey: { top: 5, left: 3, bottom: 5, right: 3 },
          },
        },
      },
      spacebarRow: ['123', 'semicolon', 'space', 'cnen', 'enter'],
      swipesEnabled: false,
    }),
  },
];

export const DEFAULT_KEYBOARD_SKIN_PRESET = 'ios-26';

export function keyboardSkinPresetByValue(value) {
  return KEYBOARD_SKIN_PRESETS.find((preset) => preset.value === value) || KEYBOARD_SKIN_PRESETS[0];
}
