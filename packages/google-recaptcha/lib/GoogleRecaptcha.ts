import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import axios from 'axios';
import { RecaptchaResponse, VerifyQuery } from './types';
import {
  InvalidHostname,
  RecaptchaClientError,
  RecaptchaServerError,
  throwRecaptchaError,
  TimeoutOrDuplicate,
} from './googleRecaptchaErrors';

class GoogleRecaptcha {
  private static instance: GoogleRecaptcha;
  private logger: AbstractLogger;
  private readonly recaptchaKey: string;
  private readonly threshold: number;
  private hostnames: string[];

  /**
   * Private constructor for singleton pattern.
   *
   * @param recaptchaKey - Your reCAPTCHA secret key.
   * @param threshold - Optional risk score threshold, defaults to 0.5.
   * @param hostnames - Valid Hostnames.
   * @param logger - Optional custom logger, defaults to DummyLogger.
   */
  private constructor(
    recaptchaKey: string,
    threshold: number = 0.5,
    hostnames: string[],
    logger?: AbstractLogger,
  ) {
    this.recaptchaKey = recaptchaKey;
    this.threshold = threshold;
    this.hostnames = hostnames;
    this.logger = logger ? logger : new DummyLogger();
  }

  /**
   * Returns the singleton instance of `GoogleRecaptcha`.
   *
   * @throws Error if the instance has not been initialized.
   * @returns The initialized `GoogleRecaptcha` instance.
   */
  public static getInstance = (): GoogleRecaptcha => {
    if (!this.instance) {
      throw new Error('GoogleRecaptcha instance has not been initialized.');
    }
    return GoogleRecaptcha.instance;
  };

  /**
   * Initializes the singleton instance of `GoogleRecaptcha` if not already initialized.
   *
   * @param recaptchaKey - Your reCAPTCHA secret key.
   * @param threshold - Optional risk score threshold.
   * @param logger - Optional custom logger.
   * @param hostnames - List of allowed domain names (as strings) for validation, configured in the Google Cloud Console.
   *                    Example: ["localhost", "example.com", "subdomain.example.com", "120.0.0.1"] Do not include
   *                    scheme ("https://"), page paths ("example.com/page"), or port numbers ("localhost:8000").
   *
   *  @throws Error if the instance has already been initialized.
   * @returns The `GoogleRecaptcha` instance.
   */
  public static initialize = async (
    recaptchaKey: string,
    threshold: number = 0.5,
    hostnames: string[],
    logger?: AbstractLogger,
  ) => {
    if (this.instance) {
      throw new Error('GooglereCaptcha instance has already been initialized.');
    }
    this.instance = new GoogleRecaptcha(
      recaptchaKey,
      threshold,
      hostnames,
      logger,
    );
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
  public verifyToken = async (
    token: string,
    remoteip?: string,
  ): Promise<boolean> => {
    const queryParams: VerifyQuery = {
      secret: this.recaptchaKey,
      response: token,
      remoteip,
    };
    try {
      const response = (
        await axios.post<RecaptchaResponse>(
          'https://www.google.com/recaptcha/api/siteverify',
          null,
          {
            params: queryParams,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 2000,
          },
        )
      ).data;

      const challengeTime = new Date(response.challenge_ts).getTime();
      const now = Date.now();

      const diffInMs = now - challengeTime;
      const diffInMinutes = diffInMs / (1000 * 60);

      if (diffInMinutes > 2) {
        throw new TimeoutOrDuplicate();
      }

      if (
        !this.hostnames.includes('*') &&
        !this.hostnames.includes(response.hostname)
      )
        throw new InvalidHostname();

      if (response.success) {
        if (response.score !== undefined && response.score > this.threshold) {
          return true;
        } else if (response.score === undefined) return true;
      }

      if (Array.isArray(response.error_codes)) {
        for (const code of response.error_codes) {
          throwRecaptchaError(code);
        }
      }

      return false;
    } catch (err) {
      if (err instanceof RecaptchaServerError) {
        this.logger.debug(err.message);
      }
      if (err instanceof RecaptchaClientError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        this.logger.error(`Axios error.`, {
          message: err.message,
          stack: err.stack,
        });
      } else this.logger.error(`Unknown error ${err}`);
      return false;
    }
  };
}

export { GoogleRecaptcha };
