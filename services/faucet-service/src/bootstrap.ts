import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import CallbackLogger from '@rosen-bridge/callback-logger';
import WinstonLogger from '@rosen-bridge/winston-logger';

import { LoggerConfig } from './configs';

const loggerConfig = new LoggerConfig();

const winston = WinstonLogger.createLogger(loggerConfig.transports);
const callbackLogger = new CallbackLogger(winston);
DefaultLogger.init(callbackLogger);
