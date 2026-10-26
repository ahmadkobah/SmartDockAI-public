const config = require('./config');

// Environment-specific configurations
const environments = {
  development: {
    database: {
      logging: console.warn, // Enable SQL logging in development
      benchmark: true
    },
    logging: {
      level: 'debug'
    },
    security: {
      bcryptRounds: 8 // Faster hashing for development
    }
  },

  test: {
    database: {
      logging: false,
      name: config.database.name + '_test'
    },
    logging: {
      level: 'error'
    },
    jwt: {
      expiresIn: '1h'
    }
  },

  production: {
    database: {
      logging: false,
      ssl: true,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    },
    logging: {
      level: 'warn'
    },
    security: {
      bcryptRounds: 12
    }
  }
};

// Merge environment-specific config with base config
const envConfig = environments[config.app.env] || {};

// Deep merge function
const deepMerge = (target, source) => {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
};

const finalConfig = deepMerge({ ...config }, envConfig);

module.exports = finalConfig;