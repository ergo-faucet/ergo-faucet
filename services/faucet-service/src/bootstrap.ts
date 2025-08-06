import WinstonLogger from '@rosen-bridge/winston-logger';
import config from 'config';
import { LoggerConfig } from './configs';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const customSecrets = config.util.loadFileConfigs('./config/custom-env');
config.util.extendDeep(config, customSecrets);
const loggerConfig = new LoggerConfig();
WinstonLogger.init(loggerConfig.transports);
CallbackLoggerFactory.init(WinstonLogger.getInstance());
