local color = import '../lib/color.libsonnet';
local layoutConfig = import '../lib/layout.libsonnet';
local layout = layoutConfig.keyboard26;
local renderer = import '../core/layoutRenderer.libsonnet';
local rowOrder = ['top', 'middle', 'bottom', 'footer'];

local renderSideColumn(sideRows, styleName) =
  {
    VStack: std.prune({
      style: styleName,
      subviews: [renderer.renderRow(sideRows[name], renderer.resolveKeyboardCell) for name in rowOrder],
    }),
  };

local keyboardBackground(theme, insets) = {
  keyboardStyle: {
    insets: insets,
    backgroundStyle: 'keyboardBackgroundStyle',
  },
  keyboardBackgroundStyle: {
    buttonStyleType: 'geometry',
    normalColor: color[theme]['键盘背景颜色'],
  },
};

local portraitLayout(theme="light") = {
  keyboardLayout: [renderer.renderRow(layout.portrait.layout[name], renderer.resolveKeyboardCell) for name in rowOrder],
} + keyboardBackground(theme, layout.portrait.frame.insets);

local landscapeLayout(theme="light") = {
  keyboardLayout: [
    renderSideColumn(layout.landscape.layout.left, 'columnStyle1'),
    { VStack: { style: 'columnStyle2' } },
    renderSideColumn(layout.landscape.layout.right, 'columnStyle3'),
  ],
} + keyboardBackground(theme, layout.landscape.frame.insets) + {
  columnStyle1: {
    size: {
      width: layout.landscape.split.left,
    },
  },
  columnStyle2: {
    size: {
      width: layout.landscape.split.gap,
    },
  },
  columnStyle3: {
    size: {
      width: layout.landscape.split.right,
    },
  },
};

{
  getPinyinLayout(theme, orientation):
    if orientation=="portrait" then portraitLayout(theme)
    else landscapeLayout(theme),

  getEnLayout(theme, orientation):
    if orientation=="portrait" then portraitLayout(theme)
    else landscapeLayout(theme),

  getButtonMetrics(theme, orientation):
    if orientation == "portrait" then layout.keyMetrics.portrait
    else layout.keyMetrics.landscape,
}
