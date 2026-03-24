const { runMigrations } = require('./schema');

runMigrations();
console.log('Database migration completed successfully.');
