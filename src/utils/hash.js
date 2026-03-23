const crypto = require('crypto');

const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');
module.exports = { hashValue };
