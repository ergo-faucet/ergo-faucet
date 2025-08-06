export class NotEnoughAssetsError extends Error {
  /**
   * Constructs the error with details.
   * @param details - The details about the failure.
   */
  constructor(details: string) {
    super(`Not Enough Assets error : ${details}`);
    this.name = 'NotEnoughAssets';
  }
}
