const { createApp } = require('./app');
const env = require('./config/env');
const { runMigrations } = require('./migrations/schema');

runMigrations();
createApp().listen(env.port, () => {
  console.log(`WalletAPP API listening on port ${env.port}`);
});
