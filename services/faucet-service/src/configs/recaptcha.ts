import config from 'config';
const activate = config.get<boolean>('recaptcha.activate');

/**
 * Google reCAPTCHAa Configuration
 */

export const recaptchaConfig =
  activate === true
    ? {
        recaptchaActivate: activate,
        recaptchaKey: '',
        recaptchaThreshold: undefined,
        recaptchaHostnames: [],
      }
    : {
        recaptchaActivate: activate,
        recaptchaKey: config.get<string>('recaptcha.key'),
        recaptchaThreshold: config.get<number>('recaptcha.threshold'),
        recaptchaHostnames: config.get<string[]>('recaptcha.hostnames'),
      };
