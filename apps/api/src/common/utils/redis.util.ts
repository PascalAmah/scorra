import { RedisOptions } from 'ioredis';

export function parseRedisUrl(urlString: string): RedisOptions {
  try {
    const parsed = new URL(urlString);
    const isTls = parsed.protocol === 'rediss:';
    const dbPath = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';
    const db = dbPath ? parseInt(dbPath, 10) : 0;

    const options: RedisOptions = {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      db: isNaN(db) ? 0 : db,
    };

    if (isTls) {
      options.tls = { rejectUnauthorized: false };
    }

    return options;
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}
