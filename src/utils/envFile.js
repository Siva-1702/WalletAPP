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

const mergeEnv = (baseEnv, incomingEnv) => Object.entries(incomingEnv).reduce((accumulator, [key, value]) => {
  if (value === '' && accumulator[key]) {
    return accumulator;
  }

  return {
    ...accumulator,
    [key]: value
  };
}, baseEnv);

const loadEnvFiles = (baseDir) => {
  const basePath = baseDir || process.cwd();
  const fallbackRoot = path.resolve(__dirname, '..', '..');
  const directories = [fallbackRoot, basePath];
  const fileNames = ['.env.example', '.env', '.env.local'];

  let loaded = {};
  directories.forEach((directory) => {
    fileNames.forEach((fileName) => {
      const filePath = path.join(directory, fileName);
      if (!fs.existsSync(filePath)) {
        return;
      }

      loaded = mergeEnv(loaded, parseEnvContent(fs.readFileSync(filePath, 'utf8')));
    });

    const typoPath = path.join(directory, '.env.examp');
    if (fs.existsSync(typoPath)) {
      loaded = mergeEnv(loaded, parseEnvContent(fs.readFileSync(typoPath, 'utf8')));
    }
  });

  return loaded;
};

module.exports = { parseEnvContent, loadEnvFiles, mergeEnv };
