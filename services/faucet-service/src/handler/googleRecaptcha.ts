import { recaptchaConfig } from '@configs';
import { GoogleRecaptcha } from '@ergo-faucet/google-recaptcha';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupRecaptcha = async () => {
  const recaptchaLogger = DefaultLogger.getInstance().child('GoogleRecaptcha');

  await GoogleRecaptcha.initialize(
    recaptchaConfig.recaptchaActivate,
    recaptchaConfig.recaptchaKey,
    recaptchaConfig.recaptchaThreshold,
    recaptchaConfig.recaptchaHostnames,
    recaptchaLogger,
  );
  logger.info('GoogleRecaptcha initialized successfully');
};
