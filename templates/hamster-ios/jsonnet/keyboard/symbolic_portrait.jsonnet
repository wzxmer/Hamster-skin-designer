local collectionData = import '../lib/collectionData.libsonnet';
local color = import '../lib/color.libsonnet';
local fontSize = import '../lib/fontSize.libsonnet';
local layout = import '../lib/layout.libsonnet';
local layoutConfig = layout.symbolic.portrait;
local others = import '../lib/others.libsonnet';
local symbolicConfig = import '../lib/symbolic.libsonnet';
local utils = import '../core/utils.libsonnet';
local renderer = import '../core/layoutRenderer.libsonnet';
local styleFactory = import '../core/styleFactory.libsonnet';
local buttonSpec = import '../core/buttonSpec.libsonnet';
local themeConfig = import '../lib/theme.libsonnet';
local animation = themeConfig.animation;
local rowOrder = ['top', 'bottom'];
local categoryCollectionConfig = std.get(symbolicConfig, 'categoryCollection', {});
local categoryForegroundConfig = std.get(categoryCollectionConfig, 'foreground', {});
local descriptionCollectionConfig = std.get(symbolicConfig, 'descriptionCollection', {});
local descriptionForegroundConfig = std.get(descriptionCollectionConfig, 'foreground', {});

local renderRow(rowKey) =
  local cells = layoutConfig.layout[rowKey];
  renderer.renderRow(
    cells,
    renderer.resolveSymbolicCell,
    if rowKey == 'top' then 'HStackStyle1' else 'HStackStyle2'
  );

local createButton(params={}) =
  styleFactory.makeButton({
    size: std.get(params, 'size'),
    bounds: std.get(params, 'bounds'),
    backgroundStyle: std.get(params, 'backgroundStyle', 'systemButtonBackgroundStyle'),
    foregroundStyle: std.get(params, 'foregroundStyle', params.key + 'ButtonForegroundStyle'),
    action: std.get(params, 'action', { character: params.key }),
    preeditStateAction: std.get(params, 'preeditStateAction'),
    repeatAction: std.get(params, 'repeatAction'),
    swipeUpAction: std.get(params, 'swipeUpAction'),
    swipeDownAction: std.get(params, 'swipeDownAction'),
    animation: ['ButtonScaleAnimation'],
  });

local makeForegroundStyle(theme, spec) =
  styleFactory.makeForegroundStyle(theme, spec);

local makeActionButtons(theme) =
  std.foldl(
    function(acc, key)
      local spec = buttonSpec.normalizeButton(symbolicConfig.buttons[key]);
      local buttonName = renderer.resolveSymbolicCell(key);
      if std.objectHas(spec, 'lockedForeground') && std.objectHas(spec, 'unlockedForeground') then
        acc + {
          [buttonName]: createButton(
            params={
              key: key,
              size: buttonSpec.resolveSize(spec, std.get(layoutConfig, 'buttonSizes', {})),
              bounds: std.get(spec, 'bounds'),
              backgroundStyle: std.get(spec, 'backgroundStyle', 'systemButtonBackgroundStyle'),
              foregroundStyle: [
                {
                  styleName: buttonName + 'UnlockedForegroundStyle',
                  conditionKey: '$symbolicKeyboardLockState',
                  conditionValue: false,
                },
                {
                  styleName: buttonName + 'ForegroundStyle',
                  conditionKey: '$symbolicKeyboardLockState',
                  conditionValue: true,
                },
              ],
              action: spec.action,
              preeditStateAction: std.get(spec, 'preeditStateAction'),
              repeatAction: std.get(spec, 'repeatAction'),
              swipeUpAction: std.get(spec, 'swipeUpAction'),
              swipeDownAction: std.get(spec, 'swipeDownAction'),
            }
          ),
          [buttonName + 'ForegroundStyle']: makeForegroundStyle(theme, spec.lockedForeground),
          [buttonName + 'UnlockedForegroundStyle']: makeForegroundStyle(theme, spec.unlockedForeground),
        }
      else
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
            }
          ),
          [buttonName + 'ForegroundStyle']: makeForegroundStyle(theme, spec.foreground),
        },
    std.objectFields(symbolicConfig.buttons),
    {}
  );

local keyboard(theme) =
  makeActionButtons(theme) + {
    keyboardHeight: others['竖屏']['键盘总高度'],
    // "toolbarHeight": others["竖屏"]["toolbar高度"],
    keyboardLayout:
      [renderRow(rowKey) for rowKey in rowOrder],
    keyboardStyle: {
      insets: layoutConfig.frame.insets,
      backgroundStyle: 'keyboardBackgroundStyle',
    },
    keyboardBackgroundStyle: {
      buttonStyleType: 'geometry',
      normalColor: color[theme]['键盘背景颜色'],
    },

    HStackStyle1: {
      size: {
        height: layoutConfig.sections.contentHeight,
      },
    },
    HStackStyle2: {
      size: {
        height: layoutConfig.sections.actionsHeight,
      },
    },
    categoryCollection: std.prune({
      size: {
        width: layoutConfig.sections.categoryWidth,
      },
      backgroundStyle: 'categoryCollectionBackgroundStyle',
      type: 'classifiedSymbols',
      insets: std.get(categoryCollectionConfig, 'insets', null),
      dataSource: 'category',
      cellStyle: 'categoryCollectionCellStyle',
      displaySeparatorLine: std.get(categoryCollectionConfig, 'displaySeparatorLine'),
      separatorLineColor: if std.get(categoryCollectionConfig, 'separatorLineColorKey') == null then null else color[theme][categoryCollectionConfig.separatorLineColorKey],
    }),
    categoryCollectionBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: { top: 5, left: 3, bottom: 5, right: 3 },
      normalColor: color[theme]['符号键盘左侧collection背景颜色'],
      cornerRadius: 7,
      normalShadowColor: color[theme]['符号键盘左侧collection背景下边缘颜色'],
      normalLowerEdgeColor: color[theme]['符号键盘左侧collection背景下边缘颜色'],
    },
    categoryCollectionCellStyle: {
      backgroundStyle: 'categoryCollectionCellBackgroundStyle',
      foregroundStyle: 'categoryCollectionCellForegroundStyle',
    },
    categoryCollectionCellBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: { top: 7, left: 4, bottom: 7, right: 4 },
      normalColor: '00000000',
      highlightColor: color[theme]['字母键背景颜色-普通'],
      cornerRadius: 7,
    },
    categoryCollectionCellForegroundStyle: std.prune({
      buttonStyleType: 'text',
      normalColor: color[theme]['列表未选中字体颜色'],
      highlightColor: color[theme]['列表选中字体颜色'],
      fontSize: fontSize['符号键盘左侧collection前景字体大小'],
      badgeFontSize: std.get(categoryForegroundConfig, 'badgeFontSize'),
      badgeNormalColor: if std.get(categoryForegroundConfig, 'badgeNormalColorKey') == null then null else color[theme][categoryForegroundConfig.badgeNormalColorKey],
      badgeHighlightColor: if std.get(categoryForegroundConfig, 'badgeHighlightColorKey') == null then null else color[theme][categoryForegroundConfig.badgeHighlightColorKey],
      fontWeight: 0,
    }),
    descriptionCollection: std.prune({
      size: {
        width: layoutConfig.sections.descriptionWidth,
      },
      backgroundStyle: 'descriptionCollectionBackgroundStyle',
      type: 'subClassifiedSymbols',
      cellStyle: 'descriptionCollectionCellStyle',
      insets: { left: 4, right: 4, top: 4, bottom: 4 },
      displaySeparatorLine: std.get(descriptionCollectionConfig, 'displaySeparatorLine'),
      separatorLineColor: if std.get(descriptionCollectionConfig, 'separatorLineColorKey') == null then null else color[theme][descriptionCollectionConfig.separatorLineColorKey],
      maximumRow: std.get(descriptionCollectionConfig, 'maximumRow'),
      maximumColumn: std.get(descriptionCollectionConfig, 'maximumColumn'),
    }),
    descriptionCollectionBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: { top: 5, left: 3, bottom: 5, right: 3 },
      normalColor: color[theme]['符号键盘右侧collection背景颜色'],
      cornerRadius: 7,
      normalLowerEdgeColor: color[theme]['符号键盘右侧collection背景下边缘颜色'],
    },
    descriptionCollectionCellStyle: {
      // backgroundStyle: 'categoryCollectionCellBackgroundStyle',
      foregroundStyle: 'descriptionCollectionCellForegroundStyle',
    },
    descriptionCollectionCellForegroundStyle: std.prune({
      buttonStyleType: 'text',
      normalColor: color[theme]['列表未选中字体颜色'],
      highlightColor: color[theme]['列表选中字体颜色'],
      fontSize: fontSize['符号键盘右侧collection前景字体大小'],
      badgeFontSize: std.get(descriptionForegroundConfig, 'badgeFontSize'),
      badgeNormalColor: if std.get(descriptionForegroundConfig, 'badgeNormalColorKey') == null then null else color[theme][descriptionForegroundConfig.badgeNormalColorKey],
      badgeHighlightColor: if std.get(descriptionForegroundConfig, 'badgeHighlightColorKey') == null then null else color[theme][descriptionForegroundConfig.badgeHighlightColorKey],
      fontWeight: 0,
    }),

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
  };
{
  new(theme): keyboard(theme) + collectionData.symbolicDataSource,  // 符号数据源
  getKeyboard(theme): keyboard(theme),  // 给emoji键盘使用，提供无符号数据源的键盘配置
}
