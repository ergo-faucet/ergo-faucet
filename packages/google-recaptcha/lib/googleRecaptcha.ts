import {
  protos,
  RecaptchaEnterpriseServiceClient,
} from '@google-cloud/recaptcha-enterprise';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import axios, { AxiosInstance } from 'axios';
import { reCAPTCHAResponse, verifyQuery } from './types';
import { reCaptchaError, throwRecaptchaError } from './googleRecaptchaErrors';

/**
 * Class to handle Google reCAPTCHA verification through different methods.
 *
 * To use the `verifyByGoogleCloudPackage` method, you must:
 * - Link a billing account to your Google Cloud project.
 * - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point
 *   to your service account JSON key file.
 *
 * For more information on service accounts and credentials, see:
 * https://console.cloud.google.com/iam-admin/serviceaccounts
 */
class GooglereCaptcha {
  private static instance: GooglereCaptcha;
  private logger: AbstractLogger;
  private recaptchaKey: string;
  private threshold: number;
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
  public verifyByAPI = async (token: string, remoteip?: string) => {
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
    } catch (err) {
      if (err instanceof reCaptchaError) {
        this.logger.debug(err.message);
        return false;
      }
      if (axios.isAxiosError(err)) {
        this.logger.error(`Axios error.`, {
          message: err.message,
          stack: err.stack,
        });
        throw err;
      }
    }
  };

  /**
   * Verify a reCAPTCHA token using Google Cloud's official RecaptchaEnterpriseServiceClient.
   *
   * This method requires:
   * - A Google Cloud project with billing enabled.
   * - Service account credentials set in the environment variable `GOOGLE_APPLICATION_CREDENTIALS`.
   *
   * It creates an assessment request with the token, site key, and user info, then evaluates
   * the risk score and expected action to determine verification success.
   *
   * @param token - The reCAPTCHA token from client.
   * @param projectID - Google Cloud project ID.
   * @param recaptchaAction - The expected action string to match against the token's action.
   * @param userIpAddress - User's IP address.
   * @param userAgent - User's User-Agent string.
   * @param ja4 - Optional JA3 fingerprint.
   * @param ja3 - Optional JA3S fingerprint.
   * @returns True if verification is successful and score passes threshold, otherwise false.
   */
  public verifyByGoogleCloudPackage = async (
    token: string,
    projectID: string,
    recaptchaAction: string,
    userIpAddress: string,
    userAgent: string,
    ja4?: string,
    ja3?: string,
  ) => {
    const client = new RecaptchaEnterpriseServiceClient();
    const projectPath = client.projectPath(projectID);
    const request: protos.google.cloud.recaptchaenterprise.v1.ICreateAssessmentRequest =
      {
        assessment: {
          event: {
            token: token,
            siteKey: this.recaptchaKey,
            userIpAddress: userIpAddress,
            userAgent: userAgent,
            ja4: ja4,
            ja3: ja3,
          },
        },
        parent: projectPath,
      };
    const [response] = await client.createAssessment(request);

    client.close();
    // Check if the token is valid.
    if (!response.tokenProperties?.valid) {
      this.logger.debug(
        'The CreateAssessment call failed because the token was: ' +
          response.tokenProperties?.invalidReason,
      );

      return false;
    }

    // Check if the expected action was executed.
    // The `action` property is set by user client in the
    // grecaptcha.enterprise.execute() method.
    if (response.tokenProperties.action === recaptchaAction) {
      // Get the risk score and the reason(s).
      // For more information on interpreting the assessment,
      // see: https://cloud.google.com/recaptcha/docs/interpret-assessment
      this.logger.debug(
        'The reCAPTCHA score is: ' + response.riskAnalysis?.score,
      );

      response.riskAnalysis?.reasons?.forEach((reason) => {
        this.logger.debug(JSON.stringify(reason));
      });

      if (
        response.riskAnalysis?.score !== undefined &&
        response.riskAnalysis.score !== null &&
        response.riskAnalysis.score > this.threshold
      )
        return true;
      else return false;
    } else {
      this.logger.debug(
        'The action attribute in your reCAPTCHA tag ' +
          'does not match the action you are expecting to score',
      );
      return false;
    }
  };
}

export { GooglereCaptcha };
