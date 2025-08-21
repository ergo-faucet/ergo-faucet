export class NotEnoughAssetsError extends Error {
  constructor(details: string) {
    super(`Not Enough Assets error : ${details}`);
    this.name = 'NotEnoughAssets';
  }
}

export class DoubleSpendError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'DoubleSpendError';
  }
}

export class InvalidTokenPrecisionError extends Error {
  /**
   * Constructs the error with details.
   * @param details - The details about the failure.
   */
  constructor(details: string) {
    super(`Invalid Token Precision error : ${details}`);
    this.name = 'InvalidTokenPrecision';
  }
}
