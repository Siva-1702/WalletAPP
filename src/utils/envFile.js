const fs = require('fs');
const path = require('path');

const normalizeContent = (content) => {
  if (content.includes('\n')) {
    return content;
  }

  if (content.includes('\\n')) {
    return content.replace(/\\n/g, '\n');
  }

  return content;
};

const parseEnvContent = (content) => normalizeContent(content)
  .split(/\r?\n/)
  .reduce((accumulator, line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return accumulator;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) {
      return accumulator;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (key) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});

const mergeEnvWithMeta = (state, incomingEnv, sourceFile) => {
  const nextValues = { ...state.values };
  const nextSources = { ...state.sources };

  Object.entries(incomingEnv).forEach(([key, value]) => {
    if (value === '' && nextValues[key]) {
      return;
    }

    nextValues[key] = value;
    nextSources[key] = sourceFile;
  });

  return { values: nextValues, sources: nextSources };
};

const loadEnvFilesWithMeta = (baseDir) => {
  const basePath = baseDir || process.cwd();
  const fallbackRoot = path.resolve(__dirname, '..', '..');
  const directories = [fallbackRoot, basePath];
  const fileNames = ['.env.example', '.env', '.env.local'];

  let state = { values: {}, sources: {} };
  directories.forEach((directory) => {
    fileNames.forEach((fileName) => {
      const filePath = path.join(directory, fileName);
      if (!fs.existsSync(filePath)) {
        return;
      }

      const parsed = parseEnvContent(fs.readFileSync(filePath, 'utf8'));
      state = mergeEnvWithMeta(state, parsed, filePath);
    });

    const typoPath = path.join(directory, '.env.examp');
    if (fs.existsSync(typoPath)) {
      const parsed = parseEnvContent(fs.readFileSync(typoPath, 'utf8'));
      state = mergeEnvWithMeta(state, parsed, typoPath);
    }
  });

  return state;
};

const mergeEnv = (baseEnv, incomingEnv) => mergeEnvWithMeta({ values: baseEnv, sources: {} }, incomingEnv, '').values;

const loadEnvFiles = (baseDir) => loadEnvFilesWithMeta(baseDir).values;

module.exports = { parseEnvContent, loadEnvFiles, mergeEnv, loadEnvFilesWithMeta };
