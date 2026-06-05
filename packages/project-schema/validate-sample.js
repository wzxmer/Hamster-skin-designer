import { sampleProject, validateProject } from './index.js';

const result = validateProject(sampleProject);

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log('project.sample.json is valid.');
}
