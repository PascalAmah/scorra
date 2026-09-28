import { parseRedisUrl } from './redis.util';

describe('parseRedisUrl', () => {
  it('parses standard redis:// url', () => {
    const opts = parseRedisUrl('redis://localhost:6379');
    expect(opts.host).toBe('localhost');
    expect(opts.port).toBe(6379);
    expect(opts.tls).toBeUndefined();
  });

  it('parses rediss:// url and enables tls with rejectUnauthorized false', () => {
    const opts = parseRedisUrl('rediss://default:secretpass@eu1-fast-lion-12345.upstash.io:6379');
    expect(opts.host).toBe('eu1-fast-lion-12345.upstash.io');
    expect(opts.port).toBe(6379);
    expect(opts.username).toBe('default');
    expect(opts.password).toBe('secretpass');
    expect(opts.tls).toEqual({ rejectUnauthorized: false });
  });

  it('decodes encoded passwords and parses custom database index', () => {
    const opts = parseRedisUrl('rediss://default:mypass%40word@host.io:6380/2');
    expect(opts.host).toBe('host.io');
    expect(opts.port).toBe(6380);
    expect(opts.password).toBe('mypass@word');
    expect(opts.db).toBe(2);
    expect(opts.tls).toEqual({ rejectUnauthorized: false });
  });

  it('falls back gracefully on invalid url', () => {
    const opts = parseRedisUrl('not-a-url');
    expect(opts.host).toBe('localhost');
    expect(opts.port).toBe(6379);
  });
});
