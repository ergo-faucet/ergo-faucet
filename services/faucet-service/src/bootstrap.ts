import WinstonLogger from '@rosen-bridge/winston-logger';
import { LoggerConfig } from './configs';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const loggerConfig = new LoggerConfig();
WinstonLogger.init(loggerConfig.transports);
CallbackLoggerFactory.init(WinstonLogger.getInstance());
