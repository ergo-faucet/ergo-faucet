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
