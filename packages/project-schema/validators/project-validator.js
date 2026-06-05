const SCHEMA_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const TOP_LEVEL_OBJECT_KEYS = [
  'meta',
  'assets',
  'theme',
  'keyboardFrame',
  'keyStyles',
  'keyboards',
  'toolbar',
  'config',
  'data',
  'export',
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function addIssue(target, path, message) {
  target.push({ path, message });
}

function validateRequiredObject(project, errors, path) {
  const value = project[path];
  if (!isPlainObject(value)) {
    addIssue(errors, path, '必须是对象。');
    return false;
  }
  return true;
}

function validateString(project, errors, path, required = true) {
  const value = path.split('.').reduce((current, key) => current?.[key], project);
  if (value === undefined || value === null) {
    if (required) addIssue(errors, path, '不能为空。');
    return;
  }
  if (typeof value !== 'string') {
    addIssue(errors, path, '必须是字符串。');
  }
}

function validateInset(errors, path, value) {
  if (!isPlainObject(value)) {
    addIssue(errors, path, 'insets 必须是对象。');
    return;
  }

  for (const edge of ['top', 'left', 'bottom', 'right']) {
    if (value[edge] !== undefined && !isFiniteNumber(value[edge])) {
      addIssue(errors, `${path}.${edge}`, 'inset 边距必须是数字。');
    }
  }
}

function isInsetMetadataKey(key) {
  return ['mode', 'keys'].includes(key);
}

function walkInsets(errors, value, path) {
  if (!isPlainObject(value)) {
    addIssue(errors, path, 'buttonInsets 节点必须是对象。');
    return;
  }

  const edgeKeys = ['top', 'left', 'bottom', 'right'];
  const looksLikeInset = edgeKeys.some((edge) => value[edge] !== undefined);
  if (looksLikeInset) {
    validateInset(errors, path, value);
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (isInsetMetadataKey(key)) continue;
    if (Array.isArray(child)) {
      child.forEach((item, index) => {
        if (!isPlainObject(item)) {
          addIssue(errors, `${path}.${key}.${index}`, '自定义边距必须是对象。');
          return;
        }
        if (item.keys !== undefined && (!Array.isArray(item.keys) || item.keys.some((itemKey) => typeof itemKey !== 'string'))) {
          addIssue(errors, `${path}.${key}.${index}.keys`, '按键选择必须是字符串数组。');
        }
        validateInset(errors, `${path}.${key}.${index}.insets`, item.insets);
      });
      continue;
    }
    walkInsets(errors, child, `${path}.${key}`);
  }
}

function validateColorMap(errors, colors, path) {
  if (!isPlainObject(colors)) {
    addIssue(errors, path, '颜色表必须是对象。');
    return;
  }

  for (const [key, value] of Object.entries(colors)) {
    if (typeof value !== 'string' || !HEX_COLOR_PATTERN.test(value)) {
      addIssue(errors, `${path}.${key}`, '颜色必须是 #RGB、#RGBA、#RRGGBB 或 #RRGGBBAA 格式。');
    }
  }
}

function validateKeyboardFrame(errors, frame) {
  for (const orientation of ['portrait', 'landscape']) {
    const value = frame?.[orientation];
    if (!isPlainObject(value)) {
      addIssue(errors, `keyboardFrame.${orientation}`, '必须是对象。');
      continue;
    }
    for (const key of ['preeditHeight', 'toolbarHeight', 'keyboardHeight']) {
      if (!isFiniteNumber(value[key])) {
        addIssue(errors, `keyboardFrame.${orientation}.${key}`, '高度必须是数字。');
      }
    }
  }

  const panel = frame?.panel;
  if (!isPlainObject(panel)) {
    addIssue(errors, 'keyboardFrame.panel', '必须是对象。');
  } else if (panel.cornerRadius !== undefined && !isFiniteNumber(panel.cornerRadius)) {
    addIssue(errors, 'keyboardFrame.panel.cornerRadius', '圆角必须是数字。');
  }
}

function validateKeyboard26Layout(errors, layout) {
  if (!isPlainObject(layout)) {
    addIssue(errors, 'keyboards.keyboard26.layout', '必须是对象。');
    return;
  }

  const portrait = layout.portrait;
  if (!isPlainObject(portrait)) {
    addIssue(errors, 'keyboards.keyboard26.layout.portrait', '必须是对象。');
  } else {
    if (portrait.rows !== undefined) {
      if (!Array.isArray(portrait.rows)) {
        addIssue(errors, 'keyboards.keyboard26.layout.portrait.rows', '必须是行数组。');
      } else {
        portrait.rows.forEach((row, index) => {
          if (!isPlainObject(row) || !Array.isArray(row.keys) || row.keys.some((key) => typeof key !== 'string')) {
            addIssue(errors, `keyboards.keyboard26.layout.portrait.rows.${index}`, '必须包含字符串数组 keys。');
          }
        });
      }
    }
    for (const rowName of ['top', 'middle', 'bottom', 'footer']) {
      if (!Array.isArray(portrait[rowName]) || portrait[rowName].some((key) => typeof key !== 'string')) {
        addIssue(errors, `keyboards.keyboard26.layout.portrait.${rowName}`, '必须是字符串数组。');
      }
    }
  }
}

function validateExport(errors, exportConfig) {
  const targets = exportConfig?.targets;
  if (!isPlainObject(targets)) {
    addIssue(errors, 'export.targets', '必须是对象。');
    return;
  }

  if (targets.yaml !== true && targets.jsonnet !== true) {
    addIssue(errors, 'export.targets', '至少需要启用 yaml 或 jsonnet 导出。');
  }
}

export function validateProject(project) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(project)) {
    return {
      ok: false,
      errors: [{ path: '$', message: 'project 必须是对象。' }],
      warnings,
    };
  }

  validateString(project, errors, 'schemaVersion');
  if (typeof project.schemaVersion === 'string' && !SCHEMA_VERSION_PATTERN.test(project.schemaVersion)) {
    addIssue(errors, 'schemaVersion', '必须使用 x.y.z 版本格式。');
  }

  validateString(project, errors, 'templateId');
  for (const key of TOP_LEVEL_OBJECT_KEYS) {
    validateRequiredObject(project, errors, key);
  }

  validateString(project, errors, 'meta.name');
  validateString(project, errors, 'meta.author', false);
  validateString(project, errors, 'meta.version', false);

  if (isPlainObject(project.theme)) {
    for (const mode of ['light', 'dark']) {
      const themeMode = project.theme[mode];
      if (!isPlainObject(themeMode)) {
        addIssue(errors, `theme.${mode}`, '必须是对象。');
      } else {
        validateColorMap(errors, themeMode.colors, `theme.${mode}.colors`);
      }
    }
  }

  if (isPlainObject(project.keyboardFrame)) {
    validateKeyboardFrame(errors, project.keyboardFrame);
  }

  const buttonInsets = project.keyStyles?.buttonInsets;
  if (buttonInsets !== undefined) {
    walkInsets(errors, buttonInsets, 'keyStyles.buttonInsets');
  } else {
    addIssue(errors, 'keyStyles.buttonInsets', '不能为空。');
  }

  validateKeyboard26Layout(errors, project.keyboards?.keyboard26?.layout);

  if (!isPlainObject(project.assets?.images)) {
    addIssue(errors, 'assets.images', '必须是图片素材引用对象。');
  }

  if (isPlainObject(project.export)) {
    validateExport(errors, project.export);
  }

  if (project.schemaVersion && project.schemaVersion !== '0.1.0') {
    addIssue(warnings, 'schemaVersion', '当前 validator 只按 0.1.0 规则校验。');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function assertValidProject(project) {
  const result = validateProject(project);
  if (!result.ok) {
    const detail = result.errors.map((error) => `${error.path}: ${error.message}`).join('\n');
    throw new Error(`project.json 校验失败：\n${detail}`);
  }
  return project;
}
