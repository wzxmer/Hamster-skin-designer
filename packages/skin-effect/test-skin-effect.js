import { createSampleProject } from '../project-schema/index.js';
import { buildEffectiveProject, buildSkinEffectFileEntries, buildSkinEffectModel, normalizeActionObject } from './index.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const project = createSampleProject();
const model = buildSkinEffectModel(project, { theme: 'light', keyboardName: 'pinyin_26_portrait' });
const alphabeticModel = buildSkinEffectModel(project, { theme: 'light', keyboardName: 'alphabetic_26_portrait' });
const effectProject = buildEffectiveProject(project);
const effectFiles = buildSkinEffectFileEntries(effectProject);
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

assert(model.version === 1, '效果模型应声明版本。');
assert(model.nativePayload, '效果模型应包含 nativePayload。');
assert(Array.isArray(model.nativePayload.keyboardLayout), '效果模型应包含原生键盘布局。');
assert(model.nativePayload.toolbarLayout, '效果模型应包含 toolbar 布局。');
assert(model.nativePayload.spaceButton, '效果模型应包含空格键。');
assert(model.nativePayload.HStackStyle?.size?.height === '1/5', '26 键导出应保留原始实机行高，不应用预览行高覆盖。');
assert(alphabeticModel.nativePayload.qButton?.action?.symbol === 'q' && !alphabeticModel.nativePayload.qButton?.action?.character, '英文 26 键字母主按键应使用 symbol action。');
assert(model.nativePayload.cnenButton?.action?.shortcut === '#中英切换', '效果模型应同步中英切换真实动作。');
assert(model.nativePayload.cnenButtonForegroundStyle?.text === '中', '效果模型应同步中英切换显示文字。');
assert(model.nativePayload.toolbarSymbolButton, '效果模型应包含工具栏符号按钮。');
assert(model.nativePayload.toolbarSymbolButtonForegroundStyle?.buttonStyleType === 'systemImage', '效果模型应使用工具栏图标样式。');
assert(model.nativePayload.toolbarMenuButton?.action?.keyboardType === 'panel', '工具栏菜单应使用 keyboardType: panel 调用 App 内面板。');
assert(!model.nativePayload.toolbarMenuButton?.action?.floatKeyboardType, '工具栏菜单不应继续导出 floatKeyboardType: panel。');
assert(model.nativePayload.toolbarPhraseButton?.action?.shortcut === '#showPhraseView', '工具栏常用语应导出 showPhraseView 快捷指令。');
assert(model.nativePayload.toolbarPasteboardButton?.action?.shortcut === '#showPasteboardView', '工具栏剪贴板应导出 showPasteboardView 快捷指令。');
assert(model.nativePayload.toolbarCloseButton?.action === 'dismissKeyboard', '工具栏收起键应导出 App 可直接执行的标准 action 字符串。');
assert(normalizeActionObject({ action: 'dismissKeyboard' })?.action === 'dismissKeyboard', '标准 action 包装对象不应被规范化为 shortcut。');
assert(normalizeActionObject('backspace')?.action === 'backspace', '标准 action 字符串不应被规范化为 shortcut。');
assert(normalizeActionObject({ shortcutCommand: '#Phrase' })?.shortcut === '#showPhraseView', '旧 shortcutCommand 常用语应兼容归一为官方 shortcut。');
assert(normalizeActionObject({ shortcut: '#Pasteboard' })?.shortcut === '#showPasteboardView', '旧剪贴板快捷指令应兼容归一为官方 shortcut。');
assert(normalizeActionObject({ floatKeyboardType: 'panel' })?.keyboardType === 'panel', '旧项目 floatKeyboardType: panel 应兼容归一为 keyboardType: panel。');
assert(!model.nativePayload.qButton?.swipeUpAction, '默认关闭划动时，效果模型不应包含上划动作。');
assert(!model.nativePayload.qButton?.foregroundStyle?.includes('qButtonUpForegroundStyle'), '默认关闭划动时，26 键导出不应引用原始 Up 前景。');
assert(!model.nativePayload.qButton?.foregroundStyle?.includes('qButtonDownForegroundStyle'), '默认关闭划动时，26 键导出不应引用原始 Down 前景。');
assert(enabledSwipeModel.nativePayload.qButton?.swipeUpAction, '显式开启划动时，效果模型应包含上划动作。');
assert(enabledSwipeModel.nativePayload.qButton?.foregroundStyle?.includes('qButtonUpForegroundStyle'), '显式开启划动时，26 键导出应保留原始 Up 前景引用。');
assert(enabledSwipeModel.nativePayload.qButton?.foregroundStyle?.includes('qButtonDownForegroundStyle'), '显式开启划动时，26 键导出应保留原始 Down 前景引用。');
assert(!model.nativePayload.qButton?.foregroundStyle?.includes('qButtonSwipeUpForegroundStyle'), '26 键导出不应把预览 SwipeUp 别名写入按钮引用。');
assert(!model.nativePayload.qButton?.foregroundStyle?.includes('qButtonSwipeDownForegroundStyle'), '26 键导出不应把预览 SwipeDown 别名写入按钮引用。');
assert(!model.nativePayload.qButtonSwipeUpForegroundStyle, '26 键导出不应生成预览 SwipeUp 别名样式。');
assert(!model.nativePayload.qButtonSwipeDownForegroundStyle, '26 键导出不应生成预览 SwipeDown 别名样式。');
assert(model.nativePayload.qButtonUpForegroundStyle?.fontSize === 7, '上划提示应使用校准后的默认字号。');
assert(model.nativePayload.qButtonUpForegroundStyle?.center?.x === 0.5 && model.nativePayload.qButtonUpForegroundStyle?.center?.y === 0.18, '上划提示应使用更靠上的默认偏移。');
assert(model.nativePayload.qButtonDownForegroundStyle?.fontSize === 7, '下划提示应使用校准后的默认字号。');
assert(model.nativePayload.qButtonDownForegroundStyle?.center?.x === 0.5 && model.nativePayload.qButtonDownForegroundStyle?.center?.y === 0.84, '下划提示应使用更靠下的默认偏移。');
assert(model.nativePayload.candidateStyle?.preferredBackgroundColor, '效果模型应包含候选高亮背景。');
assert(model.nativePayload.keyboardBackgroundStyle?.normalColor === '#E1E2E7', '默认几何容器背景应使用实机校准后的键盘灰。');
assert(model.nativePayload.enterButtonBlueBackgroundStyle?.borderSize === 0, '蓝色发送键默认不应保留普通键边框。');
assert(model.nativePayload.enterButtonBlueBackgroundStyle?.shadowRadius <= 0.6, '蓝色发送键默认阴影应比普通键更轻。');
assert(model.nativePayload.enterButtonBlueBackgroundStyle?.shadowOffset?.y <= 0.45, '蓝色发送键默认底部阴影不应过厚。');
assert(!model.nativePayload.enterButtonBlueBackgroundStyle?.normalLowerEdgeColor, '蓝色发送键默认不应叠加普通键底边缘。');
assert(effectFiles.find((file) => file.path === 'config.yaml')?.value?.pinyin?.iPhone?.portrait === 'pinyin_26_portrait', '效果文件应包含 config.yaml 键盘映射。');
assert(effectFiles.find((file) => file.path === 'light/pinyin_26_portrait.yaml')?.value?.keyboardLayout, '效果文件应包含浅色 26 键原生 payload。');
assert(effectFiles.find((file) => file.path === 'dark/pinyin_26_portrait.yaml')?.value?.keyboardLayout, '效果文件应包含深色 26 键原生 payload。');
assert(effectFiles.find((file) => file.path === 'resources/asset-manifest.yaml'), '效果文件应保留资源清单 entry 供打包层过滤。');

const hiddenSwipeProject = createSampleProject();
hiddenSwipeProject.keyboardCombo.swipeBehavior.mode = 'disabled';
const hiddenSwipeModel = buildSkinEffectModel(hiddenSwipeProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });
assert(!hiddenSwipeModel.nativePayload.qButton?.swipeUpAction, '关闭划动后效果模型不应保留上划动作。');
assert(!hiddenSwipeModel.nativePayload.qButton?.foregroundStyle?.includes('qButtonSwipeUpForegroundStyle'), '关闭划动后效果模型不应引用上划前景样式。');

const numericSwipeProject = createSampleProject();
const defaultNumericModel = buildSkinEffectModel(numericSwipeProject, { theme: 'light', keyboardName: 'numeric_9_portrait' });
assert(!defaultNumericModel.nativePayload.number1Button?.swipeUpAction && !defaultNumericModel.nativePayload.number1Button?.swipeDownAction, '数字 9 键默认不应导出上下划动动作。');
assert(!defaultNumericModel.nativePayload.number1Button?.foregroundStyle?.includes('number1ButtonSwipeUpForegroundStyle'), '数字 9 键默认不应显示上划前景。');
const defaultPinyin9Model = buildSkinEffectModel(createSampleProject(), { theme: 'light', keyboardName: 'pinyin_9_portrait' });
for (let index = 1; index <= 9; index += 1) {
  assert(defaultPinyin9Model.nativePayload[`number${index}Button`]?.action?.character === String(index), `中文 9 键 number${index} 主按键触发应参考 9 键样本输出 character ${index}。`);
}
const pinyin9TriggerProject = createSampleProject();
pinyin9TriggerProject.keyboards.keyboard26.keyTriggers = {
  ...(pinyin9TriggerProject.keyboards.keyboard26.keyTriggers || {}),
  number1: '1',
};
pinyin9TriggerProject.keyboards.keyboard26.keyTypes = {
  ...(pinyin9TriggerProject.keyboards.keyboard26.keyTypes || {}),
  number2: 'symbol',
};
pinyin9TriggerProject.keyboards.keyboard26.keyActions = {
  ...(pinyin9TriggerProject.keyboards.keyboard26.keyActions || {}),
  number3: { actionType: 'character', actionValue: 'number3', character: 'number3' },
};
pinyin9TriggerProject.keyboards.keyboard26.keyEditorModes = {
  ...(pinyin9TriggerProject.keyboards.keyboard26.keyEditorModes || {}),
  number3: 'function',
};
const customPinyin9TriggerModel = buildSkinEffectModel(pinyin9TriggerProject, { theme: 'light', keyboardName: 'pinyin_9_portrait' });
assert(customPinyin9TriggerModel.nativePayload.number1Button?.action?.character === '1', '中文 9 键自定义触发不应导出 number1。');
assert(customPinyin9TriggerModel.nativePayload.number2Button?.action?.symbol === '2', '中文 9 键 number2 改为 symbol 时触发值也应为 2。');
assert(customPinyin9TriggerModel.nativePayload.number3Button?.action?.character === '3', '中文 9 键旧 action 写入 number3 时应归一为 3。');
numericSwipeProject.data.swipes.numeric = {
  swipe_up: {
    '1': {
      label: { text: '一' },
      action: { character: '一' },
    },
  },
  swipe_down: {
    '1': {
      label: { text: '下' },
      action: { character: '下' },
    },
  },
};
numericSwipeProject.keyboardCombo.swipeBehavior.layouts = {
  ...(numericSwipeProject.keyboardCombo.swipeBehavior.layouts || {}),
  numeric: {
  mode: 'visible',
  showSwipeUp: true,
  showSwipeDown: true,
  },
};
numericSwipeProject.keyboardCombo.swipeBehavior.mode = 'visible';
numericSwipeProject.keyboardCombo.swipeBehavior.showSwipeUp = true;
numericSwipeProject.keyboardCombo.swipeBehavior.showSwipeDown = true;
numericSwipeProject.keyboardCombo.swipeBehavior.ui = {
  ...(numericSwipeProject.keyboardCombo.swipeBehavior.ui || {}),
  numeric: { mode: 'visible' },
};
const numericSwipeModel = buildSkinEffectModel(numericSwipeProject, { theme: 'light', keyboardName: 'numeric_9_portrait' });
assert(numericSwipeModel.nativePayload.number1ButtonSwipeUpForegroundStyle?.center?.x === 0.5
  && numericSwipeModel.nativePayload.number1ButtonSwipeUpForegroundStyle?.center?.y === 0.24, '数字键盘上划提示应使用上方居中的默认偏移。');
assert(numericSwipeModel.nativePayload.number1ButtonSwipeDownForegroundStyle?.center?.x === 0.5
  && numericSwipeModel.nativePayload.number1ButtonSwipeDownForegroundStyle?.center?.y === 0.76, '数字键盘下划提示应使用下方居中的默认偏移。');

const validBackgroundProject = createSampleProject();
validBackgroundProject.nativeKeyboardPayloads = { light: { pinyin_26_portrait: {} } };
validBackgroundProject.nativeKeyboardPayloads.light.pinyin_26_portrait.keyboardBackgroundStyle = {
  buttonStyleType: 'fileImage',
  normalImage: { file: 'hold_back', image: 'IMG1' },
};
const validBackgroundModel = buildSkinEffectModel(validBackgroundProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });
assert(validBackgroundModel.nativePayload.keyboardBackgroundStyle?.buttonStyleType === 'fileImage', '有效资源的键盘背景图片不应被几何样式覆盖。');
assert(validBackgroundModel.nativePayload.keyboardBackgroundStyle?.normalImage?.file === 'hold_back', '有效资源的键盘背景图片应保留资源名。');

const invalidBackgroundProject = createSampleProject();
invalidBackgroundProject.nativeKeyboardPayloads = { light: { pinyin_26_portrait: {} } };
invalidBackgroundProject.nativeKeyboardPayloads.light.pinyin_26_portrait.keyboardBackgroundStyle = {
  buttonStyleType: 'fileImage',
  normalImage: { file: 'missing_bg', image: 'IMG1' },
};
const invalidBackgroundModel = buildSkinEffectModel(invalidBackgroundProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });
assert(invalidBackgroundModel.nativePayload.keyboardBackgroundStyle?.buttonStyleType === 'geometry', '未打包资源的键盘背景图片应回退几何样式。');
assert(invalidBackgroundModel.nativePayload.keyboardBackgroundStyle?.normalColor === '#E1E2E7', '回退后的键盘背景应使用当前主题键盘灰。');

const stalePayloadProject = createSampleProject();
stalePayloadProject.theme.shared.fontSize['按键前景文字大小'] = 31;
stalePayloadProject.keyStyles.surfaceStyles.keyboard26.enterAccent = {
  cornerRadius: 7,
  borderSize: 0,
  shadowRadius: 0.2,
  shadowOpacity: 0.2,
  shadowOffset: { x: 0, y: 0.2 },
};
stalePayloadProject.nativeKeyboardPayloads = {
  light: {
    pinyin_26_portrait: {
      qButtonForegroundStyle: { buttonStyleType: 'text', text: 'q', fontSize: 11 },
      enterButtonBlueBackgroundStyle: {
        buttonStyleType: 'geometry',
        borderSize: 2,
        shadowRadius: 8,
        shadowOpacity: 1,
        shadowOffset: { x: 0, y: 3 },
        normalLowerEdgeColor: '#000000',
      },
    },
  },
};
const stalePayloadModel = buildSkinEffectModel(stalePayloadProject, { theme: 'light', keyboardName: 'pinyin_26_portrait' });
assert(stalePayloadModel.nativePayload.qButtonForegroundStyle?.fontSize === 31, '旧 native payload 不应覆盖左侧按键字号。');
assert(stalePayloadModel.nativePayload.enterButtonBlueBackgroundStyle?.borderSize === 0, '旧 native payload 不应覆盖左侧发送键边框。');
assert(stalePayloadModel.nativePayload.enterButtonBlueBackgroundStyle?.shadowRadius === 0.2, '旧 native payload 不应覆盖左侧发送键阴影。');
assert(!stalePayloadModel.nativePayload.enterButtonBlueBackgroundStyle?.normalLowerEdgeColor, '旧 native payload 不应让发送键恢复普通底边缘。');

console.log('skin-effect ok');
