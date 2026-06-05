local color = import '../lib/color.libsonnet';
local fontSize = import '../lib/fontSize.libsonnet';
local _hintSymbolsData = import '../lib/hintSymbolsData.libsonnet';
local keyboard26 = import '../lib/keyboard26.libsonnet';
local keyboardLayout = import 'keyboardLayout.libsonnet';
local others = import '../lib/others.libsonnet';
local toolbar = import '../core/toolbar.libsonnet';
local utils = import '../core/utils.libsonnet';
local styleFactory = import '../core/styleFactory.libsonnet';
local buttonSpec = import '../core/buttonSpec.libsonnet';
local themeConfig = import '../lib/theme.libsonnet';
local animation = themeConfig.animation;
local center = themeConfig.center;

local hintSymbolsStyles = import '../core/hintSymbolsStyles.libsonnet';
local swipeStyles = import '../core/swipeStyles.libsonnet';
local swipeData = import '../lib/swipeData.libsonnet';
local swipeDataEn = import '../lib/swipeData-en.libsonnet';

local normalizeOverlayLabel(item) =
  if std.objectHas(item, 'label') then
    buttonSpec.normalizeLabel(item.label) + (item { label: null })
  else
    buttonSpec.normalizeLabel(item);

local normalizeSchemaLabel(spec) =
  local labelSpec =
    if std.objectHas(spec, 'label') then
      spec.label
    else
      spec;
  buttonSpec.normalizeLabel(labelSpec) + {
    fontSize: std.get(spec, 'fontSize', std.get(labelSpec, 'fontSize', null)),
    center: std.get(spec, 'center', std.get(labelSpec, 'center', null)),
    colorKey: std.get(spec, 'colorKey', '划动字符颜色'),
  };

local normalizeSpaceRight(spec) =
  local rawLabels =
    if std.objectHas(spec, 'labels') then
      spec.labels
    else if std.objectHas(spec, 'list') then
      spec.list
    else if std.objectHas(spec, 'foregrounds') then
      spec.foregrounds
    else
      [];
  spec + {
    foregrounds: [normalizeOverlayLabel(item) for item in rawLabels],
    labels: null,
    list: null,
  };

local enterNotifications = std.get(keyboard26, 'enterNotifications', {});

local enterForegroundStyleName(key) = 'enterButtonForegroundStyle_' + key;

local enterNotificationName(key) = 'returnKeyTypeNotification_' + key;

local enterNotificationTone(spec) = std.get(spec, 'tone', 'default');

local enterLabelText(spec, fallbackKey) =
  std.get(keyboard26.enterLabels, std.get(spec, 'labelKey', fallbackKey), keyboard26.enterLabels.default);

local config = {
  rows: keyboard26.rows,
  enterLabels: keyboard26.enterLabels,
  enterNotifications: enterNotifications,
  systemKeys: keyboard26.systemKeys,
  bottomForegrounds: keyboard26.bottomForegrounds,
  buttons: buttonSpec.normalizeButtons(
    std.get(keyboard26, 'buttons', {}) +
    std.get(keyboard26, 'customKeys', {})
  ),
  variants: {
    pinyin: keyboard26.pinyin + {
      letterActionMode: 'character',
      swipeData: swipeData,
      toolbarVariant: 'default',
      layoutGetter: 'getPinyinLayout',
      styleGenerator: 'pinyin',
      swipeStyleType: 'pinyin',
      hintSymbolsKey: 'pinyin',
      schemaLabel:
        if std.objectHas(keyboard26.pinyin, 'schemaLabel') then
          normalizeSchemaLabel(keyboard26.pinyin.schemaLabel)
        else
          null,
      spaceRight: normalizeSpaceRight(keyboard26.pinyin.spaceRight),
    },
    alphabetic: keyboard26.alphabetic + {
      letterActionMode: 'characterOrSymbol',
      swipeData: swipeDataEn,
      toolbarVariant: 'english',
      layoutGetter: 'getEnLayout',
      styleGenerator: 'alphabetic',
      swipeStyleType: 'pinyin',
      hintSymbolsKey: 'pinyin',
      spaceRight: normalizeSpaceRight(keyboard26.alphabetic.spaceRight),
    },
  },
};

local allKeys = std.flattenArrays(config.rows);

local getLetterSize(buttonMetrics, key) =
  if std.objectHas(buttonMetrics.letters, key) then
    buttonMetrics.letters[key]
  else
    buttonMetrics.letters.default;

local getLetterBounds(buttonMetrics, key) =
  if std.objectHas(buttonMetrics.bounds, key) then
    buttonMetrics.bounds[key]
  else
    null;

local getVariant(variantName) =
  local base = config.variants[variantName];
  base + {
    isBindSchema:
      base.letterActionMode == 'characterOrSymbol' &&
      std.objectHas(others, base.schemaKey),
    buttons:
      config.buttons +
      buttonSpec.normalizeButtons(
        std.get(base, 'buttons', {}) +
        std.get(base, 'customKeys', {})
      ),
  };

local defaultLetterActionField(variant) =
  if variant.letterActionMode == 'characterOrSymbol' && !variant.isBindSchema then
    'symbol'
  else
    'character';

local createButton(variant, swipe_up, swipe_down, hintSymbolsData, params={}) =
  local isLetter = std.get(params, 'isLetter', true);
  local actionField = defaultLetterActionField(variant);
  styleFactory.makeButton({
    size: std.get(params, 'size'),
    bounds: std.get(params, 'bounds'),
    backgroundStyle:
      if isLetter then
        'alphabeticBackgroundStyle'
      else
        std.get(params, 'backgroundStyle', 'systemButtonBackgroundStyle'),
    foregroundStyle:
      if isLetter then
        std.prune([
          params.key + 'ButtonForegroundStyle',
          if std.objectHas(swipe_up, params.key) then params.key + 'ButtonUpForegroundStyle' else null,
          if std.objectHas(swipe_down, params.key) then params.key + 'ButtonDownForegroundStyle' else null,
        ])
      else
        std.get(params, 'foregroundStyle', params.key + 'ButtonForegroundStyle'),
    uppercasedStateForegroundStyle:
      if isLetter then
        std.prune([
          params.key + 'ButtonUppercasedStateForegroundStyle',
          if std.objectHas(swipe_up, params.key) then params.key + 'ButtonUpForegroundStyle' else null,
          if std.objectHas(swipe_down, params.key) then params.key + 'ButtonDownForegroundStyle' else null,
        ])
      else
        null,
    capsLockedStateForegroundStyle:
      if isLetter then
        std.prune([
          params.key + 'ButtonUppercasedStateForegroundStyle',
          if std.objectHas(swipe_up, params.key) then params.key + 'ButtonUpForegroundStyle' else null,
          if std.objectHas(swipe_down, params.key) then params.key + 'ButtonDownForegroundStyle' else null,
        ])
      else
        null,
    hintStyle: params.key + 'ButtonHintStyle',
    action: std.get(params, 'action', { [actionField]: params.key }),
    preeditStateAction: std.get(params, 'preeditStateAction'),
    uppercasedStateAction:
      if isLetter then
        { [actionField]: std.asciiUpper(params.key) }
      else
        null,
    repeatAction: std.get(params, 'repeatAction'),
    swipeUpAction: if std.objectHas(swipe_up, params.key) then swipe_up[params.key].action else null,
    swipeDownAction: if std.objectHas(swipe_down, params.key) then swipe_down[params.key].action else null,
    hintSymbolsStyle: if std.objectHas(hintSymbolsData, params.key) then params.key + 'ButtonHintSymbolsStyle' else null,
    animation: ['ButtonScaleAnimation'],
  });

local makeForegroundStyle(theme, spec) =
  styleFactory.makeForegroundStyle(theme, spec);

local makeSpaceRightForegrounds(theme, variant) =
  std.foldl(
    function(acc, index)
      local spec = variant.spaceRight.foregrounds[index];
      acc + {
        ['spaceRightButtonForegroundStyle' + if index == 0 then '' else std.toString(index + 1)]: makeForegroundStyle(theme, spec),
      },
    std.range(0, std.length(variant.spaceRight.foregrounds) - 1),
    {}
  );

local spaceRightForegroundStyleNames(variant) =
  [
    'spaceRightButtonForegroundStyle' + if index == 0 then '' else std.toString(index + 1)
    for index in std.range(0, std.length(variant.spaceRight.foregrounds) - 1)
  ];

local makeLetterButtons(buttonMetrics, variant, swipe_up, swipe_down, hintSymbolsData) =
  std.foldl(
    function(acc, key)
      acc + {
        [key + 'Button']: createButton(
          variant,
          swipe_up,
          swipe_down,
          hintSymbolsData,
          {
            key: key,
            size: getLetterSize(buttonMetrics, key),
            bounds: getLetterBounds(buttonMetrics, key),
          }
        ),
        [key + 'ButtonHintStyle']: {
          backgroundStyle: 'alphabeticHintBackgroundStyle',
          foregroundStyle: key + 'ButtonHintForegroundStyle',
          swipeUpForegroundStyle: key + 'ButtonSwipeUpHintForegroundStyle',
        },
      },
    allKeys,
    {}
  );

local makeStyleBatch(theme, variant) =
  if variant.styleGenerator == 'pinyin' then
    utils.genPinyinStyles(theme)
  else
    utils.genAlphabeticStyles(theme);

local customForegroundStyleNames(key, spec) =
  if std.objectHas(spec, 'foregrounds') then
    [
      key + 'ButtonForegroundStyle' + if index == 0 then '' else std.toString(index + 1)
      for index in std.range(0, std.length(spec.foregrounds) - 1)
    ]
  else
    [key + 'ButtonForegroundStyle'];

local makeCustomForegroundStyles(theme, key, spec) =
  if std.objectHas(spec, 'foregrounds') then
    std.foldl(
      function(acc, index)
        acc + {
          [customForegroundStyleNames(key, spec)[index]]: makeForegroundStyle(theme, spec.foregrounds[index]),
        },
      std.range(0, std.length(spec.foregrounds) - 1),
      {}
    )
  else if std.objectHas(spec, 'foreground') then
    {
      [key + 'ButtonForegroundStyle']: makeForegroundStyle(theme, spec.foreground),
    }
  else
    {};

local resolveCustomKeySize(buttonMetrics, spec) =
  buttonSpec.resolveSize(spec, buttonMetrics.system, buttonMetrics.system.symbol);

local makeCustomKeys(theme, buttonMetrics, variant) =
  std.foldl(
    function(acc, key)
      local spec = variant.buttons[key];
      local foregroundNames = customForegroundStyleNames(key, spec);
      acc + {
        [key + 'Button']: styleFactory.makeButton({
          size: resolveCustomKeySize(buttonMetrics, spec),
          bounds: std.get(spec, 'bounds'),
          backgroundStyle: std.get(spec, 'backgroundStyle', 'systemButtonBackgroundStyle'),
          foregroundStyle:
            if std.length(foregroundNames) == 1 then foregroundNames[0] else foregroundNames,
          action: spec.action,
          preeditStateAction: std.get(spec, 'preeditStateAction'),
          uppercasedStateAction: std.get(spec, 'uppercasedStateAction'),
          repeatAction: std.get(spec, 'repeatAction'),
          swipeUpAction: std.get(spec, 'swipeUpAction'),
          swipeDownAction: std.get(spec, 'swipeDownAction'),
          hintSymbolsStyle: std.get(spec, 'hintSymbolsStyle'),
          animation: ['ButtonScaleAnimation'],
        }),
      } + makeCustomForegroundStyles(theme, key, spec),
    std.objectFields(variant.buttons),
    {}
  );

local keyboard(theme, orientation, variantName) =
  local variant = getVariant(variantName);
  local swipe_up = std.get(variant.swipeData, 'swipe_up', {});
  local swipe_down = std.get(variant.swipeData, 'swipe_down', {});
  local hintSymbolsData = std.get(_hintSymbolsData, variant.hintSymbolsKey, {});
  local buttonMetrics = keyboardLayout.getButtonMetrics(theme, orientation);
  makeLetterButtons(buttonMetrics, variant, swipe_up, swipe_down, hintSymbolsData) +
  makeCustomKeys(theme, buttonMetrics, variant) + {
    [if std.objectHas(others, variant.schemaKey) then 'rimeSchema']: others[variant.schemaKey],
    preeditHeight: others[if orientation == 'portrait' then '竖屏' else '横屏']['preedit高度'],
    toolbarHeight: others[if orientation == 'portrait' then '竖屏' else '横屏']['toolbar高度'],
    keyboardHeight: others[if orientation == 'portrait' then '竖屏' else '横屏']['keyboard高度'],

    shiftButton: createButton(
      variant,
      swipe_up,
      swipe_down,
      hintSymbolsData,
      {
        key: 'shift',
        action: 'shift',
        size: buttonMetrics.system.shift,
        isLetter: false,
      }
    ) + {
      uppercasedStateAction: 'shift',
      capsLockedStateForegroundStyle: 'shiftButtonCapsLockedForegroundStyle',
      uppercasedStateForegroundStyle: 'shiftButtonUppercasedForegroundStyle',
    },
    shiftButtonForegroundStyle: makeForegroundStyle(theme, config.systemKeys.shift.normal),
    shiftButtonUppercasedForegroundStyle: makeForegroundStyle(theme, config.systemKeys.shift.uppercased),
    shiftButtonCapsLockedForegroundStyle: makeForegroundStyle(theme, config.systemKeys.shift.capsLocked),

    backspaceButton: createButton(
      variant,
      swipe_up,
      swipe_down,
      hintSymbolsData,
      {
        key: 'backspace',
        size: buttonMetrics.system.backspace,
        action: 'backspace',
        repeatAction: 'backspace',
        isLetter: false,
      }
    ),
    backspaceButtonForegroundStyle: makeForegroundStyle(theme, config.systemKeys.backspace),

    symbolButton: createButton(
      variant,
      swipe_up,
      swipe_down,
      hintSymbolsData,
      {
        key: 'symbol',
        size: buttonMetrics.system.symbol,
        action: { keyboardType: 'symbolic' },
        isLetter: false,
      }
    ),
    symbolButtonForegroundStyle: utils.makeTextStyle({
      text: variant.symbolLabel,
      normalColor: color[theme][config.bottomForegrounds.symbol.colorKey],
      highlightColor: color[theme][config.bottomForegrounds.symbol.highlightColorKey],
      fontSize: fontSize[config.bottomForegrounds.symbol.fontSizeKey] + config.bottomForegrounds.symbol.fontSizeOffset,
      center: config.bottomForegrounds.symbol.center,
    }),

    cnenButton: createButton(
      variant,
      swipe_up,
      swipe_down,
      hintSymbolsData,
      {
        key: 'cnen',
        size: buttonMetrics.system.cnen,
        action: { keyboardType: variant.cnenTarget },
        isLetter: false,
      }
    ),
    cnenButtonForegroundStyle: makeForegroundStyle(theme, config.systemKeys.cnen),

    '123Button': createButton(
      variant,
      swipe_up,
      swipe_down,
      hintSymbolsData,
      {
        key: '123',
        size: buttonMetrics.system.numeric,
        action: { keyboardType: if orientation == 'portrait' then 'numeric' else 'symbolic' },
        isLetter: false,
      }
    ),
    '123ButtonForegroundStyle': makeForegroundStyle(theme, config.systemKeys.numericSwitch),

    spaceButton: createButton(
      variant,
      swipe_up,
      swipe_down,
      hintSymbolsData,
      {
        key: 'space',
        size: buttonMetrics.system.space,
        backgroundStyle: 'alphabeticBackgroundStyle',
        foregroundStyle:
          if std.objectHas(variant, 'schemaLabel') then
            ['spaceButtonForegroundStyle', 'spaceButtonForegroundStyle2']
          else
            'spaceButtonForegroundStyle',
        action: 'space',
        isLetter: false,
      }
    ),
    spaceButtonForegroundStyle: utils.makeTextStyle({
      text: variant.spaceLabel,
      normalColor: color[theme][config.bottomForegrounds.space.colorKey],
      highlightColor: color[theme][config.bottomForegrounds.space.highlightColorKey],
      fontSize: fontSize[config.bottomForegrounds.space.fontSizeKey] + config.bottomForegrounds.space.fontSizeOffset,
      center: config.bottomForegrounds.space.center,
    }),
    [if std.objectHas(variant, 'schemaLabel') then 'spaceButtonForegroundStyle2']:
      utils.makeTextStyle({
        text: variant.schemaLabel.text,
        fontSize: variant.schemaLabel.fontSize,
        center: variant.schemaLabel.center,
        normalColor: color[theme][variant.schemaLabel.colorKey],
        highlightColor: color[theme][variant.schemaLabel.colorKey],
      }),

    spaceRightButton: createButton(
      variant,
      swipe_up,
      swipe_down,
      hintSymbolsData,
      {
        key: 'spaceRight',
        size: buttonMetrics.system.spaceRight,
        action: variant.spaceRight.action,
        backgroundStyle: 'alphabeticBackgroundStyle',
        foregroundStyle: spaceRightForegroundStyleNames(variant),
        isLetter: false,
      }
    ),

    enterButton: createButton(
      variant,
      swipe_up,
      swipe_down,
      hintSymbolsData,
      {
        key: 'enter',
        size: buttonMetrics.system.enter,
        action: 'enter',
        isLetter: false,
      }
    ) + {
      backgroundStyle: 'systemButtonBackgroundStyle',
      foregroundStyle: enterForegroundStyleName('default'),
      notification: [enterNotificationName(name) for name in std.objectFields(config.enterNotifications)],
    },
    enterButtonBlueBackgroundStyle: utils.makeGeometryStyle({
      buttonStyleType: 'geometry',
      insets: { top: 4, left: 3, bottom: 4, right: 3 },
      normalColor: color[theme]['enter键背景(蓝色)'],
      highlightColor: color[theme]['功能键背景颜色-高亮'],
      cornerRadius: 7,
      normalLowerEdgeColor: color[theme]['底边缘颜色-普通'],
      highlightLowerEdgeColor: color[theme]['底边缘颜色-高亮'],
    }),
  } +
  {
    [enterForegroundStyleName(name)]: utils.makeTextStyle({
      text: enterLabelText(config.enterNotifications[name], name),
      normalColor: color[theme][if enterNotificationTone(config.enterNotifications[name]) == 'accent' then config.bottomForegrounds.enterAccent.colorKey else config.bottomForegrounds.enterDefault.colorKey],
      highlightColor: color[theme][if enterNotificationTone(config.enterNotifications[name]) == 'accent' then config.bottomForegrounds.enterAccent.highlightColorKey else config.bottomForegrounds.enterDefault.highlightColorKey],
      fontSize: fontSize[if enterNotificationTone(config.enterNotifications[name]) == 'accent' then config.bottomForegrounds.enterAccent.fontSizeKey else config.bottomForegrounds.enterDefault.fontSizeKey] + if enterNotificationTone(config.enterNotifications[name]) == 'accent' then config.bottomForegrounds.enterAccent.fontSizeOffset else config.bottomForegrounds.enterDefault.fontSizeOffset,
      center: if enterNotificationTone(config.enterNotifications[name]) == 'accent' then config.bottomForegrounds.enterAccent.center else config.bottomForegrounds.enterDefault.center,
    })
    for name in std.objectFields(config.enterNotifications)
  } +
  {
    [enterNotificationName(name)]: std.prune({
      notificationType: 'returnKeyType',
      returnKeyType: config.enterNotifications[name].returnKeyType,
      lockedNotificationMatchState: std.get(config.enterNotifications[name], 'lockedNotificationMatchState', false),
      backgroundStyle: if enterNotificationTone(config.enterNotifications[name]) == 'accent' then 'enterButtonBlueBackgroundStyle' else 'systemButtonBackgroundStyle',
      foregroundStyle: enterForegroundStyleName(name),
    })
    for name in std.objectFields(config.enterNotifications)
  } + {
    alphabeticBackgroundStyle: utils.makeGeometryStyle({
      insets: { top: 5, left: 2, bottom: 5, right: 2 },
      normalColor: color[theme]['字母键背景颜色-普通'],
      highlightColor: color[theme]['字母键背景颜色-高亮'],
      cornerRadius: 7,
      normalLowerEdgeColor: color[theme]['底边缘颜色-普通'],
      highlightLowerEdgeColor: color[theme]['底边缘颜色-高亮'],
    }),
    systemButtonBackgroundStyle: utils.makeGeometryStyle({
      insets: { top: 5, left: 3, bottom: 6, right: 3 },
      normalColor: color[theme]['功能键背景颜色-普通'],
      highlightColor: color[theme]['功能键背景颜色-高亮'],
      cornerRadius: 7,
      normalLowerEdgeColor: color[theme]['底边缘颜色-普通'],
      highlightLowerEdgeColor: color[theme]['底边缘颜色-高亮'],
    }),
    alphabeticHintBackgroundStyle: utils.makeGeometryStyle({
      normalColor: color[theme]['气泡背景颜色'],
      highlightColor: color[theme]['气泡高亮颜色'],
      cornerRadius: 7,
      shadowColor: color[theme]['长按背景阴影颜色'],
      shadowOffset: { x: 0, y: 5 },
    }),

    alphabeticHintSymbolsBackgroundStyle: hintSymbolsStyles['长按背景样式'],
    alphabeticHintSymbolsSelectedStyle: hintSymbolsStyles['长按选中背景样式'],
    ButtonScaleAnimation: animation['26键按键动画'],
  } +
  makeSpaceRightForegrounds(theme, variant) +
  keyboardLayout[variant.layoutGetter](theme, orientation) +
  swipeStyles.makeSwipeStyles(theme, {
    swipe_up: swipe_up,
    swipe_down: swipe_down,
    type: variant.swipeStyleType,
  }) +
  hintSymbolsStyles.getStyle(theme, hintSymbolsData) +
  toolbar.getToolBar(theme, variant.toolbarVariant) +
  makeStyleBatch(theme, variant) +
  utils.genHintStyles(theme);

{
  new(theme, orientation, variantName): keyboard(theme, orientation, variantName),
}
