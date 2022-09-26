import { MiddlewareRegistry } from "@identity.com/cryptid-core";

export * from "@identity.com/cryptid-core";
export * from "@identity.com/cryptid-middleware-check-pass";
import {
  CheckPassMiddleware,
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-check-pass";

import {
  TimeDelayMiddleware,
  TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-time-delay";

MiddlewareRegistry.get().register(
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
  new CheckPassMiddleware()
);

MiddlewareRegistry.get().register(
  TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
  new TimeDelayMiddleware()
);
