import sampleProject from './defaults/project.sample.json' with { type: 'json' };
import { assertValidProject, validateProject } from './validators/project-validator.js';

export { assertValidProject, sampleProject, validateProject };

export function createSampleProject() {
  return structuredClone(sampleProject);
}
