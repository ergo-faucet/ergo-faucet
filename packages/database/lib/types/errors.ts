export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Not Found Error';
  }
}

export class CooldownLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Cooldown error';
  }
}
