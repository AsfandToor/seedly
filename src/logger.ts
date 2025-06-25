import { pino } from 'pino';

const logger = pino({
  level:
    process.env.NODE_ENV === 'production'
      ? 'info'
      : 'debug',
  name: 'seedly',

  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },

  base: {
    app: 'seedly',
  },
});

export default logger;
