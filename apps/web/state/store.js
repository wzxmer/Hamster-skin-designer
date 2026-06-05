// apps/web/state/store.js
import { PREVIEW_DEVICE_MODELS } from './constants.js';

function createPreviewInteractionState() {
  return {
    pressedDomain: null,
    pressedKey: null,
    mode: 'idle',
    longPressTimer: null,
    releaseTimer: null,
    suppressClick: false,
  };
}

export const state = {
  project: null,
  originalProject: null,
  activeSection: 'mapping',
  previewType: 'pinyin',
  theme: 'light',
  orientation: 'portrait',
  previewDevice: PREVIEW_DEVICE_MODELS[1].id,
  editorMode: 'visual',
  previewState: {
    shift: 'normal',
    enterType: 'default',
  },
  selectedKeys: {
    keyboard26: null,
    numeric: null,
    symbolic: null,
    panel: null,
    toolbar: null,
  },
  selectedData: {
    hintGroup: null,
    hintKey: null,
    swipeLib: 'swipeData',
    swipeGroup: null,
    swipeKey: null,
    collectionSource: null,
    collectionKey: null,
  },
  history: {
    undo: [],
    redo: [],
  },
  colorEditorMode: 'global',
  colorEditorDomain: 'keyboard26',
  colorFieldGroup: 'keyboard26',
  draftSavedAt: null,
  layoutDrag: null,
  templates: [],
  activeTemplateId: null,
  currentTemplateMeta: null,
  projectValidation: null,
  previewInteraction: createPreviewInteractionState(),
};
