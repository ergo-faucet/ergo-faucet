import { GoogleRecaptcha } from '@ergo-faucet/google-recaptcha';
import { recaptchaConfig } from '../configs';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupRecaptcha = async () => {
  const recaptchaLogger =
    CallbackLoggerFactory.getInstance().getLogger('GoogleRecaptcha');

  await GoogleRecaptcha.initialize(
    recaptchaConfig.recaptchaActivate,
    recaptchaConfig.recaptchaKey,
    recaptchaConfig.recaptchaDevelopment,
    recaptchaConfig.recaptchaThreshold,
    recaptchaConfig.recaptchaHostnames,
    recaptchaLogger,
  );
  logger.info('GoogleRecaptcha initialized successfully');
};
