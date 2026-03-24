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

const loadEnvFiles = (baseDir) => {
  const basePath = baseDir || process.cwd();
  const fallbackRoot = path.resolve(__dirname, '..', '..');
  const directories = [fallbackRoot, basePath];
  const fileNames = ['.env.example', '.env', '.env.local', '.env.examp'];

  return directories.reduce((accumulator, directory) => fileNames.reduce((nestedAccumulator, fileName) => {
    const filePath = path.join(directory, fileName);
    if (!fs.existsSync(filePath)) {
      return nestedAccumulator;
    }

    return {
      ...nestedAccumulator,
      ...parseEnvContent(fs.readFileSync(filePath, 'utf8'))
    };
  }, accumulator), {});
};

module.exports = { parseEnvContent, loadEnvFiles };
