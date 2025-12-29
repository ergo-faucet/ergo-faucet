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

export class UnexpectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'unexpected Error';
  }
}

export class NotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Not Available Error';
  }
}

export class DuplicateItemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Duplicate Item Error';
  }
}
