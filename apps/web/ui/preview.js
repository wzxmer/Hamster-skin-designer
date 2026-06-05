// apps/web/ui/preview.js
import { escapeHtml } from '../utils/index.js';
import { el, state } from '../state/index.js';
import {
  getThemeSpec,
  resolveThemeColorValue,
  getKeyStyle
} from '../utils/theme.js';
import { renderSystemImagePreview, renderLabelGroup } from './renderers.js';
// We will export functions for building previews here, such as buildKeyboard26Preview
