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

    const keyValueMatch = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[:=＝]\s*(.*)$/u);
    if (!keyValueMatch) {
      return accumulator;
    }

    const key = keyValueMatch[1];
    const rawValue = keyValueMatch[2].trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '').replace(/\u0000/g, '').trim();
    accumulator[key] = value;
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

const loadJsEnvFile = (filePath) => {
  delete require.cache[require.resolve(filePath)];
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const loaded = require(filePath);
  if (!loaded || typeof loaded !== 'object') {
    return {};
  }

  return Object.entries(loaded).reduce((accumulator, [key, value]) => {
    if (typeof value === 'undefined' || value === null) {
      return accumulator;
    }
    accumulator[key] = String(value);
    return accumulator;
  }, {});
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

    ['.env.examp', '.env.examr', '.env.exmaple'].forEach((typoName) => {
      const typoPath = path.join(directory, typoName);
      if (!fs.existsSync(typoPath)) {
        return;
      }

      const parsed = parseEnvContent(fs.readFileSync(typoPath, 'utf8'));
      state = mergeEnvWithMeta(state, parsed, typoPath);
    });

    ['env.js', '.env.js'].forEach((jsEnvName) => {
      const jsEnvPath = path.join(directory, jsEnvName);
      if (!fs.existsSync(jsEnvPath)) {
        return;
      }

      const parsed = loadJsEnvFile(jsEnvPath);
      state = mergeEnvWithMeta(state, parsed, jsEnvPath);
    });
  });

  return state;
};

const mergeEnv = (baseEnv, incomingEnv) => mergeEnvWithMeta({ values: baseEnv, sources: {} }, incomingEnv, '').values;

const loadEnvFiles = (baseDir) => loadEnvFilesWithMeta(baseDir).values;

module.exports = { parseEnvContent, loadEnvFiles, mergeEnv, loadEnvFilesWithMeta };
