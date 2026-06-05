local color = import '../lib/color.libsonnet';
local fontSize = import '../lib/fontSize.libsonnet';
local layout = import '../lib/layout.libsonnet';
local layoutConfig = layout.panel;
local panel = import '../lib/panel.libsonnet';
local utils = import '../core/utils.libsonnet';
local themeConfig = import '../lib/theme.libsonnet';
local animation = themeConfig.animation;
local center = themeConfig.center;

local createButton(key, params, theme) = {
  [key + 'Button']: std.prune({
    size: {
      height: layoutConfig.grid.buttonHeight,
    },
    backgroundStyle: 'ButtonBackgroundStyle',
    foregroundStyle: [
      key + 'ButtonForegroundStyle',
      key + 'ButtonForegroundStyle2',
    ],
    action: params.action,
    preeditStateAction: std.get(params, 'preeditStateAction'),
  }),
  [key + 'ButtonForegroundStyle']: utils.makeSystemImageStyle({
    systemImageName: params.label.systemImageName,
    fontSize: fontSize['panel按键前景sf符号大小'],
    normalColor: color[theme]['按键前景颜色'],
    highlightColor: color[theme]['按键前景颜色'],
    center: center['panel键盘按键sf符号前景偏移'],
  }) + std.get(params, 'systemImageColor', {}),
  [key + 'ButtonForegroundStyle2']: utils.makeTextStyle({
    text: params.label.text,
    fontSize: fontSize['panel按键前景文字大小'],
    normalColor: color[theme]['按键前景颜色'],
    highlightColor: color[theme]['按键前景颜色'],
    center: center['panel键盘按键文字前景偏移'],
  }) + std.get(params, 'textColor', {}),
  animation: [
    'ButtonScaleAnimation',
  ],
};

local rows = [
  [
    { key: key } + panel.buttons[key]
    for key in row
  ]
  for row in panel.layout
];

local allButtons = std.flattenArrays(rows);

local keyboard(theme, orientation) =
  std.foldl(
    function(acc, button) acc + createButton(button.key, button, theme),
    allButtons,
    {}
  ) + {
    keyboardLayout: [
      {
        HStack: {
          spacing: layoutConfig.grid.rowSpacing,
          subviews: [
            { Cell: button.key + 'Button' }
            for button in row
          ],
        },
      }
      for row in rows
    ],
    floatTargetScale: panel.floatTargetScale[orientation],
    keyboardStyle: {
      insets: layoutConfig.frame.insets,
      backgroundStyle: 'keyboardBackgroundStyle',
    },
    keyboardBackgroundStyle: {
      buttonStyleType: 'geometry',
      normalColor: color[theme]['键盘背景颜色'],
      cornerRadius: layoutConfig.frame.cornerRadius,
    },
    ButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: { top: 5, left: 3, bottom: 5, right: 3 },
      normalColor: color[theme]['字母键背景颜色-普通'],
      highlightColor: color[theme]['字母键背景颜色-高亮'],
      cornerRadius: 7,
      normalLowerEdgeColor: color[theme]['底边缘颜色-普通'],
      highlightLowerEdgeColor: color[theme]['底边缘颜色-高亮'],
    },
    ButtonScaleAnimation: animation['26键按键动画'],
  };

{
  new(theme, orientation):
    keyboard(theme, orientation),
}
