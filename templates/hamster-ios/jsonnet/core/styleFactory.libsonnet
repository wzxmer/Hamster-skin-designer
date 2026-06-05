local color = import '../lib/color.libsonnet';
local fontSize = import '../lib/fontSize.libsonnet';
local themeConfig = import '../lib/theme.libsonnet';
local center = themeConfig.center;
local utils = import 'utils.libsonnet';

local getOrDefault(spec, defaults, key, fallback=null) =
  if std.objectHas(spec, key) then
    spec[key]
  else
    std.get(defaults, key, fallback);

local resolveFontSize(spec, defaults={}) =
  if std.objectHas(spec, 'fontSize') then
    spec.fontSize
  else if std.objectHas(spec, 'fontSizeKey') then
    fontSize[spec.fontSizeKey] + std.get(spec, 'fontSizeOffset', 0)
  else if std.objectHas(defaults, 'fontSize') then
    defaults.fontSize
  else if std.objectHas(defaults, 'fontSizeKey') then
    fontSize[defaults.fontSizeKey] + std.get(spec, 'fontSizeOffset', std.get(defaults, 'fontSizeOffset', 0))
  else
    null;

local resolveCenter(spec, defaults={}) =
  if std.objectHas(spec, 'center') then
    spec.center
  else if std.objectHas(spec, 'centerKey') then
    center[spec.centerKey]
  else if std.objectHas(defaults, 'center') then
    defaults.center
  else if std.objectHas(defaults, 'centerKey') then
    center[defaults.centerKey]
  else
    null;

local makeForegroundStyle(theme, spec, defaults={}) =
  local mergedKind = getOrDefault(spec, defaults, 'kind', 'text');
  local colorKey = getOrDefault(spec, defaults, 'colorKey', '按键前景颜色');
  local highlightColorKey = getOrDefault(spec, defaults, 'highlightColorKey', colorKey);
  if mergedKind == 'systemImage' then
    utils.makeSystemImageStyle({
      systemImageName: getOrDefault(spec, defaults, 'systemImageName'),
      highlightSystemImageName: getOrDefault(spec, defaults, 'highlightSystemImageName'),
      fontSize: resolveFontSize(spec, defaults),
      normalColor: color[theme][colorKey],
      highlightColor: color[theme][highlightColorKey],
      center: resolveCenter(spec, defaults),
      fontWeight: getOrDefault(spec, defaults, 'fontWeight'),
      targetScale: getOrDefault(spec, defaults, 'targetScale'),
      insets: getOrDefault(spec, defaults, 'insets'),
      contentMode: getOrDefault(spec, defaults, 'contentMode'),
    })
  else if mergedKind == 'assetImage' then
    utils.makeAssetImageStyle({
      assetImageName: getOrDefault(spec, defaults, 'assetImageName'),
      contentMode: getOrDefault(spec, defaults, 'contentMode'),
      insets: getOrDefault(spec, defaults, 'insets'),
      normalColor: color[theme][colorKey],
      highlightColor: color[theme][highlightColorKey],
    })
  else if mergedKind == 'fileImage' then
    utils.makeFileImageStyle({
      contentMode: getOrDefault(spec, defaults, 'contentMode'),
      insets: getOrDefault(spec, defaults, 'insets'),
      center: resolveCenter(spec, defaults),
      normalImage: getOrDefault(spec, defaults, 'normalImage'),
      highlightImage: getOrDefault(spec, defaults, 'highlightImage'),
    })
  else if mergedKind == 'geometry' then
    utils.makeGeometryStyle({
      insets: getOrDefault(spec, defaults, 'insets'),
      normalColor: getOrDefault(spec, defaults, 'normalColor', std.get(color[theme], colorKey, colorKey)),
      highlightColor: getOrDefault(spec, defaults, 'highlightColor', std.get(color[theme], highlightColorKey, highlightColorKey)),
      colorLocation: getOrDefault(spec, defaults, 'colorLocation'),
      colorStartPoint: getOrDefault(spec, defaults, 'colorStartPoint'),
      colorEndPoint: getOrDefault(spec, defaults, 'colorEndPoint'),
      colorGradientType: getOrDefault(spec, defaults, 'colorGradientType'),
      cornerRadius: getOrDefault(spec, defaults, 'cornerRadius'),
      borderSize: getOrDefault(spec, defaults, 'borderSize'),
      normalBorderColor: getOrDefault(spec, defaults, 'normalBorderColor'),
      highlightBorderColor: getOrDefault(spec, defaults, 'highlightBorderColor'),
      normalLowerEdgeColor: getOrDefault(spec, defaults, 'normalLowerEdgeColor'),
      highlightLowerEdgeColor: getOrDefault(spec, defaults, 'highlightLowerEdgeColor'),
      normalShadowColor: getOrDefault(spec, defaults, 'normalShadowColor'),
      highlightShadowColor: getOrDefault(spec, defaults, 'highlightShadowColor'),
      shadowOpacity: getOrDefault(spec, defaults, 'shadowOpacity'),
      shadowRadius: getOrDefault(spec, defaults, 'shadowRadius'),
      shadowOffset: getOrDefault(spec, defaults, 'shadowOffset'),
    })
  else
    utils.makeTextStyle({
      text: getOrDefault(spec, defaults, 'text'),
      fontSize: resolveFontSize(spec, defaults),
      normalColor: color[theme][colorKey],
      highlightColor: color[theme][highlightColorKey],
      center: resolveCenter(spec, defaults),
      insets: getOrDefault(spec, defaults, 'insets'),
      fontWeight: getOrDefault(spec, defaults, 'fontWeight'),
    });

local makeButton(params={}) =
  std.prune({
    size: std.get(params, 'size'),
    bounds: std.get(params, 'bounds'),
    backgroundStyle: std.get(params, 'backgroundStyle'),
    foregroundStyle: std.get(params, 'foregroundStyle'),
    uppercasedStateForegroundStyle: std.get(params, 'uppercasedStateForegroundStyle'),
    capsLockedStateForegroundStyle: std.get(params, 'capsLockedStateForegroundStyle'),
    hintStyle: std.get(params, 'hintStyle'),
    action: std.get(params, 'action'),
    preeditStateAction: std.get(params, 'preeditStateAction'),
    uppercasedStateAction: std.get(params, 'uppercasedStateAction'),
    repeatAction: std.get(params, 'repeatAction'),
    swipeUpAction: std.get(params, 'swipeUpAction'),
    swipeDownAction: std.get(params, 'swipeDownAction'),
    hintSymbolsStyle: std.get(params, 'hintSymbolsStyle'),
    notification: std.get(params, 'notification'),
    animation: std.get(params, 'animation'),
  });

{
  resolveFontSize: resolveFontSize,
  resolveCenter: resolveCenter,
  makeForegroundStyle: makeForegroundStyle,
  makeButton: makeButton,
}
