import config from 'config';

/**
 * Google reCAPTCHAa Configuration
 */
export const recaptchaConfig = {
  recaptchaKey: config.get<string>('recaptcha.key'),
  recaptchaThreshold: config.get<number>('recaptcha.threshold'),
  recaptchaHostnames: config.get<string[]>('recaptcha.hostnames'),
};
