const config = require('./config');

module.exports = {
  development: {
    username: config.database.user,
    password: config.database.password,
    database: config.database.name,
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.warn : false,
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: config.database.user,
    password: config.database.password,
    database: config.database.name + '_test',
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: false,
    pool: {
      min: 1,
      max: 5,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: config.database.user,
    password: config.database.password,
    database: config.database.name,
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: false,
    ssl: config.database.ssl,
    dialectOptions: config.database.ssl ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max,
      acquire: 30000,
      idle: 10000
    }
  }
};