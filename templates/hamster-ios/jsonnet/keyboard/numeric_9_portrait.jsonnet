local collectionData = import '../lib/collectionData.libsonnet';
local color = import '../lib/color.libsonnet';
local fontSize = import '../lib/fontSize.libsonnet';
local _hintSymbolsData = import '../lib/hintSymbolsData.libsonnet';
local layout = import '../lib/layout.libsonnet';
local layoutConfig = layout.numeric.portrait;
local numericConfig = import '../lib/numeric.libsonnet';
local others = import '../lib/others.libsonnet';
local swipeData = import '../lib/swipeData.libsonnet';
local toolbar = import '../core/toolbar.libsonnet';
local utils = import '../core/utils.libsonnet';
local renderer = import '../core/layoutRenderer.libsonnet';
local styleFactory = import '../core/styleFactory.libsonnet';
local buttonSpec = import '../core/buttonSpec.libsonnet';
local themeConfig = import '../lib/theme.libsonnet';
local animation = themeConfig.animation;

local hintSymbolsStyles = import '../core/hintSymbolsStyles.libsonnet';
local swipeStyles = import '../core/swipeStyles.libsonnet';

// 上下和下划的数据
local swipe_up = std.get(swipeData, 'number_swipe_up', {});
local swipe_down = std.get(swipeData, 'number_swipe_down', {});
local hintSymbolsData = std.get(_hintSymbolsData, 'number', {});
local columnOrder = ['left', 'main1', 'main2', 'main3', 'right'];
local digitKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
local collectionConfig = std.get(numericConfig, 'collection', {});
local collectionForegroundConfig = std.get(collectionConfig, 'foreground', {});

local renderColumn(columnKey) =
  local cells = layoutConfig.layout[columnKey];
  renderer.renderColumn(
    cells,
    renderer.resolveNumericCell,
    if columnKey == 'left' || columnKey == 'right' then 'VStackStyle1' else 'VStackStyle2'
  );

local makeForegroundStyle(theme, spec) =
  styleFactory.makeForegroundStyle(theme, spec);


local createButton(params={}) =
  local isNumber = std.get(params, 'isNumber', true);
  styleFactory.makeButton({
    size: std.get(params, 'size'),
    bounds: std.get(params, 'bounds'),
    backgroundStyle: if isNumber then 'numberButtonBackgroundStyle' else std.get(params, 'backgroundStyle', 'systemButtonBackgroundStyle'),
    foregroundStyle:
      if isNumber then
        std.prune([
          'number' + params.key + 'ButtonForegroundStyle',
          if std.objectHas(swipe_up, params.key) then 'number' + params.key + 'ButtonUpForegroundStyle' else null,
          if std.objectHas(swipe_down, params.key) then 'number' + params.key + 'ButtonDownForegroundStyle' else null,
        ])
      else
        std.get(params, 'foregroundStyle', params.key + 'ButtonForegroundStyle'),
    action: std.get(params, 'action', { character: params.key }),
    preeditStateAction: std.get(params, 'preeditStateAction'),
    repeatAction: std.get(params, 'repeatAction'),
    swipeUpAction:
      if std.objectHas(params, 'swipeUpAction') then
        params.swipeUpAction
      else if std.objectHas(swipe_up, params.key) then
        swipe_up[params.key].action
      else
        null,
    swipeDownAction:
      if std.objectHas(params, 'swipeDownAction') then
        params.swipeDownAction
      else if std.objectHas(swipe_down, params.key) then
        swipe_down[params.key].action
      else
        null,
    hintSymbolsStyle:
      if std.objectHas(params, 'hintSymbolsStyle') then
        params.hintSymbolsStyle
      else if std.objectHas(hintSymbolsData, 'number' + params.key) then
        'number' + params.key + 'ButtonHintSymbolsStyle'
      else
        null,
    animation: ['ButtonScaleAnimation'],
  });

local makeDigitButtons() =
  std.foldl(
    function(acc, key)
      acc + {
        [renderer.resolveNumericCell(key)]: createButton(
          params={ key: key }
        ),
      },
    digitKeys,
    {}
  );

local makeActionButtons(theme) =
  std.foldl(
    function(acc, key)
      local spec = buttonSpec.normalizeButton(numericConfig.buttons[key]);
      local buttonName = renderer.resolveNumericCell(key);
      acc + {
        [buttonName]: createButton(
          params={
            key: key,
            size: buttonSpec.resolveSize(spec, std.get(layoutConfig, 'buttonSizes', {})),
            bounds: std.get(spec, 'bounds'),
            backgroundStyle: std.get(spec, 'backgroundStyle', 'systemButtonBackgroundStyle'),
            action: spec.action,
            preeditStateAction: std.get(spec, 'preeditStateAction'),
            repeatAction: std.get(spec, 'repeatAction'),
            swipeUpAction: std.get(spec, 'swipeUpAction'),
            swipeDownAction: std.get(spec, 'swipeDownAction'),
            isNumber: false,
            hintSymbolsStyle: std.get(spec, 'hintSymbolsStyle'),
          }
        ),
        [buttonName + 'ForegroundStyle']: makeForegroundStyle(theme, spec.foreground),
      },
    std.objectFields(numericConfig.buttons),
    {}
  );

local keyboard(theme) =
  makeDigitButtons() + makeActionButtons(theme) + {
    [if std.objectHas(others, '中文键盘方案') then 'rimeSchema']: others['中文键盘方案'],
    preeditHeight: others['竖屏']['preedit高度'],
    toolbarHeight: others['竖屏']['toolbar高度'],
    keyboardHeight: others['竖屏']['keyboard高度'],


    keyboardLayout: [
      renderColumn(columnKey)
      for columnKey in columnOrder
    ],
    keyboardStyle: {
      insets: layoutConfig.frame.insets,
      // "backgroundStyle": "keyboardBackgroundStyle"
    },
    keyboardBackgroundStyle: {
      normalImage: {
        file: 'bg',
        image: 'IMG1',
      },
    },
    VStackStyle1: {
      size: {
        width: layoutConfig.columns.side,
      },
    },
    VStackStyle2: {
      size: {
        width: layoutConfig.columns.main,
      },
    },
    collection: std.prune({
      size: {
        height: layoutConfig.collection.height,
      },
      insets: std.get(collectionConfig, 'insets', null),
      backgroundStyle: 'collectionBackgroundStyle',
      type: std.get(collectionConfig, 'type', 'symbols'),
      dataSource: 'symbols',
      cellStyle: 'collectionCellStyle',
      maxColumns: std.get(collectionConfig, 'maxColumns'),
      contentRightToLeft: std.get(collectionConfig, 'contentRightToLeft'),
      useRimeEngine: std.get(collectionConfig, 'useRimeEngine', true),  // 符号列表经过rime处理
    }),
    collectionBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: { top: 5, left: 3, bottom: 5, right: 3 },
      normalColor: color[theme]['符号键盘左侧collection背景颜色'],
      cornerRadius: 7,
      normalLowerEdgeColor: color[theme]['符号键盘左侧collection背景下边缘颜色'],
    },

    collectionCellStyle: {
      backgroundStyle: 'collectionCellBackgroundStyle',
      foregroundStyle: 'collectionCellForegroundStyle',
    },
    collectionCellBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: { top: 6, left: 3, bottom: 6, right: 3 },
      highlightColor: 'ffffff',
      normalColor: 'ffffff00',
      cornerRadius: 7,
    },
    collectionCellForegroundStyle: std.prune({
      buttonStyleType: 'text',
      normalColor: color[theme]['collection前景颜色'],
      fontSize: fontSize['collection前景字体大小'],
      badgeFontSize: std.get(collectionForegroundConfig, 'badgeFontSize'),
      badgeNormalColor: if std.get(collectionForegroundConfig, 'badgeNormalColorKey') == null then null else color[theme][collectionForegroundConfig.badgeNormalColorKey],
      badgeHighlightColor: if std.get(collectionForegroundConfig, 'badgeHighlightColorKey') == null then null else color[theme][collectionForegroundConfig.badgeHighlightColorKey],
      fontWeight: 0,
    }),

    numberButtonBackgroundStyle: utils.makeGeometryStyle(
      params={
        insets: { top: 4, left: 3, bottom: 4, right: 3 },
        normalColor: color[theme]['字母键背景颜色-普通'],
        highlightColor: color[theme]['字母键背景颜色-高亮'],
        cornerRadius: 7,
        normalLowerEdgeColor: color[theme]['底边缘颜色-普通'],
        highlightLowerEdgeColor: color[theme]['底边缘颜色-高亮'],
      }
    ),

    systemButtonBackgroundStyle: utils.makeGeometryStyle(
      params={
        insets: { top: 4, left: 3, bottom: 4, right: 3 },
        normalColor: color[theme]['功能键背景颜色-普通'],
        highlightColor: color[theme]['功能键背景颜色-高亮'],
        cornerRadius: 7,
        normalLowerEdgeColor: color[theme]['底边缘颜色-普通'],
        highlightLowerEdgeColor: color[theme]['底边缘颜色-高亮'],
      }
    ),

    ButtonScaleAnimation: animation['26键按键动画'],
    alphabeticHintSymbolsBackgroundStyle: hintSymbolsStyles['长按背景样式'],
    alphabeticHintSymbolsSelectedStyle: hintSymbolsStyles['长按选中背景样式'],

    // 左侧符号列表数据来源
    symbols: collectionData.numericSymbols,
  };

{
  new(theme):
    keyboard(theme) +
    swipeStyles.makeSwipeStyles(theme, {
      swipe_up: swipe_up,
      swipe_down: swipe_down,
      type: 'number',
    }) +
    hintSymbolsStyles.getStyle(theme, hintSymbolsData) +
    toolbar.getToolBar(theme) +
    utils.genNumberStyles(theme),

  // 导出keyboard给横屏用
  keyboard: keyboard
}
