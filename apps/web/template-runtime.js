import { EDITABLE_LIB_FILES } from '../../packages/shared-schema/index.js';
import { toYaml } from './yaml.js';

const EDITABLE_LIB_FILE_NAME_OVERRIDES = {
  swipeDataEn: 'swipeData-en',
};

const GO_WASM_EXEC_URLS = [
  'https://jsonnet.org/js/wasm_exec.js',
  'https://go.dev/lib/wasm/wasm_exec.js',
];

const JSONNET_WASM_URLS = [
  'https://jsonnet.org/js/libjsonnet.wasm',
];

const TEMPLATE_REGISTRY = [
  {
    id: 'hamster-ios',
    name: 'hamster-ios',
    displayName: '基础模板01',
    version: '0.1.0',
    projectVersion: '0.1.0',
    description: '当前默认的 iOS 风格 Hamster 皮肤模板。',
    projectDataUrl: new URL('./data/templates/hamster-ios/project-data.json', import.meta.url),
    presetCatalogUrl: new URL('./data/templates/hamster-ios/presets.json', import.meta.url),
    packageAssetsUrl: new URL('./data/templates/hamster-ios/package-assets.json', import.meta.url),
  },
];

const DEFAULT_TEMPLATE_ID = TEMPLATE_REGISTRY[0].id;
let zipModulePromise = null;
const packageAssetPromiseCache = new Map();
const scriptLoadPromiseCache = new Map();
let jsonnetRuntimePromise = null;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(target, patch) {
  if (Array.isArray(patch)) {
    return patch.map((item) => deepMerge(undefined, item));
  }
  if (!patch || typeof patch !== 'object') {
    return patch;
  }
  const base = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value)) {
      base[key] = value.map((item) => deepMerge(undefined, item));
      continue;
    }
    if (value && typeof value === 'object') {
      base[key] = deepMerge(base[key], value);
      continue;
    }
    base[key] = value;
  }
  return base;
}

function normalizeFileName(input) {
  return String(input || '新的键盘').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
}

function getProjectMetaValue(project, key, fallback) {
  const rawValue = project?.meta?.[key];
  if (typeof rawValue !== 'string') return fallback;
  const normalized = rawValue.trim();
  return normalized || fallback;
}

function sanitizeFontFaceList(fontFace) {
  if (!Array.isArray(fontFace)) return [];
  return fontFace
    .map((entry) => {
      const url = typeof entry?.url === 'string' ? entry.url.trim() : '';
      const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
      const ranges = Array.isArray(entry?.ranges)
        ? entry.ranges
          .map((range) => {
            if (range?.location === '' || range?.length === '') return null;
            return {
              location: Number(range?.location),
              length: Number(range?.length),
            };
          })
          .filter(Boolean)
          .filter((range) => Number.isFinite(range.location) && Number.isFinite(range.length))
        : [];
      if (!url && !name) return null;
      return {
        ...(url ? { url } : {}),
        ...(name ? { name } : {}),
        ...(ranges.length ? { ranges } : {}),
      };
    })
    .filter(Boolean);
}

function resolveEditableLibFileName(fileName) {
  return EDITABLE_LIB_FILE_NAME_OVERRIDES[fileName] || fileName;
}

function assertProject(project) {
  if (!project || typeof project !== 'object') {
    throw new Error('缺少 project 数据。');
  }
  if (!project.mapping || typeof project.mapping !== 'object') {
    throw new Error('project.mapping 不是有效对象。');
  }
  if (!project.lib || typeof project.lib !== 'object') {
    throw new Error('project.lib 不是有效对象。');
  }
  for (const fileName of EDITABLE_LIB_FILES) {
    if (!(fileName in project.lib)) {
      throw new Error(`project.lib.${fileName} 缺失。`);
    }
  }
}

function parseVersion(version) {
  return String(version || '0.0.0')
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((value) => (Number.isFinite(value) ? value : 0));
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const a = leftParts[index] || 0;
    const b = rightParts[index] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function listTemplates() {
  return TEMPLATE_REGISTRY.map((template) => ({
    id: template.id,
    name: template.name,
    displayName: template.displayName,
    version: template.version,
    projectVersion: template.projectVersion,
    description: template.description,
  }));
}

function getTemplateDefinition(templateId = DEFAULT_TEMPLATE_ID) {
  return TEMPLATE_REGISTRY.find((template) => template.id === templateId) || TEMPLATE_REGISTRY[0];
}

function normalizeProjectTemplateId(project, fallbackTemplateId = DEFAULT_TEMPLATE_ID) {
  if (!project || typeof project !== 'object') return fallbackTemplateId;
  return typeof project.templateId === 'string' && project.templateId
    ? project.templateId
    : fallbackTemplateId;
}

function attachTemplateMeta(project, templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplateDefinition(templateId);
  return {
    ...project,
    version: project?.version || template.projectVersion || template.version,
    templateId: template.id,
    template: {
      id: template.id,
      name: template.name,
      displayName: template.displayName,
      version: template.version,
      projectVersion: template.projectVersion || template.version,
      description: template.description,
    },
  };
}

function normalizeValidation(validation) {
  return {
    ok: validation.ok,
    template: validation.template,
    warnings: validation.warnings,
    errors: validation.errors,
    projectVersion: validation.normalizedProject?.version || null,
    templateVersion: validation.template?.version || null,
  };
}

function validateProjectCompatibility(project, templateId = DEFAULT_TEMPLATE_ID) {
  const resolvedTemplateId = normalizeProjectTemplateId(project, templateId);
  const template = getTemplateDefinition(resolvedTemplateId);
  const incomingTemplateId = project?.templateId || project?.template?.id || project?.template?.name || null;
  const incomingTemplateVersion = project?.template?.version || null;
  const incomingProjectVersion = project?.version || null;
  const warnings = [];
  const errors = [];

  if (incomingTemplateId && incomingTemplateId !== template.id) {
    warnings.push(`项目原始模板为 ${incomingTemplateId}，已按当前模板 ${template.displayName} 处理。`);
  }

  if (incomingTemplateVersion) {
    const templateCompare = compareVersions(incomingTemplateVersion, template.version);
    if (templateCompare < 0) {
      warnings.push(`项目模板版本 ${incomingTemplateVersion} 低于当前模板版本 ${template.version}，已自动按最新模板元信息归一化。`);
    }
    if (templateCompare > 0) {
      warnings.push(`项目模板版本 ${incomingTemplateVersion} 高于当前工具注册版本 ${template.version}，可能存在未覆盖字段。`);
    }
  }

  if (incomingProjectVersion) {
    const projectCompare = compareVersions(incomingProjectVersion, template.projectVersion || template.version);
    if (projectCompare < 0) {
      warnings.push(`项目配置版本 ${incomingProjectVersion} 低于当前目标版本 ${template.projectVersion || template.version}，已自动升级版本号。`);
    }
    if (projectCompare > 0) {
      warnings.push(`项目配置版本 ${incomingProjectVersion} 高于当前工具目标版本 ${template.projectVersion || template.version}，请留意兼容性。`);
    }
  } else {
    warnings.push(`项目缺少配置版本号，已自动补为 ${template.projectVersion || template.version}。`);
  }

  const normalizedProject = attachTemplateMeta({
    ...project,
    version: template.projectVersion || template.version,
  }, template.id);

  return {
    ok: errors.length === 0,
    template: {
      id: template.id,
      name: template.name,
      displayName: template.displayName,
      version: template.version,
      projectVersion: template.projectVersion || template.version,
      description: template.description,
    },
    warnings,
    errors,
    normalizedProject,
  };
}

async function readJsonAsset(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`读取静态资源失败：${url.pathname}`);
  }
  return response.json();
}

async function loadZipModule() {
  if (!zipModulePromise) {
    zipModulePromise = import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  }
  return zipModulePromise;
}

async function loadPackageAssets(templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplateDefinition(templateId);
  if (!packageAssetPromiseCache.has(template.id)) {
    packageAssetPromiseCache.set(template.id, readJsonAsset(template.packageAssetsUrl));
  }
  return packageAssetPromiseCache.get(template.id);
}

async function loadProjectData(templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplateDefinition(templateId);
  const payload = await readJsonAsset(template.projectDataUrl);
  const project = payload?.project && typeof payload.project === 'object' ? payload.project : payload;
  return validateProjectCompatibility(project, template.id).normalizedProject;
}

async function loadPresetCatalog(templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplateDefinition(templateId);
  const payload = await readJsonAsset(template.presetCatalogUrl);
  const presets = Array.isArray(payload?.presets) ? payload.presets : [];
  return presets.map((preset) => ({
    ...preset,
    templateId: template.id,
    templateVersion: template.version,
  }));
}

function buildConfigYaml(project) {
  const fontFace = sanitizeFontFaceList(project?.config?.fontFace);
  return toYaml({
    ...project.mapping,
    author: getProjectMetaValue(project, 'author', '浮生'),
    name: getProjectMetaValue(project, 'projectName', '新的键盘'),
    ...(fontFace.length ? { fontFace } : {}),
  }) + '\n';
}

function buildLibText(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function buildExportReadme(project) {
  return [
    `# ${getProjectMetaValue(project, 'projectName', '新的键盘')}`,
    '',
    '此目录由 Hamster Skin Designer 自动导出。',
    '',
    '## 文件说明',
    '',
    '- `config.yaml`：皮肤输出映射配置',
    '- `light/`：浅色主题编译结果',
    '- `dark/`：深色主题编译结果',
    '- `project.json`：网页工具可回读的项目源配置',
    '',
  ].join('\n');
}

async function loadScriptOnce(url) {
  if (scriptLoadPromiseCache.has(url)) {
    return scriptLoadPromiseCache.get(url);
  }
  const promise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[data-runtime-src="${url}"]`);
    if (existingScript?.dataset.loaded === 'true') {
      resolve();
      return;
    }
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error(`远程脚本加载失败：${url}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.runtimeSrc = url;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      reject(new Error(`远程脚本加载失败：${url}`));
    }, { once: true });
    document.head.appendChild(script);
  });
  scriptLoadPromiseCache.set(url, promise);
  return promise;
}

async function ensureGoRuntimeLoaded() {
  if (typeof window.Go === 'function') return;
  let lastError = null;
  for (const url of GO_WASM_EXEC_URLS) {
    try {
      await loadScriptOnce(url);
      if (typeof window.Go === 'function') return;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`加载 Go wasm 运行时失败：${lastError?.message || '未知错误'}`);
}

async function instantiateJsonnetWasm(go) {
  let lastError = null;
  for (const url of JSONNET_WASM_URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`);
      }
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        try {
          return await WebAssembly.instantiateStreaming(response.clone(), go.importObject);
        } catch {
          // 某些 CDN 的 content-type 不符合要求，回退到 arrayBuffer。
        }
      }
      const bytes = await response.arrayBuffer();
      return await WebAssembly.instantiate(bytes, go.importObject);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`加载 Jsonnet wasm 失败：${lastError?.message || '未知错误'}`);
}

async function waitForJsonnetEvaluator(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (typeof window.jsonnet_evaluate_snippet === 'function') {
      return window.jsonnet_evaluate_snippet;
    }
    await new Promise((resolve) => {
      window.setTimeout(resolve, 25);
    });
  }
  throw new Error('Jsonnet wasm 初始化超时。');
}

async function ensureJsonnetEvaluator() {
  if (typeof window.jsonnet_evaluate_snippet === 'function') {
    return window.jsonnet_evaluate_snippet;
  }
  if (!jsonnetRuntimePromise) {
    jsonnetRuntimePromise = (async () => {
      await ensureGoRuntimeLoaded();
      const go = new window.Go();
      const wasmModule = await instantiateJsonnetWasm(go);
      const runResult = go.run(wasmModule.instance);
      if (runResult && typeof runResult.catch === 'function') {
        runResult.catch((error) => {
          console.error('jsonnet wasm runtime exited unexpectedly', error);
        });
      }
      return waitForJsonnetEvaluator();
    })().catch((error) => {
      jsonnetRuntimePromise = null;
      throw error;
    });
  }
  return jsonnetRuntimePromise;
}

function createJsonnetVirtualFiles(project, packageAssets) {
  const files = {
    '/config.yaml': buildConfigYaml(project),
  };

  for (const [relativePath, content] of Object.entries(packageAssets?.textFiles || {})) {
    files[`/${relativePath.replace(/^\/+/, '')}`] = content;
  }

  for (const fileName of EDITABLE_LIB_FILES) {
    const resolvedFileName = resolveEditableLibFileName(fileName);
    files[`/jsonnet/lib/${resolvedFileName}.libsonnet`] = buildLibText(project.lib[fileName]);
  }

  return files;
}

async function renderProjectOutputs(project, templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplateDefinition(templateId);
  const validation = validateProjectCompatibility(project, template.id);
  const packageAssets = await loadPackageAssets(template.id);
  const evaluateSnippet = await ensureJsonnetEvaluator();
  const files = createJsonnetVirtualFiles(validation.normalizedProject, packageAssets);

  let renderedText = '';
  try {
    renderedText = evaluateSnippet('/jsonnet/main.jsonnet', files['/jsonnet/main.jsonnet'], files);
  } catch (error) {
    throw new Error(`生成皮肤文件失败：${error.message}`);
  }

  let outputs;
  try {
    outputs = JSON.parse(renderedText);
  } catch (error) {
    throw new Error(`生成结果解析失败：${error.message}`);
  }

  if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs)) {
    throw new Error('生成结果格式无效。');
  }

  return {
    template,
    validation: normalizeValidation(validation),
    project: validation.normalizedProject,
    packageAssets,
    configYaml: files['/config.yaml'],
    outputs,
  };
}

function collectStaticPackageFiles(packageAssets) {
  const files = [];
  for (const [path, content] of Object.entries(packageAssets?.textFiles || {})) {
    if (path.startsWith('light/resources/') || path.startsWith('dark/resources/')) {
      files.push({ path, content, binary: false });
    }
  }
  for (const [path, content] of Object.entries(packageAssets?.binaryFiles || {})) {
    if (path === 'demo.png' || path.startsWith('light/resources/') || path.startsWith('dark/resources/')) {
      files.push({ path, content, binary: true });
    }
  }
  return files;
}

function encodeBase64UrlFromBytes(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64UrlToBytes(input) {
  const normalized = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodeShareCode(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return `hsd2.${encodeBase64UrlFromBytes(bytes)}`;
}

function decodeShareCode(shareCode) {
  const text = String(shareCode || '').trim();
  if (!text.startsWith('hsd2.')) {
    throw new Error('当前纯前端版本仅支持新的 hsd2 分享码。');
  }
  const encoded = text.slice(5);
  try {
    const bytes = decodeBase64UrlToBytes(encoded);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new Error(`分享码解析失败：${error.message}`);
  }
}

export function isStaticRuntime() {
  return true;
}

export function getStaticTemplateCatalog() {
  return listTemplates();
}

export async function loadDefaultProjectData(templateId = DEFAULT_TEMPLATE_ID) {
  const project = await loadProjectData(templateId);
  const validation = validateProjectCompatibility(project, templateId);
  return {
    ok: true,
    project: validation.normalizedProject,
    templates: listTemplates(),
    validation: normalizeValidation(validation),
  };
}

export async function validateProjectData(project, templateId = DEFAULT_TEMPLATE_ID) {
  assertProject(project);
  const validation = validateProjectCompatibility(project, templateId);
  return {
    ok: true,
    project: validation.normalizedProject,
    validation: normalizeValidation(validation),
  };
}

export async function listPresetData(templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplateDefinition(templateId);
  const presets = await loadPresetCatalog(template.id);
  return {
    ok: true,
    template: {
      id: template.id,
      displayName: template.displayName,
      version: template.version,
      projectVersion: template.projectVersion || template.version,
    },
    presets: presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      badge: preset.badge || '',
    })),
  };
}

export async function loadPresetData(templateId = DEFAULT_TEMPLATE_ID, presetId) {
  const template = getTemplateDefinition(templateId);
  const presets = await loadPresetCatalog(template.id);
  const preset = presets.find((item) => item.id === presetId);
  if (!preset) {
    throw new Error(`未找到预设：${presetId}`);
  }
  const baseProject = await loadProjectData(template.id);
  const nextProject = preset.mode === 'replace' && preset.project
    ? preset.project
    : deepMerge(baseProject, preset.patch || {});
  const validation = validateProjectCompatibility(nextProject, template.id);
  return {
    ok: true,
    preset: {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      badge: preset.badge || '',
    },
    project: validation.normalizedProject,
    validation: normalizeValidation(validation),
  };
}

export async function exportProjectShareData(project, templateId = DEFAULT_TEMPLATE_ID) {
  assertProject(project);
  const validation = validateProjectCompatibility(project, templateId);
  const payload = {
    kind: 'hamster-skin-designer-share',
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    templateId: validation.template.id,
    templateVersion: validation.template.version,
    project: validation.normalizedProject,
  };
  return {
    ok: true,
    shareCode: encodeShareCode(payload),
    sharePacket: payload,
    fileName: `${normalizeFileName(getProjectMetaValue(validation.normalizedProject, 'projectName', '新的键盘'))}.hamster-share.json`,
    validation: normalizeValidation(validation),
  };
}

export async function importProjectShareData(shareCode, templateId = DEFAULT_TEMPLATE_ID) {
  const payload = decodeShareCode(shareCode);
  if (payload?.kind !== 'hamster-skin-designer-share' || !payload.project) {
    throw new Error('分享码内容无效。');
  }
  const validation = validateProjectCompatibility(payload.project, payload.templateId || templateId);
  return {
    ok: true,
    meta: {
      createdAt: payload.createdAt || null,
      sourceTemplateId: payload.templateId || null,
      sourceTemplateVersion: payload.templateVersion || null,
    },
    project: validation.normalizedProject,
    validation: normalizeValidation(validation),
  };
}

export async function importProjectPackageData(fileBuffer, fileName, templateId = DEFAULT_TEMPLATE_ID) {
  if (!fileBuffer || !(fileBuffer.byteLength || fileBuffer.length)) {
    throw new Error('导入文件内容为空。');
  }
  const { default: JSZip } = await loadZipModule();
  let archive;
  try {
    archive = await JSZip.loadAsync(fileBuffer);
  } catch (error) {
    throw new Error(`压缩包读取失败：${error.message}`);
  }
  const projectEntry = Object.values(archive.files).find((entry) => (
    !entry.dir && /(^|\/)project\.json$/i.test(entry.name)
  ));
  if (!projectEntry) {
    throw new Error('未在 cskin / zip 包中找到 project.json。');
  }
  let project;
  try {
    project = JSON.parse(await projectEntry.async('string'));
  } catch (error) {
    throw new Error(`project.json 解析失败：${error.message}`);
  }
  assertProject(project);
  const validation = validateProjectCompatibility(project, project.templateId || templateId);
  return {
    ok: true,
    source: {
      kind: 'cskin',
      fileName,
    },
    project: validation.normalizedProject,
    validation: normalizeValidation(validation),
  };
}

export async function exportProjectPackageData(project, templateId = DEFAULT_TEMPLATE_ID, options = {}) {
  assertProject(project);
  const format = String(options.format || 'cskin').trim().toLowerCase() === 'zip' ? 'zip' : 'cskin';
  const rendered = await renderProjectOutputs(project, templateId);
  const { default: JSZip } = await loadZipModule();
  const archive = new JSZip();
  const staticFiles = collectStaticPackageFiles(rendered.packageAssets);

  archive.file('config.yaml', rendered.configYaml);
  archive.file('README.md', buildExportReadme(rendered.project) + '\n');
  archive.file('project.json', JSON.stringify(rendered.project, null, 2) + '\n');

  for (const [path, content] of Object.entries(rendered.outputs)) {
    archive.file(path, String(content).endsWith('\n') ? String(content) : `${content}\n`);
  }

  for (const file of staticFiles) {
    if (file.binary) {
      archive.file(file.path, file.content, { base64: true });
    } else {
      archive.file(file.path, file.content);
    }
  }

  const blob = await archive.generateAsync({ type: 'blob' });
  const packageName = normalizeFileName(getProjectMetaValue(rendered.project, 'projectName', '新的键盘'));

  return {
    ok: true,
    blob,
    fileName: `${packageName}.${format}`,
    validation: rendered.validation,
    files: ['config.yaml', 'README.md', 'project.json', ...Object.keys(rendered.outputs), ...staticFiles.map((item) => item.path)].sort(),
  };
}

export function createUnsupportedStaticFeatureError(featureName) {
  return new Error(`${featureName} 依赖本地命令行能力，纯前端静态版暂不支持。`);
}

export function cloneProject(project) {
  return deepClone(project);
}
