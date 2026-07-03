import { createSampleProject } from '../project-schema/index.js';
import { buildEffectiveNativeKeyboardPayload, buildSkinEffectModel } from '../skin-effect/index.js';
import { renderPreview } from '../../apps/workbench/src/ui/preview.js';
import { buildPreviewNativeKeyboardPayload } from '../../apps/workbench/src/ui/preview-adapter.js';
import { KEYBOARD_SKIN_PRESETS } from '../../apps/workbench/src/data/keyboard-presets.js';
import { NATIVE_KEYBOARD_PRESET_PAYLOADS } from '../../apps/workbench/src/data/native-keyboard-presets.generated.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function render(project, options = {}) {
  const { mode = 'keyboard26', ...previewOptions } = options;
  return renderPreview(project, 'light', mode, {
    candidateState: 'toolbar',
    ...previewOptions,
  });
}

const baseProject = createSampleProject();
const baseHtml = render(baseProject);
const baseModel = buildSkinEffectModel(baseProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });
const basePreviewPayload = buildPreviewNativeKeyboardPayload(baseProject, 'light', 'pinyin_26_portrait');
const calibrationPreviewPayload = buildPreviewNativeKeyboardPayload(baseProject, 'light', 'pinyin_26_portrait', { calibrationMode: true });
const enabledSwipeProject = createSampleProject();
enabledSwipeProject.keyboardCombo.swipeBehavior = {
  ...enabledSwipeProject.keyboardCombo.swipeBehavior,
  mode: 'visible',
  showSwipeUp: true,
  showSwipeDown: true,
  layouts: {
    ...(enabledSwipeProject.keyboardCombo.swipeBehavior.layouts || {}),
    pinyin: { mode: 'visible', showSwipeUp: true, showSwipeDown: true },
  },
};
const enabledSwipeModel = buildSkinEffectModel(enabledSwipeProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });
const enabledSwipePreviewPayload = buildPreviewNativeKeyboardPayload(enabledSwipeProject, 'light', 'pinyin_26_portrait');
const enabledSwipeHtml = render(enabledSwipeProject);
const shiftActiveHtml = render(baseProject, { shiftActive: true });
const alphabeticPreviewHtml = render(baseProject, {
  previewSourceName: 'alphabetic_26_portrait',
  keyboardProfile: 'alphabetic',
  pinyinVariant: '26',
});
const alphabeticStandardLandscapeProject = createSampleProject();
alphabeticStandardLandscapeProject.guide = {
  preferences: {
    alphabeticLandscapeLayout: 'standard',
    pinyinLandscapeLayout: 'standard',
  },
};
const alphabeticStandardLandscapeHtml = render(alphabeticStandardLandscapeProject, {
  previewSourceName: 'alphabetic_26_landscape',
  keyboardProfile: 'alphabetic',
  pinyinVariant: '26',
  orientation: 'landscape',
});
const pinyin14StandardLandscapeHtml = render(alphabeticStandardLandscapeProject, {
  previewSourceName: 'pinyin_14_landscape',
  keyboardProfile: 'pinyin',
  pinyinVariant: '14',
  orientation: 'landscape',
});
const guideCaseProject = createSampleProject();
guideCaseProject.keyboards.keyboard26.keyDisplays.q = 'Q';
guideCaseProject.keyboards.keyboard26.keyDisplays['alphabetic.q'] = 'Q';
guideCaseProject.keyboards.keyboard26.keyDisplays['english.q'] = 'Q';
const guideCasePinyinHtml = render(guideCaseProject, { pinyinVariant: '26' });
const guideCaseAlphabeticHtml = render(guideCaseProject, {
  previewSourceName: 'alphabetic_26_portrait',
  keyboardProfile: 'alphabetic',
  pinyinVariant: '26',
});
const pinyin9LowerHtml = render(baseProject, { pinyinVariant: '9' });
const pinyin14LowerHtml = render(baseProject, { pinyinVariant: '14' });
const pinyin17LowerHtml = render(baseProject, { pinyinVariant: '17' });
const pinyin18LowerHtml = render(baseProject, { pinyinVariant: '18' });
const pinyinVariantUpperProject = createSampleProject();
pinyinVariantUpperProject.guide = { preferences: { pinyin26LetterCase: 'upper' } };
const pinyin9UpperHtml = render(pinyinVariantUpperProject, { pinyinVariant: '9' });
const pinyin14UpperHtml = render(pinyinVariantUpperProject, { pinyinVariant: '14' });
const pinyin17UpperHtml = render(pinyinVariantUpperProject, { pinyinVariant: '17' });
const pinyin18UpperHtml = render(pinyinVariantUpperProject, { pinyinVariant: '18' });
const pinyin26LandscapeHtml = render(baseProject, { pinyinVariant: '26', orientation: 'landscape' });

const linkedProject = createSampleProject();
linkedProject.theme.shared.fontSize['按键前景文字大小'] = 33;
linkedProject.theme.light.colors['按键前景颜色'] = '#123456';
linkedProject.theme.shared.customCenters.toolbar.menu = { x: 0.12, y: 0.34 };
linkedProject.toolbar.layout = ['menu', 'close'];

const linkedHtml = render(linkedProject);
const linkedModel = buildSkinEffectModel(linkedProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });

assert(linkedModel.nativePayload.qButtonForegroundStyle.fontSize === 33, '效果模型应同步按键文字大小。');
assert(linkedModel.nativePayload.qButtonForegroundStyle.normalColor === '#123456', '效果模型应同步按键前景颜色。');
assert(linkedHtml.includes('#123456'), '预览 HTML 应同步按键前景颜色。');
assert(baseProject.theme.shared.center['26键中文前景偏移'].y === 0.5, '默认项目数据应保留 26 键字母原始中心点。');
assert(baseModel.nativePayload.HStackStyle?.size?.height === '1/5', '导出模型应保留 26 键实机行高。');
assert(basePreviewPayload.HStackStyle?.size?.height === '1/4', '预览 adapter 应把 26 键实机行高映射为 4 行预览比例。');
assert(!baseModel.nativePayload.qButton?.foregroundStyle?.includes('qButtonUpForegroundStyle'), '默认关闭划动时，导出模型不应保留 26 键原始上划引用。');
assert(enabledSwipeModel.nativePayload.qButton?.foregroundStyle?.includes('qButtonUpForegroundStyle'), '显式开启划动时，导出模型应保留 26 键原始上划引用。');
assert(!baseModel.nativePayload.qButton?.foregroundStyle?.includes('qButtonSwipeUpForegroundStyle'), '导出模型不应引用预览 SwipeUp 别名。');
assert(basePreviewPayload.qButtonForegroundStyle?.previewFontScale === 1.5, '预览 adapter 应把 26 字母缩放作为预览映射。');
assert(basePreviewPayload.qButtonForegroundStyle?.fontSize === 15, '预览 adapter 不应改变 26 字母真实字号。');
assert(basePreviewPayload.qButtonForegroundStyle?.center?.y === 0.54, '预览 adapter 应把默认 26 字母视觉中心映射为偏下。');
assert(calibrationPreviewPayload.qButtonForegroundStyle?.previewFontScale === 1, '预览校准模式不应继续放大 26 字母。');
assert(calibrationPreviewPayload.qButtonForegroundStyle?.center?.y === 0.5, '预览校准模式应保留 26 字母真实中心点。');
assert(!basePreviewPayload.qButton?.foregroundStyle?.includes('qButtonSwipeUpForegroundStyle'), '默认关闭划动时，预览 adapter 不应显示上划别名。');
assert(enabledSwipePreviewPayload.qButton?.foregroundStyle?.includes('qButtonSwipeUpForegroundStyle'), '显式开启划动时，预览 adapter 应把 26 原始上划引用映射为预览别名。');
assert(!baseHtml.includes('left:12%;top:34%'), '基准预览不应包含测试 toolbar 偏移。');
assert(linkedHtml.includes('left:12%;top:34%'), '预览 HTML 应同步 toolbar 自定义偏移。');
assert(linkedHtml.includes('data-preview-key="menu"'), '预览 HTML 应渲染 toolbar 菜单按钮。');
assert(linkedHtml.includes('data-preview-key="close"'), '预览 HTML 应渲染 toolbar 收起按钮。');
assert(!linkedHtml.includes('data-preview-key="translate"'), '预览 HTML 应同步 toolbar 布局删减。');
assert(baseHtml.includes('font-size:22.5px'), '默认 26 键中文预览应放大显示字母，但不改变导出字号。');
assert(!alphabeticPreviewHtml.includes('is-pinyin-variant-keyboard'), '英文 26 键预览不应被中文 14/17/18 变体渲染覆盖。');
assert(alphabeticPreviewHtml.includes('>英</span>'), '英文 26 键中英切换键应显示英文态。');
assert(alphabeticStandardLandscapeHtml.includes('is-keyboard26-standard-landscape-keyboard'), '英文 26 键横屏常规模式应渲染普通横屏布局。');
assert(!alphabeticStandardLandscapeHtml.includes('is-keyboard26-landscape-keyboard'), '英文 26 键横屏常规模式不应继续渲染分割布局。');
assert(previewClassCellHtml(alphabeticStandardLandscapeHtml, 'q').includes('flex:0 0 10%'), '英文 26 键横屏常规模式应沿用竖屏 26 键普通键宽。');
assert(previewClassCellHtml(alphabeticStandardLandscapeHtml, 'space').includes('flex:0 0 44%'), '英文 26 键横屏常规模式应沿用竖屏 26 键空格宽度。');
assert(pinyin14StandardLandscapeHtml.includes('is-pinyin14-landscape-keyboard'), '中文 14 键横屏应保持专用布局，不受 26 键横屏常规选项影响。');

function previewKeyCellHtml(html, key) {
  const marker = `data-preview-key="${key}"`;
  let start = html.indexOf(marker);
  if (start < 0) start = html.indexOf(`is-${key} `);
  if (start < 0) return '';
  const next = html.indexOf('data-preview-key="', start + marker.length);
  const nextClassCell = html.indexOf('<div class="calayer-cell', start + marker.length);
  const end = [next, nextClassCell].filter((index) => index > start).sort((a, b) => a - b)[0];
  return html.slice(start, end || undefined);
}

function previewClassCellHtml(html, className) {
  const marker = `is-${className}`;
  const start = html.indexOf(marker);
  if (start < 0) return '';
  const nextClassCell = html.indexOf('<div class="calayer-cell', start + marker.length);
  return html.slice(start, nextClassCell > start ? nextClassCell : undefined);
}

function foregroundCount(html) {
  return (html.match(/class="calayer-foreground/g) || []).length;
}

function swipeForegroundCount(html) {
  return (html.match(/class="calayer-foreground[^"]*is-swipe/g) || []).length;
}

const shiftQCellHtml = previewKeyCellHtml(shiftActiveHtml, 'q');
assert(previewKeyCellHtml(baseHtml, 'q').includes('left:50%;top:54%'), '默认 26 键字母预览应在视觉中心略偏下。');
assert(previewKeyCellHtml(baseHtml, 'q').includes('>q</span>') && !previewKeyCellHtml(baseHtml, 'q').includes('>Q</span>'), '使用引导默认小写时，中文 26 键预览 q 应显示小写。');
assert(previewKeyCellHtml(alphabeticPreviewHtml, 'q').includes('>q</span>') && !previewKeyCellHtml(alphabeticPreviewHtml, 'q').includes('>Q</span>'), '使用引导默认小写时，英文 26 键预览 q 应显示小写。');
assert(previewKeyCellHtml(guideCasePinyinHtml, 'q').includes('>Q</span>') && !previewKeyCellHtml(guideCasePinyinHtml, 'q').includes('>q</span>'), '使用引导中文大写时，中文 26 键预览 q 应显示大写。');
assert(previewKeyCellHtml(guideCaseAlphabeticHtml, 'q').includes('>Q</span>') && !previewKeyCellHtml(guideCaseAlphabeticHtml, 'q').includes('>q</span>'), '使用引导英文大写时，英文 26 键预览 q 应显示大写。');
assert(previewKeyCellHtml(pinyin9LowerHtml, 'number2').includes('>abc</span>'), '使用引导默认小写时，中文 9 键 number2 应显示 abc。');
assert(previewKeyCellHtml(pinyin9UpperHtml, 'number2').includes('>ABC</span>'), '使用引导中文大写时，中文 9 键 number2 应显示 ABC。');
assert(previewKeyCellHtml(pinyin14LowerHtml, 'qw').includes('>qw</span>'), '使用引导默认小写时，中文 14 键 qw 应显示小写。');
assert(previewKeyCellHtml(pinyin14UpperHtml, 'qw').includes('>QW</span>'), '使用引导中文大写时，中文 14 键 qw 应显示大写。');
assert(previewKeyCellHtml(pinyin17LowerHtml, 'h').includes('>hp</span>'), '使用引导默认小写时，中文 17 键 h 应显示 hp。');
assert(previewKeyCellHtml(pinyin17UpperHtml, 'h').includes('>HP</span>'), '使用引导中文大写时，中文 17 键 h 应显示 HP。');
assert(previewKeyCellHtml(pinyin18LowerHtml, 'we').includes('>we</span>'), '使用引导默认小写时，中文 18 键 we 应显示小写。');
assert(previewKeyCellHtml(pinyin18UpperHtml, 'we').includes('>WE</span>'), '使用引导中文大写时，中文 18 键 we 应显示大写。');
assert(previewKeyCellHtml(pinyin26LandscapeHtml, 'shift').includes('system-image-svg') && !previewKeyCellHtml(pinyin26LandscapeHtml, 'shift').includes('>shift</span>'), '中文 26 键横屏 shift 应显示图标，不显示 shift 文本。');
assert(
  foregroundCount(shiftQCellHtml) === foregroundCount(previewKeyCellHtml(baseHtml, 'q')),
  'Shift 激活时 native 预览只应改变字母大小写，不应增删 q 键前景层。',
);
assert(
  swipeForegroundCount(shiftQCellHtml) === 0,
  '默认关闭划动时，Shift 激活后的 native 预览不应显示 q 键上下划提示。',
);
assert(
  shiftQCellHtml.includes('>Q</span>') && !shiftQCellHtml.includes('>q</span>'),
  'Shift 激活时 native 预览 q 键主字母应变为大写 Q。',
);

const hiddenSwipeProject = createSampleProject();
hiddenSwipeProject.keyboardCombo.swipeBehavior.mode = 'disabled';
const hiddenSwipeHtml = render(hiddenSwipeProject);
const hiddenSwipeModel = buildSkinEffectModel(hiddenSwipeProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });

assert(!baseHtml.includes('is-swipe-up'), '基准预览默认不应显示上划标记。');
assert(enabledSwipeHtml.includes('is-swipe-up'), '显式开启划动后预览应显示上划标记。');
assert(!hiddenSwipeHtml.includes('is-swipe-up'), '关闭划动后预览不应显示上划标记。');
assert(!hiddenSwipeModel.nativePayload.qButton?.swipeUpAction, '关闭划动后效果模型不应导出上划动作。');

const expandedHtml = render(baseProject, { candidateState: 'expanded' });
assert(expandedHtml.includes('calayer-expanded-candidates'), '展开候选状态应渲染候选面板。');
assert(expandedHtml.includes('native-candidate-grid is-vertical'), '展开候选 native 预览应使用纵向候选网格。');
assert(expandedHtml.includes('calayer-expanded-candidate'), '展开候选 native 预览应使用展开候选项样式。');
assert(!expandedHtml.includes('calayer-keyboard is-native-keyboard'), '展开候选状态不应继续渲染键盘按键区。');

const candidatesHtml = render(baseProject, { candidateState: 'candidates' });
assert(candidatesHtml.includes('native-candidate-grid is-horizontal'), '横向候选 native 预览应使用横向候选网格。');
assert(candidatesHtml.includes('calayer-candidate'), '横向候选 native 预览应使用横向候选项样式。');
assert(candidatesHtml.includes('background:#FFFFFF'), '横向候选高亮应使用浅色主题候选高亮背景。');
const pinyin14CandidatesHtml = render(baseProject, { pinyinVariant: '14', candidateState: 'candidates' });
assert(!pinyin14CandidatesHtml.includes('#00c381'), '中文 14 键候选颜色应统一为中文键盘候选样式，不应保留旧绿色候选。');
assert(pinyin14CandidatesHtml.includes('calayer-candidate-bar') && pinyin14CandidatesHtml.includes('background:#FFFFFF'), '中文 14 键候选区应走统一中文候选预览。');

const darkCandidatesHtml = renderPreview(baseProject, 'dark', 'keyboard26', { candidateState: 'candidates' });
assert(darkCandidatesHtml.includes('background:#D1D1D165'), '深色候选高亮应使用深色主题候选高亮背景。');
assert(darkCandidatesHtml.includes('background:#474747'), '深色预览舞台应使用实色深色背景，不应直接显示近透明容器色。');

const changedSpaceProject = createSampleProject();
changedSpaceProject.keyboards.keyboard26.metrics.portrait.space.width.percentage = 0.32;
const changedSpaceModel = buildSkinEffectModel(changedSpaceProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });

assert(baseModel.nativePayload.spaceButton.size.width.percentage !== 0.32, '基准空格宽度应不同于测试值。');
assert(changedSpaceModel.nativePayload.spaceButton.size.width.percentage === 0.32, '效果模型应同步空格宽度。');

function cellWidth(html, className) {
  const pattern = new RegExp(`class="[^"]*\\bis-${className}\\b[^"]*" style="[^"]*width:([0-9.]+)px`);
  const match = html.match(pattern);
  return match ? Number(match[1]) : null;
}

function cellLeft(html, className) {
  const pattern = new RegExp(`class="[^"]*\\bis-${className}\\b[^"]*" style="[^"]*left:([0-9.]+)px`);
  const match = html.match(pattern);
  return match ? Number(match[1]) : null;
}

function cellHeight(html, className) {
  const pattern = new RegExp(`class="[^"]*\\bis-${className}\\b[^"]*" style="[^"]*height:([0-9.]+)px`);
  const match = html.match(pattern);
  return match ? Number(match[1]) : null;
}

function backgroundStyle(html) {
  const match = html.match(/class="calayer-background[^"]*" style="([^"]*)"/);
  return match ? match[1] : '';
}

function visibleHeights(html) {
  return [...html.matchAll(/class="calayer-visible" style="[^"]*height:([0-9.]+)px/g)]
    .map((match) => Number(match[1]))
    .filter((height) => Number.isFinite(height) && height > 20);
}

function assertUniformPreviewKeyHeights(project, variant, orientation) {
  const html = render(project, { pinyinVariant: variant, orientation });
  const heights = visibleHeights(html);
  const uniqueHeights = [...new Set(heights.map((height) => height.toFixed(3)))];
  assert(uniqueHeights.length === 1, `中文 ${variant} 键 ${orientation} 预览按键可见高度应统一，当前为 ${uniqueHeights.join(', ')}。`);
}

function keycapVerticalInsets(html, key) {
  const pattern = new RegExp(`data-preview-key="${key}"[\\s\\S]*?class="calayer-background is-layer-bg" style="([^"]+)"`);
  const style = html.match(pattern)?.[1] || '';
  const top = Number(style.match(/top:([0-9.]+)px/)?.[1]);
  const bottom = Number(style.match(/bottom:([0-9.]+)px/)?.[1]);
  return { top, bottom };
}

function assertUniformKeycapVerticalInsets(project, variant, orientation, keys) {
  const html = render(project, { pinyinVariant: variant, orientation });
  const values = keys.map((key) => keycapVerticalInsets(html, key));
  const unique = [...new Set(values.map((item) => `${item.top}/${item.bottom}`))];
  assert(unique.length === 1, `中文 ${variant} 键 ${orientation} 预览键帽上下内距应统一，当前为 ${unique.join(', ')}。`);
}

function assertEqualCellWidths(html, keys, message, tolerance = 0.01) {
  const widths = keys.map((key) => cellWidth(html, key));
  assert(widths.every((width) => Number.isFinite(width)), `${message}：未能读取全部宽度。`);
  const min = Math.min(...widths);
  const max = Math.max(...widths);
  assert(max - min < tolerance, `${message}，当前为 ${widths.map((width) => width.toFixed(3)).join(', ')}。`);
}

function nativeWidthRatio(payload, buttonName) {
  const width = payload?.[buttonName]?.size?.width;
  if (typeof width === 'number') return width;
  if (typeof width === 'string') {
    const [left, right] = width.split('/').map(Number);
    return Number.isFinite(left) && Number.isFinite(right) && right !== 0 ? left / right : null;
  }
  if (width && typeof width === 'object' && Number.isFinite(Number(width.percentage))) {
    return Number(width.percentage);
  }
  return null;
}

function assertPreviewFooterMatchesNative(project, variant, mapping) {
  const html = render(project, { pinyinVariant: variant });
  const nativePayload = buildSkinEffectModel(project, { theme: 'light', keyboardName: `pinyin_${variant}_portrait` })?.nativePayload;
  const previewTotal = mapping.reduce((sum, item) => sum + (cellWidth(html, item.previewKey) || 0), 0);
  const nativeRatios = mapping.map((item) => nativeWidthRatio(nativePayload, item.buttonName));
  const missingIndexes = nativeRatios
    .map((ratio, index) => (ratio === null ? index : -1))
    .filter((index) => index >= 0);
  if (missingIndexes.length === 1) {
    const explicitTotal = nativeRatios.reduce((sum, ratio) => sum + (ratio || 0), 0);
    nativeRatios[missingIndexes[0]] = Math.max(0, 1 - explicitTotal);
  }
  const nativeTotal = nativeRatios.reduce((sum, ratio) => sum + (ratio || 0), 0);
  assert(previewTotal > 0 && nativeTotal > 0, `中文 ${variant} 键底排预览/native 宽度应可读取。`);
  for (const [index, item] of mapping.entries()) {
    const previewRatio = (cellWidth(html, item.previewKey) || 0) / previewTotal;
    const nativeRatio = (nativeRatios[index] || 0) / nativeTotal;
    assert(Math.abs(previewRatio - nativeRatio) < 0.001, `中文 ${variant} 键 ${item.previewKey} 预览比例 ${previewRatio.toFixed(4)} 应匹配导出 native ${nativeRatio.toFixed(4)}。`);
  }
}

const pinyin9BaseProject = createSampleProject();
const pinyin9BaseHtml = render(pinyin9BaseProject, { pinyinVariant: '9' });
const pinyin9ChangedProject = createSampleProject();
pinyin9ChangedProject.keyboards.keyboard26.variants['9'].metrics.portrait.punctuationColumn.width.percentage = 0.2;
pinyin9ChangedProject.keyboards.keyboard26.variants['9'].metrics.portrait.space.width.percentage = 0.5;
const pinyin9ChangedHtml = render(pinyin9ChangedProject, { pinyinVariant: '9' });

assert(pinyin9BaseHtml.includes('is-pinyin9-keyboard'), '中文九键应使用专用预览渲染。');
assert(!pinyin9BaseHtml.includes('is-native-keyboard'), '中文九键专用预览不应被 native payload 渲染覆盖。');
assert(baseProject.keyboardCombo.swipeBehavior.ui?.pinyin9?.mode === 'disabled', '中文 9 键预设滑动功能按钮应默认关闭。');
assert(cellWidth(pinyin9BaseHtml, 'punctuation-column') !== cellWidth(pinyin9ChangedHtml, 'punctuation-column'), '中文九键左列宽度应联动 metrics。');
assert(cellWidth(pinyin9BaseHtml, 'space') !== cellWidth(pinyin9ChangedHtml, 'space'), '中文九键底排空格宽度应联动 metrics。');

for (const variant of ['14', '17', '18']) {
  assertUniformPreviewKeyHeights(baseProject, variant, 'portrait');
  assertUniformPreviewKeyHeights(baseProject, variant, 'landscape');
  assert(!render(baseProject, { pinyinVariant: variant }).includes('is-native-keyboard'), `中文 ${variant} 键竖屏预览不应被 native payload 渲染覆盖。`);
}
assertUniformKeycapVerticalInsets(baseProject, '14', 'portrait', ['shift', 'zx', 'cv', 'bn', 'm', 'backspace', '123', 'semicolon', 'space', 'cnen', 'enter']);
const pinyin14Html = render(baseProject, { pinyinVariant: '14' });
assert(pinyin14Html.includes('data-preview-key="shift"'), '中文 14 键竖屏预览应按实机使用 shiftButton 槽位。');
assert(previewKeyCellHtml(pinyin14Html, 'shift').includes(">'词</span>"), '中文 14 键竖屏 shiftButton 应显示实机分词文案。');
assert(!pinyin14Html.includes('data-preview-key="word"'), '中文 14 键竖屏预览不应显示旧 word 键。');
const pinyin14LeftFooterWidth = (cellLeft(pinyin14Html, 'space') || 0) - (cellLeft(pinyin14Html, '123') || 0);
const pinyin14RightFooterWidth = ((cellLeft(pinyin14Html, 'enter') || 0) + (cellWidth(pinyin14Html, 'enter') || 0)) - ((cellLeft(pinyin14Html, 'space') || 0) + (cellWidth(pinyin14Html, 'space') || 0));
assert(Math.abs((cellWidth(pinyin14Html, '123') || 0) - (cellWidth(pinyin14Html, 'enter') || 0)) < 0.01, '中文 14 键竖屏 123 键和发送键宽度应相等。');
assert(Math.abs((cellWidth(pinyin14Html, 'semicolon') || 0) - (cellWidth(pinyin14Html, 'cnen') || 0)) < 0.01, '中文 14 键竖屏分号键和中英键宽度应相等。');
assert(Math.abs(pinyin14LeftFooterWidth - pinyin14RightFooterWidth) < 0.01, '中文 14 键竖屏空格左右功能键总宽应均衡。');
assertPreviewFooterMatchesNative(baseProject, '14', [
  { previewKey: '123', buttonName: '123Button' },
  { previewKey: 'semicolon', buttonName: 'commaButton' },
  { previewKey: 'space', buttonName: 'spaceButton' },
  { previewKey: 'cnen', buttonName: 'cnenButton' },
  { previewKey: 'enter', buttonName: 'enterButton' },
]);
const pinyin17Html = render(baseProject, { pinyinVariant: '17' });
assertEqualCellWidths(pinyin17Html, ['h', 's', 'z', 'b', 'x', 'm'], '中文 17 键竖屏第一行字母键宽度应统一');
assertEqualCellWidths(pinyin17Html, ['l', 'd', 'y', 'w', 'j', 'n'], '中文 17 键竖屏第二行字母键宽度应统一');
assertEqualCellWidths(pinyin17Html, ['c', 'q', 'g', 'f', 't', 'backspace'], '中文 17 键竖屏第三行按键宽度应统一');
assertEqualCellWidths(pinyin17Html, ['123', 'enter'], '中文 17 键竖屏 123 键和发送键宽度应相等');
assertEqualCellWidths(pinyin17Html, ['cnen', 'semicolon'], '中文 17 键竖屏中英键和分号键宽度应相等');
const pinyin17Project = createSampleProject();
pinyin17Project.keyboardCombo.slots.pinyin.variant = '17';
assertPreviewFooterMatchesNative(pinyin17Project, '17', [
  { previewKey: '123', buttonName: '123Button' },
  { previewKey: 'cnen', buttonName: 'cnenButton' },
  { previewKey: 'space', buttonName: 'spaceButton' },
  { previewKey: 'semicolon', buttonName: 'spaceRightButton' },
  { previewKey: 'enter', buttonName: 'enterButton' },
]);
const pinyin17LandscapeHtml = render(baseProject, { pinyinVariant: '17', orientation: 'landscape' });
assertEqualCellWidths(pinyin17LandscapeHtml, ['h', 's', 'z', 'l', 'd', 'y', 'c', 'q', 'g', 'b', 'x', 'm', 'w', 'j', 'n', 'f', 't', 'backspace'], '中文 17 键横屏主按键宽度应统一');
assertEqualCellWidths(pinyin17LandscapeHtml, ['123', 'enter'], '中文 17 键横屏 123 键和发送键宽度应相等');
assertEqualCellWidths(pinyin17LandscapeHtml, ['cnen', 'semicolon'], '中文 17 键横屏中英键和分号键宽度应相等');
const pinyin18Project = createSampleProject();
pinyin18Project.keyboardCombo.slots.pinyin.variant = '18';
const pinyin18Html = render(pinyin18Project, { pinyinVariant: '18' });
assertPreviewFooterMatchesNative(pinyin18Project, '18', [
  { previewKey: '123', buttonName: 'numericButton' },
  { previewKey: 'semicolon', buttonName: 'commaButton' },
  { previewKey: 'space', buttonName: 'spaceButton' },
  { previewKey: 'cnen', buttonName: 'alphabeticButton' },
  { previewKey: 'enter', buttonName: 'enterButton' },
]);
assert(previewKeyCellHtml(pinyin18Html, 'cnen').includes('data-preview-key="cnen"'), '中文 18 键预览中英键应暴露为 cnen，点击只模拟中英切换。');
assert(!previewKeyCellHtml(pinyin18Html, 'alphabetic').includes('data-preview-key="alphabetic"'), '中文 18 键预览不应暴露 alphabetic 临时 key，避免中英模拟切换误路由。');

const numericHtml = render(baseProject, { mode: 'numeric' });
const pinyin9Html = render(baseProject, { pinyinVariant: '9' });
const pinyin14LandscapeNumericHtml = render(baseProject, { pinyinVariant: '14', orientation: 'landscape' });
const numericSeedPreset = KEYBOARD_SKIN_PRESETS.find((item) => item.value === 'ios-14');
const numericSeedProject = createSampleProject();
numericSeedProject.nativeKeyboardPayloads = structuredClone(NATIVE_KEYBOARD_PRESET_PAYLOADS[numericSeedPreset.value] || {});
numericSeedProject.keyboardCombo.slots.pinyin.variant = numericSeedPreset.layout;
numericSeedProject.keyboardCombo.slots.numeric.variant = '9';
const numericSeedHtml = render(numericSeedProject, { mode: 'numeric' });
const numericPayload = buildEffectiveNativeKeyboardPayload(numericSeedProject, 'light', 'numeric_9_portrait');
assert(baseProject.keyboardCombo.swipeBehavior.ui?.numeric?.mode === 'disabled', '数字 9 键预设滑动功能按钮应默认关闭。');
assert(numericHtml.includes('is-numeric-keyboard'), '数字 9 键应使用专用预览渲染。');
assert(!numericHtml.includes('is-native-keyboard'), '数字 9 键专用预览不应被 native payload 渲染覆盖。');
assert(numericHtml.includes('grid-template-columns:0.7fr 1fr 1fr 1fr 0.7fr;gap:0'), '数字 9 键预览左右功能列应等宽、无额外 grid gap，并保持三列主数字键等宽。');
assert(Math.abs((cellHeight(numericHtml, '1') || 0) - (cellHeight(pinyin9Html, 'number1') || 0)) < 0.01, '数字 9 键与中文 9 键切换时按键行高应一致。');
assert(backgroundStyle(previewKeyCellHtml(numericSeedHtml, '1')).includes(`background:${numericPayload.number1Bg.normalColor}`), '数字 9 键数字键背景应来自 resolved native payload。');
assert(backgroundStyle(previewClassCellHtml(numericSeedHtml, 'numeric-collection')).includes(`background:${numericPayload.symbolsCollectionBg.normalColor}`), '数字 9 键左侧符号栏背景应来自 resolved native payload。');
assert(previewKeyCellHtml(numericSeedHtml, 'space').includes(`>${numericPayload.numspaceFg.text}</span>`), '数字 9 键空格应显示 resolved native payload 的文字，不能空白。');
assert(backgroundStyle(previewKeyCellHtml(numericSeedHtml, 'space')).includes(`background:${numericPayload.clearBg.normalColor}`)
  && backgroundStyle(previewKeyCellHtml(numericSeedHtml, 'equal')).includes(`background:${numericPayload.equalBg.normalColor}`)
  && backgroundStyle(previewKeyCellHtml(numericSeedHtml, 'backspace')).includes(`background:${numericPayload.backspaceBg.normalColor}`), '数字 9 键空格、等号、退格背景应来自各自 resolved native payload。');
assert(previewKeyCellHtml(numericSeedHtml, 'enter').includes(`>${numericPayload.enterFgCol7.text}</span>`), '数字 9 键搜索/确认按钮文案应来自 resolved native 条件前景。');
assert(previewKeyCellHtml(pinyin14LandscapeNumericHtml, 'number1').includes('>1</span>'), '中文 14 键横屏九宫格 number1 应显示数字 1。');
assert(previewKeyCellHtml(pinyin14LandscapeNumericHtml, 'number9').includes('>9</span>'), '中文 14 键横屏九宫格 number9 应显示数字 9。');
assert(previewKeyCellHtml(pinyin14LandscapeNumericHtml, 'number0').includes('>0</span>'), '中文 14 键横屏九宫格 number0 应显示数字 0。');
assert(backgroundStyle(previewKeyCellHtml(pinyin14LandscapeNumericHtml, 'number1')) === backgroundStyle(previewKeyCellHtml(pinyin9Html, 'number1')), '中文 14 键横屏九宫格数字键背景和阴影应与中文 9 键主键一致。');
for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
  assert(cellWidth(numericHtml, key) === null, `数字 ${key} 不应写入单独宽度，宽度应由统一列布局决定。`);
}

const panelHtml = render(baseProject, { mode: 'panel' });
assert(panelHtml.includes('is-panel-keyboard'), '自定义面板应渲染竖屏 panel 预览。');
assert(panelHtml.includes('⌨') && panelHtml.includes('📁') && panelHtml.includes('👕'), '自定义面板系统图标缺少 SVG 时应显示 fallback 图标。');
const imageBackgroundProject = createSampleProject();
imageBackgroundProject.nativeKeyboardPayloads = {
  light: {
    pinyin_26_portrait: {},
    pinyin_9_portrait: {},
    numeric_9_portrait: {},
    symbolic_portrait: {},
  },
};
imageBackgroundProject.nativeKeyboardPayloads.light.pinyin_26_portrait.keyboardBackgroundStyle = {
  buttonStyleType: 'fileImage',
  normalImage: { file: 'hold_back', image: 'IMG1' },
};
imageBackgroundProject.nativeKeyboardPayloads.light.pinyin_9_portrait.keyboardBackgroundStyle = {
  buttonStyleType: 'fileImage',
  normalImage: { file: 'hold_back', image: 'IMG1' },
};
imageBackgroundProject.nativeKeyboardPayloads.light.numeric_9_portrait.keyboardBackgroundStyle = {
  buttonStyleType: 'fileImage',
  normalImage: { file: 'hold_back', image: 'IMG1' },
};
imageBackgroundProject.nativeKeyboardPayloads.light.symbolic_portrait.keyboardBackgroundStyle = {
  buttonStyleType: 'fileImage',
  normalImage: { file: 'hold_back', image: 'IMG1' },
};
function hasTemplateBackgroundImage(html) {
  return html.includes('background-image:url(') && html.includes('resources/hold_back.png');
}

assert(hasTemplateBackgroundImage(render(imageBackgroundProject, { pinyinVariant: '9' })), '中文九键预览应同步键盘背景图片。');
assert(hasTemplateBackgroundImage(render(imageBackgroundProject, { mode: 'numeric' })), '数字键盘预览应同步键盘背景图片。');
assert(hasTemplateBackgroundImage(render(imageBackgroundProject, { mode: 'symbolic' })), '符号键盘预览应同步键盘背景图片。');

const symbolicCollectionProject = createSampleProject();
symbolicCollectionProject.data.collections.symbolicDataSource.category = ['测试分类'];
symbolicCollectionProject.data.collections.symbolicDataSource['测试分类'] = ['甲', { label: '乙', value: 'B' }];
const symbolicCollectionHtml = render(symbolicCollectionProject, {
  mode: 'symbolic',
  symbolicCategory: '测试分类',
});
assert(symbolicCollectionHtml.includes('测试分类'), '符号键盘预览应同步左侧 collection 分类。');
assert(symbolicCollectionHtml.includes('甲') && symbolicCollectionHtml.includes('乙'), '符号键盘预览应同步左侧 collection 条目。');

const hintHtml = render(baseProject, { activeHintKey: 'q' });
assert(hintHtml.includes('resources/hold_back.png'), '长按候选气泡预览应同步 hold_back 背景图片。');
assert(hintHtml.includes('resources/hint.png'), '长按候选选中项预览应同步 hint 背景图片。');

const expandedImageProject = createSampleProject();
expandedImageProject.nativeKeyboardPayloads = {
  light: {
    pinyin_26_portrait: {
      verticalCandidateBackgroundStyle: {
        buttonStyleType: 'fileImage',
        normalImage: { file: 'hold_back', image: 'IMG1' },
      },
    },
  },
};
assert(hasTemplateBackgroundImage(render(expandedImageProject, { candidateState: 'expanded' })), '展开候选面板预览应同步纵向候选背景图片。');

const fallbackOnlyProject = createSampleProject();
fallbackOnlyProject.nativeKeyboardPayloads = { light: {} };
assert(render(fallbackOnlyProject, { mode: 'numeric', previewSourceName: 'numeric_missing_portrait' }).includes('is-numeric-keyboard'), '缺少原生 payload 时数字键盘 fallback 预览应可渲染。');
assert(render(fallbackOnlyProject, { mode: 'panel', previewSourceName: 'panel_missing_portrait' }).includes('is-panel-keyboard'), '缺少原生 payload 时面板 fallback 预览应可渲染。');
assert(render(fallbackOnlyProject, { candidateState: 'expanded', previewSourceName: 'pinyin_missing_portrait' }).includes('calayer-expanded-candidates'), '缺少原生 payload 时展开候选 fallback 预览应可渲染。');

console.log('preview-linkage ok');
