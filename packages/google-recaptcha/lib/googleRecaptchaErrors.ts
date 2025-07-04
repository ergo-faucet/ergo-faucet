export class reCaptchaError extends Error {
  public constructor(message?: string) {
    super(message);
  }
}

export class MissingInputSecret extends reCaptchaError {
  public constructor() {
    super('The secret parameter is missing.');
    this.name = 'missing-input-secret';
  }
}

export class InvalidInputSecret extends reCaptchaError {
  public constructor(secret: string) {
    super(`'The secret parameter: ${secret} is invalid or malformed.`);
    this.name = 'invalid-input-secret';
  }
}

export class MissingInputResponse extends reCaptchaError {
  public constructor() {
    super('The response parameter is missing.');
    this.name = 'missing-input-response';
  }
}

export class InvalidInputResponse extends reCaptchaError {
  public constructor(response: string) {
    super(`The response parameter: ${response} is invalid or malformed.`);
    this.name = 'invalid-input-response';
  }
}

export class BadRequest extends reCaptchaError {
  public constructor() {
    super(`The request is invalid or malformed.`);
    this.name = 'bad-request';
  }
}

export class TimeoutOrDuplicate extends reCaptchaError {
  public constructor() {
    super(
      `The response is no longer valid: either is too old or has been used previously.`,
    );
    this.name = 'timeout-or-duplicate';
  }
}

export const throwRecaptchaError = (
  code: string,
  context: { secret: string; response: string },
) => {
  switch (code) {
    case 'missing-input-secret':
      throw new MissingInputSecret();
    case 'invalid-input-secret':
      throw new InvalidInputSecret(context.secret);
    case 'missing-input-response':
      throw new MissingInputResponse();
    case 'invalid-input-response':
      throw new InvalidInputResponse(context.response);
    case 'bad-request':
      throw new BadRequest();
    case 'timeout-or-duplicate':
      throw new TimeoutOrDuplicate();
    default:
      throw new Error(`Unknown reCAPTCHA error code: ${code}`);
  }
};
