import { ContractValidationError } from "./validation";

const idempotencyKeyPattern = /^[A-Za-z0-9._:-]{8,128}$/;

export type OpaqueKeyGenerator = () => string;

function defaultOpaqueKey(): string {
  const time = Date.now().toString(36);
  const randomA = Math.random().toString(36).slice(2);
  const randomB = Math.random().toString(36).slice(2);
  return `trip-${time}-${randomA}-${randomB}`.slice(0, 128);
}

export class SaveIntent {
  private active = true;

  constructor(private readonly idempotencyKey: string) {
    if (!idempotencyKeyPattern.test(idempotencyKey)) {
      throw new ContractValidationError("idempotency key");
    }
  }

  key(): string {
    if (!this.active)
      throw new ContractValidationError("completed save intent");
    return this.idempotencyKey;
  }

  complete(): void {
    this.active = false;
  }
}

export class IdempotencyKeyFactory {
  constructor(
    private readonly generateKey: OpaqueKeyGenerator = defaultOpaqueKey,
  ) {}

  createSaveIntent(): SaveIntent {
    return new SaveIntent(this.generateKey());
  }
}
