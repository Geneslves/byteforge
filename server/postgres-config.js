const hasValue = (value) => value !== undefined && value !== null && String(value) !== '';

export function createPostgresConfig(env = process.env, options = {}) {
  const host = env.PGHOST || env.POSTGRES_HOST || env.DB_HOST;
  const user = env.PGUSER || env.POSTGRES_USER;
  const password = env.PGPASSWORD || env.POSTGRES_PASSWORD;
  const database = env.PGDATABASE || env.POSTGRES_DB;
  const portValue = env.PGPORT || env.POSTGRES_PORT;

  if ([host, user, password, database, portValue].some(hasValue)) {
    return {
      host: host || 'localhost',
      port: Number(portValue || 5432),
      user: user || 'postgres',
      password: password || '',
      database: database || 'byteforge',
      ...options,
    };
  }

  return {
    connectionString: env.DATABASE_URL || 'postgresql://localhost:5432/byteforge',
    ...options,
  };
}

export function describePostgresConfig(config) {
  if (config.connectionString) {
    return config.connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  }

  return `postgresql://${config.user}:****@${config.host}:${config.port}/${config.database}`;
}
