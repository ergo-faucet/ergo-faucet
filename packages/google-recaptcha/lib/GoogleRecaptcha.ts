import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import axios, { AxiosInstance } from 'axios';
import { reCAPTCHAResponse, verifyQuery } from './types';
import { reCaptchaError, throwRecaptchaError } from './googleRecaptchaErrors';

class GooglereCaptcha {
  private static instance: GooglereCaptcha;
  private logger: AbstractLogger;
  private readonly recaptchaKey: string;
  private readonly threshold: number;
  private axiosInstance: AxiosInstance;

  /**
   * Private constructor for singleton pattern.
   *
   * @param recaptchaKey - Your reCAPTCHA secret key.
   * @param threshold - Optional risk score threshold, defaults to 0.5.
   * @param verifyURL - The URL endpoint to verify the reCAPTCHA token.
   * @param axiosInstance - Optional custom Axios instance.
   * @param logger - Optional custom logger, defaults to DummyLogger.
   */
  private constructor(
    recaptchaKey: string,
    threshold: number = 0.5,
    verifyURL: string,
    axiosInstance?: AxiosInstance,
    logger?: AbstractLogger,
  ) {
    this.recaptchaKey = recaptchaKey;
    this.threshold = threshold;
    this.axiosInstance = axiosInstance
      ? axiosInstance
      : axios.create({
          baseURL: `${verifyURL}`,
          timeout: 1000,
        });
    this.logger = logger ? logger : new DummyLogger();
  }

  /**
   * Returns the singleton instance of `GooglereCaptcha`.
   *
   * @throws Error if the instance has not been initialized.
   * @returns The initialized `GooglereCaptcha` instance.
   */
  public static getInstance = (): GooglereCaptcha => {
    if (!this.instance) {
      throw new Error('GooglereCaptcha instance has not been initialized.');
    }
    return GooglereCaptcha.instance;
  };

  /**
   * Initializes the singleton instance of `GooglereCaptcha` if not already initialized.
   *
   * @param recaptchaKey - Site key for reCAPTCHA.
   * @param threshold - Optional risk score threshold.
   * @param verifyURL - The URL endpoint to verify the reCAPTCHA token.
   * @param axiosInstance - Optional custom Axios instance.
   * @param logger - Optional custom logger.
   */
  public static initialize = async (
    recaptchaKey: string,
    threshold: number = 0.5,
    verifyURL: string,
    axiosInstance?: AxiosInstance,
    logger?: AbstractLogger,
  ) => {
    if (!this.instance) {
      this.instance = new GooglereCaptcha(
        recaptchaKey,
        threshold,
        verifyURL,
        axiosInstance,
        logger,
      );
    }
  };

  /**
   * Verify a reCAPTCHA token using the traditional reCAPTCHA API.
   *
   * Sends a POST request to the verification URL with the token and secret key.
   * Checks the returned score against the threshold to determine success.
   * Throws or logs errors depending on error codes.
   *
   * @param token - The reCAPTCHA token from client.
   * @param remoteip - Optional remote IP address of the user.
   * @returns True if verification is successful and score passes threshold, otherwise false.
   */
  public verifyByAPI = async (
    token: string,
    remoteip?: string,
  ): Promise<boolean> => {
    const queryParams: verifyQuery = {
      secret: this.recaptchaKey,
      response: token,
      remoteip,
    };
    try {
      const response = (
        await this.axiosInstance.post<reCAPTCHAResponse>(
          '',
          {},
          {
            params: queryParams,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
      ).data;
      if (response.success) {
        if (response.score !== undefined && response.score > this.threshold) {
          return true;
        }
      }

      if (Array.isArray(response.error_codes)) {
        for (const code of response.error_codes) {
          throwRecaptchaError(code, {
            secret: this.recaptchaKey,
            response: token,
          });
        }
      }

      return false;
    } catch (err) {
      if (err instanceof reCaptchaError) {
        this.logger.debug(err.message);
      }
      if (axios.isAxiosError(err)) {
        this.logger.error(`Axios error.`, {
          message: err.message,
          stack: err.stack,
        });
      }

      throw err;
    }
  };
}

export { GooglereCaptcha };
