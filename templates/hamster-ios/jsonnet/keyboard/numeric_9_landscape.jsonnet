// 尝试直接引用九键竖屏配置，再用横屏的进行patch

local numeric_9_portrait = import 'numeric_9_portrait.jsonnet';
local symbolic_portrait = import 'symbolic_portrait.jsonnet';

local color = import '../lib/color.libsonnet';
local _hintSymbolsData = import '../lib/hintSymbolsData.libsonnet';
local layout = import '../lib/layout.libsonnet';
local layoutConfig = layout.numeric.landscape;
local others = import '../lib/others.libsonnet';
local swipeData = import '../lib/swipeData.libsonnet';
local toolbar = import '../core/toolbar.libsonnet';
local utils = import '../core/utils.libsonnet';

local hintSymbolsStyles = import '../core/hintSymbolsStyles.libsonnet';
local swipeStyles = import '../core/swipeStyles.libsonnet';
local renderer = import '../core/layoutRenderer.libsonnet';
local numberColumnOrder = ['left', 'main1', 'main2', 'main3', 'right'];
local symbolRowOrder = ['top', 'bottom'];

// 上下和下划的数据
local swipe_up = std.get(swipeData, 'number_swipe_up', {});
local swipe_down = std.get(swipeData, 'number_swipe_down', {});
local hintSymbolsData = std.get(_hintSymbolsData, 'number', {});

local renderSymbolRow(rowKey) =
  local cells = layoutConfig.layout.symbolArea[rowKey];
  renderer.renderRow(
    cells,
    renderer.resolveSymbolicCell,
    if rowKey == 'top' then 'HStackStyle1' else 'HStackStyle2'
  );

local renderNumberColumn(columnKey) =
  local cells = layoutConfig.layout.numberArea[columnKey];
  renderer.renderColumn(
    cells,
    renderer.resolveNumericCell,
    if columnKey == 'left' || columnKey == 'right' then 'VStackStyle1' else 'VStackStyle2'
  );

local keyboard(theme) =
  {
    [if std.objectHas(others, '中文键盘方案') then 'rimeSchema']: others['中文键盘方案'],
    preeditHeight: others['横屏']['preedit高度'],
    toolbarHeight: others['横屏']['toolbar高度'],
    keyboardHeight: others['横屏']['keyboard高度'],

    keyboardLayout: [
      {
        VStack: {
          style: 'columnStyle3',
          subviews: [renderSymbolRow(rowKey) for rowKey in symbolRowOrder],
        },
      },
      { VStack: { style: 'columnStyle2' } },
      {
        VStack: {
          style: 'columnStyle1',
          subviews: [renderNumberColumn(columnKey) for columnKey in numberColumnOrder],
        },
      },
    ],
    keyboardStyle: {
      insets: layoutConfig.frame.insets,
      backgroundStyle: 'keyboardBackgroundStyle',
    },
    keyboardBackgroundStyle: {
      buttonStyleType: 'geometry',
      normalColor: color[theme]['键盘背景颜色'],

    },
    columnStyle1: {
      size: {
        width: layoutConfig.split.numberArea,
      },
    },
    columnStyle2: {
      size: {
        width: layoutConfig.split.gap,
      },
    },
    columnStyle3: {
      size: {
        width: layoutConfig.split.symbolArea,
      },
    },
    HStackStyle1: {
      size: {
        height: layoutConfig.rows.content,
      },
    },
    HStackStyle2: {
      size: {
        height: layoutConfig.rows.actions,
      },
    },
    VStackStyle1: {
      size: {
        width: layoutConfig.numberArea.columns.side,
      },
    },
    VStackStyle2: {
      size: {
        width: layoutConfig.numberArea.columns.main,
      },
    },
    // ButtonScaleAnimation: animation['26键按键动画'],

  };

{
  new(theme):
    // 先用竖屏的，后面的拼接后会覆盖
    numeric_9_portrait.keyboard(theme) +
    symbolic_portrait.new(theme) +
    keyboard(theme) +
    swipeStyles.makeSwipeStyles(theme, {
      swipe_up: swipe_up,
      swipe_down: swipe_down,
      type: 'number',
    }) +
    hintSymbolsStyles.getStyle(theme, hintSymbolsData) +  // 长按
    toolbar.getToolBar(theme) +  // 工具栏
    utils.genNumberStyles(theme),  // 批量生成前景
}
