import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, brotliDecompressSync } from 'node:zlib';
import { toYaml } from './yaml.js';
import { EDITABLE_LIB_FILES } from '../../packages/shared-schema/index.js';
import {
  DEFAULT_TEMPLATE_ID,
  getTemplateDefinition,
  listTemplates,
  normalizeProjectTemplateId,
  validateProjectCompatibility,
} from '../../packages/template-adapters/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const workRoot = path.join(projectRoot, '.work');

function createBuilderError(stage, message, details = {}) {
  const error = new Error(message);
  error.stage = stage;
  error.command = details.command || null;
  error.args = details.args || [];
  error.code = details.code || null;
  error.stdout = details.stdout || '';
  error.stderr = details.stderr || '';
  return error;
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const stage = options.stage || command;
    const child = spawn(command, args, {
      cwd: options.cwd || projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      reject(createBuilderError(stage, error.message, { command, args, code: error.code }));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        createBuilderError(
          stage,
          stderr || stdout || `${command} exited with code ${code}`,
          { command, args, code, stdout, stderr }
        )
      );
    });
  });
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

function assertProject(project) {
  if (!project || typeof project !== 'object') {
    throw createBuilderError('validate-project', '缺少 project 数据。');
  }

  if (!project.mapping || typeof project.mapping !== 'object') {
    throw createBuilderError('validate-project', 'project.mapping 不是有效对象。');
  }

  if (!project.lib || typeof project.lib !== 'object') {
    throw createBuilderError('validate-project', 'project.lib 不是有效对象。');
  }

  for (const fileName of EDITABLE_LIB_FILES) {
    if (!(fileName in project.lib)) {
      throw createBuilderError('validate-project', `project.lib.${fileName} 缺失。`);
    }
  }
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

function encodeShareCode(payload) {
  const compressed = brotliCompressSync(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `hsd1.${compressed.toString('base64url')}`;
}

function decodeShareCode(shareCode) {
  const text = String(shareCode || '').trim();
  if (!text.startsWith('hsd1.')) {
    throw createBuilderError('share-import', '分享码格式不正确。');
  }
  const encoded = text.slice(5);
  try {
    const buffer = Buffer.from(encoded, 'base64url');
    const json = brotliDecompressSync(buffer).toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    throw createBuilderError('share-import', `分享码解析失败：${error.message}`);
  }
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

export function getAvailableTemplates() {
  return listTemplates();
}

function normalizeExtractedProject(payload, templateId) {
  const project = payload?.project && typeof payload.project === 'object'
    ? payload.project
    : payload;
  return validateProjectCompatibility(project, templateId).normalizedProject;
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
    '如需继续修改，建议回到设计器重新打开 `project.json` 后再次编译导出。',
    '',
  ].join('\n');
}

export async function loadDefaultProject() {
  const template = getTemplateDefinition(DEFAULT_TEMPLATE_ID);
  const { stdout } = await run('jsonnet', [template.extractor], { stage: 'load-template' });
  return normalizeExtractedProject(JSON.parse(stdout), template.id);
}

export async function loadTemplateProject(templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplateDefinition(templateId);
  const { stdout } = await run('jsonnet', [template.extractor], { stage: 'load-template' });
  return normalizeExtractedProject(JSON.parse(stdout), template.id);
}

function resolveTemplateForProject(project, templateId) {
  const resolvedTemplateId = normalizeProjectTemplateId(project, templateId || DEFAULT_TEMPLATE_ID);
  return getTemplateDefinition(resolvedTemplateId);
}

export function validateProjectInput(project, templateId = DEFAULT_TEMPLATE_ID) {
  assertProject(project);
  const validation = validateProjectCompatibility(project, templateId);
  return {
    ...validation,
    validation: normalizeValidation(validation),
  };
}

async function materializeProject(project, targetDir, templateId) {
  const validated = validateProjectInput(project, templateId);
  const template = resolveTemplateForProject(validated.normalizedProject, templateId);
  const normalizedProject = validated.normalizedProject;
  const templateDir = path.join(targetDir, 'template');
  await cp(template.templateDir, templateDir, { recursive: true });

  await writeFile(
    path.join(templateDir, 'config.yaml'),
    buildConfigYaml(normalizedProject),
    'utf8'
  );

  for (const fileName of EDITABLE_LIB_FILES) {
    const libFile = path.join(templateDir, 'jsonnet', 'lib', `${fileName}.libsonnet`);
    await writeFile(libFile, buildLibText(normalizedProject.lib[fileName]), 'utf8');
  }

  return {
    templateDir,
    project: normalizedProject,
    template,
    validation: validated.validation,
  };
}

export async function prepareProjectFromTemplate(templateId = DEFAULT_TEMPLATE_ID) {
  return loadTemplateProject(templateId);
}

export async function loadProjectTemplateMeta(templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplateDefinition(templateId);
  return {
    ok: true,
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

async function prepareWorkDir(prefix = 'build') {
  await mkdir(workRoot, { recursive: true });
  const dirName = `${prefix}-${Date.now()}`;
  const dirPath = path.join(workRoot, dirName);
  await rm(dirPath, { recursive: true, force: true });
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

async function ensureBuildOutput(outputDir) {
  await mkdir(outputDir, { recursive: true });
  await mkdir(path.join(outputDir, 'light'), { recursive: true });
  await mkdir(path.join(outputDir, 'dark'), { recursive: true });
}

export async function buildProject(project, options = {}) {
  const workDir = await prepareWorkDir('build');
  const materialized = await materializeProject(project, workDir, options.templateId);
  const templateDir = materialized.templateDir;
  const outputDir = path.join(workDir, 'dist');
  await ensureBuildOutput(outputDir);

  await run('jsonnet', ['-S', '-m', outputDir, path.join(templateDir, 'jsonnet', 'main.jsonnet')], {
    cwd: templateDir,
    stage: 'compile-jsonnet',
  });

  return {
    workDir,
    templateDir,
    outputDir,
    project: materialized.project,
    template: materialized.template,
    validation: materialized.validation,
    files: existsSync(outputDir) ? await readOutputFiles(outputDir) : [],
  };
}

async function readOutputFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await readOutputFiles(fullPath, base));
    } else {
      files.push(path.relative(base, fullPath));
    }
  }
  return files;
}

async function findFileByName(dir, fileName) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === fileName) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const found = await findFileByName(fullPath, fileName);
      if (found) return found;
    }
  }
  return null;
}

async function createPackageDir(build, project) {
  const packageDir = path.join(build.workDir, 'package');
  await rm(packageDir, { recursive: true, force: true });
  await mkdir(packageDir, { recursive: true });

  await cp(path.join(build.templateDir, 'config.yaml'), path.join(packageDir, 'config.yaml'));
  await cp(path.join(build.outputDir, 'light'), path.join(packageDir, 'light'), { recursive: true });
  await cp(path.join(build.outputDir, 'dark'), path.join(packageDir, 'dark'), { recursive: true });
  if (existsSync(path.join(build.templateDir, 'demo.png'))) {
    await cp(path.join(build.templateDir, 'demo.png'), path.join(packageDir, 'demo.png'));
  }
  if (existsSync(path.join(build.templateDir, 'fonts'))) {
    await cp(path.join(build.templateDir, 'fonts'), path.join(packageDir, 'fonts'), { recursive: true });
  }
  await writeFile(path.join(packageDir, 'README.md'), buildExportReadme(project), 'utf8');
  await writeFile(path.join(packageDir, 'project.json'), JSON.stringify(project, null, 2) + '\n', 'utf8');

  return packageDir;
}

async function zipDirectory(sourceDir, zipPath) {
  try {
    await rm(zipPath, { force: true });
    await run('tar', ['-a', '-c', '-f', zipPath, '-C', sourceDir, '.'], { stage: 'package-zip' });
  } catch (error) {
    throw error;
  }
}

export async function packageProject(project, options = {}) {
  const build = await buildProject(project, options);
  const packageDir = await createPackageDir(build, build.project);
  const packageName = normalizeFileName(getProjectMetaValue(build.project, 'projectName', '新的键盘'));
  const zipPath = path.join(build.workDir, `${packageName}.zip`);

  await zipDirectory(packageDir, zipPath);

  const fileBuffer = await readFile(zipPath);

  return {
    ...build,
    packageDir,
    zipName: `${packageName}.cskin`,
    zipPath,
    fileBuffer,
  };
}

export async function importProjectPackage(fileBuffer, fileName, templateId = DEFAULT_TEMPLATE_ID) {
  if (!fileBuffer || !fileBuffer.length) {
    throw createBuilderError('import-cskin', '导入文件内容为空。');
  }

  const workDir = await prepareWorkDir('import');
  const archivePath = path.join(workDir, 'import.zip');
  const extractDir = path.join(workDir, 'extract');
  await writeFile(archivePath, fileBuffer);
  await mkdir(extractDir, { recursive: true });

  await run('tar', ['-xf', archivePath, '-C', extractDir], { stage: 'import-cskin' });

  const projectPath = await findFileByName(extractDir, 'project.json');
  if (!projectPath) {
    throw createBuilderError('import-cskin', '未在 cskin 包中找到 project.json。');
  }

  let project;
  try {
    project = JSON.parse(await readFile(projectPath, 'utf8'));
  } catch (error) {
    throw createBuilderError('import-cskin', `project.json 解析失败：${error.message}`);
  }

  const validated = validateProjectInput(project, project.templateId || templateId);
  return {
    ok: true,
    source: {
      kind: 'cskin',
      fileName,
    },
    project: validated.normalizedProject,
    validation: validated.validation,
  };
}

async function loadPresetCatalog(templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplateDefinition(templateId);
  if (!template.presetCatalog || !existsSync(template.presetCatalog)) {
    return [];
  }
  const raw = await readFile(template.presetCatalog, 'utf8');
  const parsed = JSON.parse(raw);
  const presets = Array.isArray(parsed?.presets) ? parsed.presets : [];
  return presets.map((preset) => ({
    ...preset,
    templateId: template.id,
    templateVersion: template.version,
  }));
}

export async function listTemplatePresets(templateId = DEFAULT_TEMPLATE_ID) {
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

export async function loadPresetProject(templateId = DEFAULT_TEMPLATE_ID, presetId) {
  const template = getTemplateDefinition(templateId);
  const presets = await loadPresetCatalog(template.id);
  const preset = presets.find((item) => item.id === presetId);
  if (!preset) {
    throw createBuilderError('preset-load', `未找到预设：${presetId}`);
  }
  const baseProject = await loadTemplateProject(template.id);
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

export function exportProjectShare(project, templateId = DEFAULT_TEMPLATE_ID) {
  const validated = validateProjectInput(project, templateId);
  const payload = {
    kind: 'hamster-skin-designer-share',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    templateId: validated.template.id,
    templateVersion: validated.template.version,
    project: validated.normalizedProject,
  };
  return {
    ok: true,
    shareCode: encodeShareCode(payload),
    sharePacket: payload,
    fileName: `${normalizeFileName(getProjectMetaValue(validated.normalizedProject, 'projectName', '新的键盘'))}.hamster-share.json`,
    validation: validated.validation,
  };
}

export function importProjectShare(shareCode, templateId = DEFAULT_TEMPLATE_ID) {
  const payload = decodeShareCode(shareCode);
  if (payload?.kind !== 'hamster-skin-designer-share' || !payload.project) {
    throw createBuilderError('share-import', '分享码内容无效。');
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
