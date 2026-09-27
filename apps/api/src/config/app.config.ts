import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  throttleTtl: parseInt(process.env.THROTTLE_TTL || '60', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  // Email (Sendlib REST API — https://sendlib.samueltuoyo.com)
  sendlibApiUrl: process.env.SENDLIB_API_URL || 'https://sendlib.samueltuoyo.com/api/send',
  sendlibApiKey: process.env.SENDLIB_API_KEY || '',
  sendlibFrom: process.env.SENDLIB_FROM || 'Scorra <noreply@scorra.dev>',
}));
