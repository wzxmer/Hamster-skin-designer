function formatScalar(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function toYaml(value, indent = 0) {
  const space = ' '.repeat(indent);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          const nested = toYaml(item, indent + 2);
          const lines = nested.split('\n');
          return `${space}- ${lines[0].trimStart()}\n${lines.slice(1).join('\n')}`;
        }
        return `${space}- ${formatScalar(item)}`;
      })
      .join('\n');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => {
        if (item && typeof item === 'object') {
          return `${space}${key}:\n${toYaml(item, indent + 2)}`;
        }
        return `${space}${key}: ${formatScalar(item)}`;
      })
      .join('\n');
  }

  return `${space}${formatScalar(value)}`;
}
