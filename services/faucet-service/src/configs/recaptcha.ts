import config from 'config';

/**
 * Google reCAPTCHAa Configuration
 */
export const recaptchaConfig = {
  recaptchaKey: config.get<string>('recaptcha.key'),
  recaptchaDevelopment: config.get<boolean>('recaptcha.development'),
  recaptchaThreshold: config.get<number>('recaptcha.threshold'),
  recaptchaHostnames: config.get<string[]>('recaptcha.hostnames'),
};
