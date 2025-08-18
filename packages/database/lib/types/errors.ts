export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Not Found Error';
  }
}

export class RequestLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Request Limit Error';
  }
}
