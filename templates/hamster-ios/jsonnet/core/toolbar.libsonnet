local color = import '../lib/color.libsonnet';
local fontSize = import '../lib/fontSize.libsonnet';
local layoutConfig = import '../lib/layout.libsonnet';
local toolbarDiy = import '../lib/toolbar.libsonnet';
local utils = import 'utils.libsonnet';
local themeConfig = import '../lib/theme.libsonnet';
local center = themeConfig.center;
local toolbarLayout = layoutConfig.toolbar;
local preeditConfig = std.get(toolbarDiy, 'preedit', {});
local preeditStyleConfig = std.get(preeditConfig, 'style', {});
local toolbarStyleConfig = std.get(toolbarDiy, 'style', {});
local horizontalCandidatesConfig = std.get(toolbarDiy, 'horizontalCandidates', {});
local horizontalCandidatesStyleConfig = std.get(horizontalCandidatesConfig, 'style', {});
local horizontalCandidatesCandidateConfig = std.get(horizontalCandidatesConfig, 'candidate', {});
local horizontalCandidatesCandidateStyleConfig = std.get(horizontalCandidatesConfig, 'candidateStyle', {});
local horizontalCandidatesLayoutConfig = std.get(horizontalCandidatesConfig, 'layout', ['horizontalCandidates', 'expandButton']);
local verticalCandidatesConfig = std.get(toolbarDiy, 'verticalCandidates', {});
local verticalCandidatesStyleConfig = std.get(verticalCandidatesConfig, 'style', {});
local verticalCandidatesLayoutConfig = std.get(verticalCandidatesConfig, 'layout', {});
local verticalCandidatesCandidateConfig = std.get(verticalCandidatesConfig, 'candidate', {});
local verticalCandidatesCandidateStyleConfig = std.get(verticalCandidatesConfig, 'candidateStyle', {});
local candidateContextMenuConfig = std.get(toolbarDiy, 'candidateContextMenu');
local simpToggleNotificationConfig = std.get(toolbarDiy.simpToggle, 'notification', {});

local normalizedButtonSpec(button) =
  button + {
    foreground: button {
      kind:
        if std.objectHas(button.label, 'systemImageName') then
          'systemImage'
        else
          'text',
      [if std.objectHas(button.label, 'text') then 'text']: button.label.text,
      [if std.objectHas(button.label, 'systemImageName') then 'systemImageName']: button.label.systemImageName,
      label: null,
    },
  };

local toolbarConfig = {
  layout: toolbarDiy.default.layout,
  buttons: {
    [name]: normalizedButtonSpec(toolbarDiy.default.buttons[name])
    for name in std.objectFields(toolbarDiy.default.buttons)
  },
  variants: {
    default: {},
    english: toolbarDiy.english,
  },
};

local variantConfig(variant) = std.get(toolbarConfig.variants, variant, {});

local buttonNames(variant) = std.get(variantConfig(variant), 'layout', toolbarConfig.layout);

local buttonSpec(name, variant) =
  toolbarConfig.buttons[name] +
  std.get(std.get(variantConfig(variant), 'overrides', {}), name, {});

local resolveCenter(spec, fallbackKey='toolbar按键偏移') =
  if std.objectHas(spec, 'center') then
    spec.center
  else if std.objectHas(spec, 'centerKey') then
    center[spec.centerKey]
  else
    center[fallbackKey];

local resolveFontSize(spec, defaultKey, defaultValue) =
  if std.objectHas(spec, 'fontSize') then
    spec.fontSize
  else if std.objectHas(spec, 'fontSizeKey') then
    fontSize[spec.fontSizeKey] + std.get(spec, 'fontSizeOffset', 0)
  else if defaultKey != null then
    fontSize[defaultKey] + std.get(spec, 'fontSizeOffset', 0)
  else
    defaultValue;

local mapHorizontalCellName(name) =
  if name == 'horizontalCandidates' then 'horizontalCandidates'
  else if name == 'expandButton' then 'expandButton'
  else name;

local mapVerticalCellName(name) =
  if name == 'verticalCandidates' then 'verticalCandidates'
  else if name == 'returnButton' then 'verticalCandidateReturnButton'
  else if name == 'backspaceButton' then 'verticalCandidateBackspaceButton'
  else if name == 'pageUpButton' then 'verticalCandidatePageUpButton'
  else if name == 'pageDownButton' then 'verticalCandidatePageDownButton'
  else name;

local makeForeground(theme, spec) =
  if std.get(spec, 'kind', 'systemImage') == 'text' then
    utils.makeTextStyle({
      text: spec.text,
      fontSize: resolveFontSize(spec, 'toolbar按键前景文字大小', fontSize['toolbar按键前景文字大小']),
      normalColor: color[theme][std.get(spec, 'colorKey', 'toolbar按键颜色')],
      highlightColor: color[theme][std.get(spec, 'highlightColorKey', std.get(spec, 'colorKey', 'toolbar按键颜色'))],
      center: resolveCenter(spec),
      fontWeight: std.get(spec, 'fontWeight'),
    })
  else
    utils.makeSystemImageStyle({
      systemImageName: spec.systemImageName,
      fontSize: resolveFontSize(spec, 'toolbar按键前景sf符号大小', fontSize['toolbar按键前景sf符号大小']),
      normalColor: color[theme][std.get(spec, 'colorKey', 'toolbar按键颜色')],
      highlightColor: color[theme][std.get(spec, 'highlightColorKey', std.get(spec, 'colorKey', 'toolbar按键颜色'))],
      center: resolveCenter(spec),
      fontWeight: std.get(spec, 'fontWeight'),
    });

local toolbarButtons(theme, variant) =
  std.foldl(
    function(acc, name)
      local spec = buttonSpec(name, variant);
      acc + {
        [spec.key + 'Button']: std.prune({
          backgroundStyle: 'toolbarButtonBackgroundStyle',
          foregroundStyle: spec.key + 'ButtonForegroundStyle',
          action: spec.action,
          preeditStateAction: std.get(spec, 'preeditStateAction'),
        }),
        [spec.key + 'ButtonForegroundStyle']: makeForeground(theme, spec.foreground),
      },
    buttonNames(variant),
    {}
  );

local getToolBar(theme, variant='default') =
  toolbarButtons(theme, variant) + {
  preeditStyle: {
    insets: std.get(preeditStyleConfig, 'insets', {}),
    backgroundStyle: 'preeditBackgroundStyle',
    foregroundStyle: 'preeditForegroundStyle',
  },
  preeditBackgroundStyle: {
    buttonStyleType: 'geometry',
    normalColor: color[theme][std.get(preeditStyleConfig, 'backgroundColorKey', '键盘背景颜色')],
  },
  preeditForegroundStyle: {
    textColor: color[theme][std.get(preeditStyleConfig, 'textColorKey', '候选字体未选中字体颜色')],
    fontSize: fontSize[std.get(preeditStyleConfig, 'fontSizeKey', 'preedit区字体大小')],
    fontWeight: std.get(preeditStyleConfig, 'fontWeight', 0),
  },

  toolbarStyle: {
    insets: std.get(toolbarStyleConfig, 'insets', {}),
    backgroundStyle: 'toolbarBackgroundStyle',
  },
  toolbarLayout: [
    {
      HStack: {
        subviews: [
          { Cell: buttonSpec(name, variant).key + 'Button' }
          for name in buttonNames(variant)
        ],
      },
    },
  ],
  toolbarBackgroundStyle: {
    buttonStyleType: 'geometry',
    normalColor: color[theme]['键盘背景颜色'],
  },
  toolbarButtonBackgroundStyle: {
    buttonStyleType: 'geometry',
    normalColor: '#00000001',
    highlightColor: '#00000001',
  },
  toolbarPlaceholderButton: {
  },

  [if candidateContextMenuConfig != null then 'candidateContextMenu' else null]: candidateContextMenuConfig,

  toolbarSimp2tranButton: {
    backgroundStyle: 'toolbarButtonBackgroundStyle',
    foregroundStyle: 'simpStyle',
    notification: ['simpstateNotification'],
    action: {
      shortcut: '#简繁切换',
    },
  },

  simpStyle: makeForeground(theme, toolbarDiy.simpToggle.off),
  tranStyle: makeForeground(theme, toolbarDiy.simpToggle.on),
  simpstateNotification: std.prune({
    notificationType: std.get(simpToggleNotificationConfig, 'notificationType', 'rime'),
    rimeNotificationType: std.get(simpToggleNotificationConfig, 'rimeNotificationType', 'optionChanged'),
    rimeOptionName: std.get(simpToggleNotificationConfig, 'rimeOptionName', 'jffh'),
    rimeOptionValue: std.get(simpToggleNotificationConfig, 'rimeOptionValue', true),
    rimeSchemaID: std.get(simpToggleNotificationConfig, 'rimeSchemaID'),
    rimeSchemaName: std.get(simpToggleNotificationConfig, 'rimeSchemaName'),
    lockedNotificationMatchState: std.get(simpToggleNotificationConfig, 'lockedNotificationMatchState', false),
    foregroundStyle: 'tranStyle',
  }),
  toolbarCloseButton: {
    backgroundStyle: 'toolbarButtonBackgroundStyle',
    foregroundStyle: 'toolbarCloseButtonForegroundStyle',
    action: 'dismissKeyboard',
  },
  toolbarCloseButtonForegroundStyle: makeForeground(theme, toolbarConfig.buttons.close.foreground),

  // 横向候选样式
  horizontalCandidatesStyle: {
    insets: std.get(horizontalCandidatesStyleConfig, 'insets', {}),
    backgroundStyle: 'horizontalCandidatesBackgroundStyle',
  },
  // 横向候选布局
  horizontalCandidatesLayout: [
    {
      HStack: {
        subviews: [{ Cell: mapHorizontalCellName(name) } for name in horizontalCandidatesLayoutConfig],
      },
    },
  ],
  // 横向候选文字部分组件
  horizontalCandidates: std.prune({
    type: 'horizontalCandidates',
    size: { width: std.get(horizontalCandidatesCandidateConfig, 'width', toolbarLayout.candidates.horizontalWidth) },
    maxColumns: std.get(horizontalCandidatesCandidateConfig, 'maxColumns'),
    insets: std.get(horizontalCandidatesCandidateConfig, 'insets', { left: 3 }),
    candidateStyle: 'candidateStyle',
  }),
  // 横向候选文字样式
  horizontalCandidatesBackgroundStyle: {
    buttonStyleType: 'geometry',
    normalColor: color[theme][std.get(horizontalCandidatesStyleConfig, 'backgroundColorKey', '键盘背景颜色')],
  },
  candidateStyle: std.prune({
    insets: std.get(horizontalCandidatesCandidateStyleConfig, 'insets'),
    highlightBackgroundColor: std.get(horizontalCandidatesCandidateStyleConfig, 'highlightBackgroundColor', 0),
    preferredBackgroundColor: std.get(horizontalCandidatesCandidateStyleConfig, 'preferredBackgroundColor', color[theme]['选中候选背景颜色']),
    preferredIndexColor: std.get(horizontalCandidatesCandidateStyleConfig, 'preferredIndexColor', color[theme]['候选字体选中字体颜色']),
    preferredTextColor: std.get(horizontalCandidatesCandidateStyleConfig, 'preferredTextColor', color[theme]['候选字体选中字体颜色']),
    preferredCommentColor: std.get(horizontalCandidatesCandidateStyleConfig, 'preferredCommentColor', color[theme]['候选字体选中字体颜色']),
    indexColor: std.get(horizontalCandidatesCandidateStyleConfig, 'indexColor', color[theme]['候选字体未选中字体颜色']),
    textColor: std.get(horizontalCandidatesCandidateStyleConfig, 'textColor', color[theme]['候选字体未选中字体颜色']),
    commentColor: std.get(horizontalCandidatesCandidateStyleConfig, 'commentColor', color[theme]['候选字体未选中字体颜色']),
    indexFontSize: std.get(horizontalCandidatesCandidateStyleConfig, 'indexFontSize', fontSize['未展开候选字体选中字体大小']),
    textFontSize: std.get(horizontalCandidatesCandidateStyleConfig, 'textFontSize', fontSize['未展开候选字体选中字体大小']),
    commentFontSize: std.get(horizontalCandidatesCandidateStyleConfig, 'commentFontSize', fontSize['未展开comment字体大小']),
  }),
  // 横向候选展开按键
  expandButton: {
    backgroundStyle: 'toolbarButtonBackgroundStyle',
    foregroundStyle: 'expandButtonForegroundStyle',
    action: std.get(toolbarDiy.horizontalCandidates.expandButton, 'action', { shortcut: '#candidatesBarStateToggle' }),
  },
  expandButtonForegroundStyle: makeForeground(theme, toolbarDiy.horizontalCandidates.expandButton),

  // 纵向候选定义
  verticalCandidatesStyle: {
    insets: std.get(verticalCandidatesStyleConfig, 'insets', { left: 3, bottom: 1, top: 3 }),
    backgroundStyle: 'verticalCandidateBackgroundStyle',
  },
  // 纵向候选背景
  verticalCandidateBackgroundStyle: {
    buttonStyleType: 'fileImage',
    normalImage: std.get(verticalCandidatesStyleConfig, 'backgroundImage', {
      file: 'bg',
      image: 'IMG1',
    }),
  },
  // 纵向候选布局
  verticalCandidatesLayout: [
    {
      [if std.get(verticalCandidatesLayoutConfig, 'direction', 'column') == 'row' then 'HStack' else 'VStack']: {
        subviews: [{ Cell: mapVerticalCellName(name) } for name in std.get(verticalCandidatesLayoutConfig, 'content', ['verticalCandidates'])],
      },
    },
    {
      [if std.get(verticalCandidatesLayoutConfig, 'direction', 'column') == 'row' then 'HStack' else 'VStack']: {
        style: if std.get(verticalCandidatesLayoutConfig, 'direction', 'column') == 'row' then 'HStackStyle' else 'VStackStyle',
        subviews: [{ Cell: mapVerticalCellName(name) } for name in std.get(verticalCandidatesLayoutConfig, 'actions', ['returnButton', 'backspaceButton', 'pageUpButton', 'pageDownButton'])],
      },
    },
  ],
  // verticalCandidatesLayout: [
  //   {
  //     HStack: {
  //       subviews: [
  //         { Cell: 'verticalCandidates' },
  //       ],
  //     },
  //   },
  //   {
  //     HStack: {
  //       style: 'HStackStyle',
  //       subviews: [
  //         { Cell: 'verticalCandidatePageUpButton' },
  //         { Cell: 'verticalCandidatePageDownButton' },
  //         { Cell: 'verticalCandidateReturnButton' },
  //         { Cell: 'verticalCandidateBackspaceButton' },
  //       ],
  //     },
  //   },
  // ],
  HStackStyle: {
    size: {
      height: toolbarLayout.expandedActions.rowHeight,
    },
  },
  VStackStyle: {
    size: {
      width: toolbarLayout.expandedActions.columnWidth,
    },
  },
  // 纵向候选配置
  verticalCandidates: std.prune({
    type: 'verticalCandidates',
    insets: std.get(verticalCandidatesCandidateConfig, 'insets', {
      top: 3,
      bottom: 3,
      left: 4,
      right: 4,
    }),
    maxRows: std.get(verticalCandidatesCandidateConfig, 'maxRows'),
    maxColumns: std.get(verticalCandidatesCandidateConfig, 'maxColumns'),
    separatorColor: std.get(verticalCandidatesCandidateConfig, 'separatorColor'),
    backgroundStyle: 'verticalCandidateBackgroundStyle',
    candidateStyle: 'verticalCandidateCellStyle',
  }),
  // 纵向候选文字样式
  verticalCandidateCellStyle: std.prune({
    insets: {
      top: 8,
      bottom: 8,
      left: 8,
      right: 8,
    },
    highlightBackgroundColor: std.get(verticalCandidatesCandidateStyleConfig, 'highlightBackgroundColor', 0),
    preferredBackgroundColor: std.get(verticalCandidatesCandidateStyleConfig, 'preferredBackgroundColor', color[theme]['选中候选背景颜色']),
    preferredIndexColor: std.get(verticalCandidatesCandidateStyleConfig, 'preferredIndexColor', color[theme]['候选字体选中字体颜色']),
    preferredTextColor: std.get(verticalCandidatesCandidateStyleConfig, 'preferredTextColor', color[theme]['候选字体选中字体颜色']),
    preferredCommentColor: std.get(verticalCandidatesCandidateStyleConfig, 'preferredCommentColor', color[theme]['候选字体选中字体颜色']),
    indexColor: std.get(verticalCandidatesCandidateStyleConfig, 'indexColor', color[theme]['长按非选中字体颜色']),
    textColor: std.get(verticalCandidatesCandidateStyleConfig, 'textColor', color[theme]['长按非选中字体颜色']),
    commentColor: std.get(verticalCandidatesCandidateStyleConfig, 'commentColor', color[theme]['长按非选中字体颜色']),
    indexFontSize: std.get(verticalCandidatesCandidateStyleConfig, 'indexFontSize', fontSize['展开候选字体选中字体大小']),
    textFontSize: std.get(verticalCandidatesCandidateStyleConfig, 'textFontSize', fontSize['展开候选字体选中字体大小']),
    commentFontSize: std.get(verticalCandidatesCandidateStyleConfig, 'commentFontSize', fontSize['未展开候选字体选中字体大小']),
    bottomRowHeight: std.get(verticalCandidatesCandidateStyleConfig, 'bottomRowHeight'),
  }),

  // verticalCandidateOfCandidateStyle: {
  //   insets: {
  //     top: 8,
  //     bottom: 8,
  //     left: 8,
  //     right: 8,
  //   },
  //   backgroundInsets: {
  //     top: 8,
  //     bottom: 8,
  //     left: 8,
  //     right: 8,
  //   },
  //   cornerRadius: 7,
  //   backgroundColor: 0,
  //   separatorColor: 0,
  //   highlightBackgroundColor: 0,
  //   preferredBackgroundColor: color[theme]['选中候选背景颜色'],
  //   preferredIndexColor: color[theme]['候选字体选中字体颜色'],
  //   preferredTextColor: color[theme]['候选字体选中字体颜色'],
  //   preferredCommentColor: color[theme]['候选字体选中字体颜色'],
  //   indexColor: color[theme]['长按非选中字体颜色'],
  //   textColor: color[theme]['长按非选中字体颜色'],
  //   commentColor: color[theme]['长按非选中字体颜色'],
  //   indexFontSize: fontSize['展开候选字体选中字体大小'],
  //   textFontSize: fontSize['展开候选字体选中字体大小'],
  //   commentFontSize: fontSize['未展开候选字体选中字体大小'],
  // },

  // 纵向候选页面，按键背景样式，除了退格键
  verticalCandidateButtonBackgroundStyle: utils.makeGeometryStyle(
    params={
      insets: { top: 5, left: 3, bottom: 6, right: 3 },
      normalColor: color[theme]['功能键背景颜色-普通'],
      highlightColor: color[theme]['功能键背景颜色-高亮'],
      cornerRadius: 7,
      normalLowerEdgeColor: color[theme]['底边缘颜色-普通'],
      highlightLowerEdgeColor: color[theme]['底边缘颜色-高亮'],
    }
  ),

  // 纵向候选页面，向上翻页按键
  verticalCandidatePageUpButton: {
    backgroundStyle: 'verticalCandidateButtonBackgroundStyle',
    foregroundStyle: 'verticalCandidatePageUpButtonForegroundStyle',
    action: std.get(toolbarDiy.verticalCandidates.pageUpButton, 'action', { shortcut: '#verticalCandidatesPageUp' }),
  },
  // 纵向候选页面，向下翻页按键
  verticalCandidatePageDownButton: {
    backgroundStyle: 'verticalCandidateButtonBackgroundStyle',
    foregroundStyle: 'verticalCandidatePageDownButtonForegroundStyle',
    action: std.get(toolbarDiy.verticalCandidates.pageDownButton, 'action', { shortcut: '#verticalCandidatesPageDown' }),
  },

  verticalCandidatePageUpButtonForegroundStyle: makeForeground(theme, toolbarDiy.verticalCandidates.pageUpButton + {
    colorKey: '按键前景颜色',
  }),
  verticalCandidatePageDownButtonForegroundStyle: makeForeground(theme, toolbarDiy.verticalCandidates.pageDownButton + {
    colorKey: '按键前景颜色',
  }),
  verticalCandidateReturnButton: {
    backgroundStyle: 'verticalCandidateButtonBackgroundStyle',
    foregroundStyle: 'verticalCandidateReturnButtonForegroundStyle',
    action: std.get(toolbarDiy.verticalCandidates.returnButton, 'action', { shortcut: '#candidatesBarStateToggle' }),
  },
  verticalCandidateReturnButtonForegroundStyle: makeForeground(theme, toolbarDiy.verticalCandidates.returnButton + {
    colorKey: '按键前景颜色',
  }),
  verticalCandidateBackspaceButton: {
    backgroundStyle: 'verticalCandidateButtonBackgroundStyle',
    foregroundStyle: 'verticalCandidateBackspaceButtonForegroundStyle',
    action: std.get(toolbarDiy.verticalCandidates.backspaceButton, 'action', 'backspace'),
  },

  verticalCandidateBackspaceButtonForegroundStyle: makeForeground(theme, toolbarDiy.verticalCandidates.backspaceButton + {
    colorKey: '按键前景颜色',
  }),
};

{
  getToolBar: getToolBar,
}
