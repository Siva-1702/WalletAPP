const fs = require('fs');
const path = require('path');

const parseEnvContent = (content) => content
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
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    if (key) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

const loadEnvFiles = (baseDir) => {
  const fileNames = ['.env.example', '.env'];
  return fileNames.reduce((accumulator, fileName) => {
    const filePath = path.join(baseDir, fileName);
    if (!fs.existsSync(filePath)) {
      return accumulator;
    }

    return {
      ...accumulator,
      ...parseEnvContent(fs.readFileSync(filePath, 'utf8'))
    };
  }, {});
};

module.exports = { parseEnvContent, loadEnvFiles };
