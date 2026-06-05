import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDITABLE_LIB_FILES } from '../shared-schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

export { EDITABLE_LIB_FILES };

export const TEMPLATE_REGISTRY = [
  {
    id: 'hamster-ios',
    name: 'hamster-ios',
    displayName: '基础模板01',
    version: '0.1.0',
    projectVersion: '0.1.0',
    description: '当前默认的 iOS 风格 Hamster 皮肤模板。',
    templateDir: path.join(projectRoot, 'templates', 'hamster-ios'),
    extractor: path.join(projectRoot, 'apps', 'builder', 'extract-template.jsonnet'),
    presetCatalog: path.join(projectRoot, 'templates', 'hamster-ios', 'presets', 'catalog.json'),
  },
];

export const DEFAULT_TEMPLATE_ID = TEMPLATE_REGISTRY[0].id;

export function listTemplates() {
  return TEMPLATE_REGISTRY.map((template) => ({
    id: template.id,
    name: template.name,
    displayName: template.displayName,
    version: template.version,
    projectVersion: template.projectVersion,
    description: template.description,
  }));
}

export function getTemplateDefinition(templateId = DEFAULT_TEMPLATE_ID) {
  return TEMPLATE_REGISTRY.find((template) => template.id === templateId) || TEMPLATE_REGISTRY[0];
}

export function normalizeProjectTemplateId(project, fallbackTemplateId = DEFAULT_TEMPLATE_ID) {
  if (!project || typeof project !== 'object') return fallbackTemplateId;
  return typeof project.templateId === 'string' && project.templateId
    ? project.templateId
    : fallbackTemplateId;
}

export function attachTemplateMeta(project, templateId = DEFAULT_TEMPLATE_ID) {
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

function parseVersion(version) {
  return String(version || '0.0.0')
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((value) => (Number.isFinite(value) ? value : 0));
}

export function compareVersions(left, right) {
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

export function validateProjectCompatibility(project, templateId = DEFAULT_TEMPLATE_ID) {
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

export function createLibFileMap(project) {
  return Object.fromEntries(
    EDITABLE_LIB_FILES.map((name) => [name, project.lib[name]])
  );
}
