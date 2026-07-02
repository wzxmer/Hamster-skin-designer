import { createSampleProject } from '../project-schema/index.js';
import { buildSkinEffectModel } from '../skin-effect/index.js';
import { renderPreview } from '../../apps/workbench/src/ui/preview.js';

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
assert(!baseHtml.includes('left:12%;top:34%'), '基准预览不应包含测试 toolbar 偏移。');
assert(linkedHtml.includes('left:12%;top:34%'), '预览 HTML 应同步 toolbar 自定义偏移。');
assert(linkedHtml.includes('data-preview-key="menu"'), '预览 HTML 应渲染 toolbar 菜单按钮。');
assert(linkedHtml.includes('data-preview-key="close"'), '预览 HTML 应渲染 toolbar 收起按钮。');
assert(!linkedHtml.includes('data-preview-key="translate"'), '预览 HTML 应同步 toolbar 布局删减。');

const hiddenSwipeProject = createSampleProject();
hiddenSwipeProject.keyboardCombo.swipeBehavior.mode = 'disabled';
const hiddenSwipeHtml = render(hiddenSwipeProject);
const hiddenSwipeModel = buildSkinEffectModel(hiddenSwipeProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });

assert(baseHtml.includes('is-swipe-up'), '基准预览应显示上划标记。');
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

const darkCandidatesHtml = renderPreview(baseProject, 'dark', 'keyboard26', { candidateState: 'candidates' });
assert(darkCandidatesHtml.includes('background:#D1D1D165'), '深色候选高亮应使用深色主题候选高亮背景。');
assert(darkCandidatesHtml.includes('background:#474747'), '深色预览舞台应使用实色深色背景，不应直接显示近透明容器色。');

const changedSpaceProject = createSampleProject();
changedSpaceProject.keyboards.keyboard26.metrics.portrait.space.width.percentage = 0.32;
const changedSpaceModel = buildSkinEffectModel(changedSpaceProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });

assert(baseModel.nativePayload.spaceButton.size.width.percentage !== 0.32, '基准空格宽度应不同于测试值。');
assert(changedSpaceModel.nativePayload.spaceButton.size.width.percentage === 0.32, '效果模型应同步空格宽度。');

function cellWidth(html, className) {
  const pattern = new RegExp(`is-${className}[^"]*" style="[^"]*width:([0-9.]+)px`);
  const match = html.match(pattern);
  return match ? Number(match[1]) : null;
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
}
assertUniformKeycapVerticalInsets(baseProject, '14', 'portrait', ['word', 'zx', 'cv', 'bn', 'm', 'backspace', '123', 'semicolon', 'space', 'cnen', 'enter']);

const numericHtml = render(baseProject, { mode: 'numeric' });
assert(baseProject.keyboardCombo.swipeBehavior.ui?.numeric?.mode === 'disabled', '数字 9 键预设滑动功能按钮应默认关闭。');
assert(numericHtml.includes('is-numeric-keyboard'), '数字 9 键应使用专用预览渲染。');
assert(!numericHtml.includes('is-native-keyboard'), '数字 9 键专用预览不应被 native payload 渲染覆盖。');
assert(numericHtml.includes('grid-template-columns:0.68fr 1fr 1fr 1fr 0.72fr'), '数字 9 键预览应压窄左右列并保持三列主键等宽。');

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
  normalImage: { file: 'bg', image: 'IMG1' },
};
imageBackgroundProject.nativeKeyboardPayloads.light.pinyin_9_portrait.keyboardBackgroundStyle = {
  buttonStyleType: 'fileImage',
  normalImage: { file: 'bg', image: 'IMG1' },
};
imageBackgroundProject.nativeKeyboardPayloads.light.numeric_9_portrait.keyboardBackgroundStyle = {
  buttonStyleType: 'fileImage',
  normalImage: { file: 'bg', image: 'IMG1' },
};
imageBackgroundProject.nativeKeyboardPayloads.light.symbolic_portrait.keyboardBackgroundStyle = {
  buttonStyleType: 'fileImage',
  normalImage: { file: 'bg', image: 'IMG1' },
};
function hasTemplateBackgroundImage(html) {
  return html.includes('background-image:url(') && html.includes('resources/bg.png');
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
        normalImage: { file: 'bg', image: 'IMG1' },
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
