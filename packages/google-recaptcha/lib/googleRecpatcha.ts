import {
  protos,
  RecaptchaEnterpriseServiceClient,
} from '@google-cloud/recaptcha-enterprise';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

class GooglereCaptcha {
  private static instance: GooglereCaptcha;
  private logger: AbstractLogger;
  private client: RecaptchaEnterpriseServiceClient;
  private projectPath: string;
  private recaptchaKey: string;
  private threshold: number;

  private constructor(
    projectID: string,
    recaptchaKey: string,
    threshold: number = 0.5,
    logger?: AbstractLogger,
  ) {
    this.client = new RecaptchaEnterpriseServiceClient();
    this.projectPath = this.client.projectPath(projectID);
    this.recaptchaKey = recaptchaKey;
    this.threshold = threshold;
    this.logger = logger ? logger : new DummyLogger();
  }

  public static getInstance = (): GooglereCaptcha => {
    if (!this.instance) {
      throw new Error('GooglereCaptcha instance has not been initialized.');
    }
    return GooglereCaptcha.instance;
  };

  public static initialize = async (
    projectID: string,
    recaptchaKey: string,
    threshold: number = 0.5,
    logger?: AbstractLogger,
  ) => {
    if (!this.instance) {
      this.instance = new GooglereCaptcha(
        projectID,
        recaptchaKey,
        threshold,
        logger,
      );
    }
  };

  public verify = async (
    token: string,
    recaptchaAction: string,
    userIpAddress: string,
    userAgent: string,
    ja4?: string,
    ja3?: string,
  ) => {
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
        parent: this.projectPath,
      };
    const [response] = await this.client.createAssessment(request);

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
        response.riskAnalysis.score < this.threshold
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
