const http = require('http');
const { routeRequest } = require('./routes');

const createApp = () => http.createServer((req, res) => routeRequest(req, res));

module.exports = { createApp };
