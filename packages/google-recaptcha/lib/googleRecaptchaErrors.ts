export class reCaptchaServerError extends Error {
  public constructor(message?: string) {
    super(message);
  }
}

export class reCaptchaClientError extends Error {
  public constructor(message?: string) {
    super(message);
  }
}

export class MissingInputSecret extends reCaptchaServerError {
  public constructor() {
    super('The secret parameter is missing.');
    this.name = 'missing-input-secret';
  }
}

export class InvalidInputSecret extends reCaptchaServerError {
  public constructor() {
    super(`'The secret parameter is invalid or malformed.`);
    this.name = 'invalid-input-secret';
  }
}

export class MissingToken extends reCaptchaClientError {
  public constructor() {
    super('The reCAPTCHA token parameter is missing.');
    this.name = 'missing-input-response';
  }
}

export class InvalidToken extends reCaptchaClientError {
  public constructor() {
    super(`The reCAPTCHA token (response parameter) is invalid or malformed.`);
    this.name = 'invalid-input-response';
  }
}

export class BadRequest extends reCaptchaServerError {
  public constructor() {
    super(`The request is invalid or malformed.`);
    this.name = 'bad-request';
  }
}

export class TimeoutOrDuplicate extends reCaptchaClientError {
  public constructor() {
    super(
      `The reCAPTCHA token is no longer valid: either is too old or has been used previously.`,
    );
    this.name = 'timeout-or-duplicate';
  }
}

export const throwRecaptchaError = (code: string) => {
  switch (code) {
    case 'missing-input-secret':
      throw new MissingInputSecret();
    case 'invalid-input-secret':
      throw new InvalidInputSecret();
    case 'missing-input-response':
      throw new MissingToken();
    case 'invalid-input-response':
      throw new InvalidToken();
    case 'bad-request':
      throw new BadRequest();
    case 'timeout-or-duplicate':
      throw new TimeoutOrDuplicate();
    default:
      throw new Error(`Unknown reCAPTCHA error code: ${code}`);
  }
};
