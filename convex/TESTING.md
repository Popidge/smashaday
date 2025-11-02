# Convex Testing

This directory contains tests for Convex functions using the `convex-test` library and Vitest.

## Running Tests

- `pnpm test` - Run tests in watch mode
- `pnpm test:once` - Run tests once
- `pnpm test:debug` - Run tests in debug mode
- `pnpm test:coverage` - Run tests with coverage report

## Writing Tests

Create test files ending in `.test.ts` in the `convex/` directory.

Use the `convexTest` function to create a test harness with your schema:

```typescript
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("my test", async () => {
  const t = convexTest(schema);

  // Call mutations
  await t.mutation(api.someMutation, { arg: "value" });

  // Call queries
  const result = await t.query(api.someQuery, { arg: "value" });

  // Assert results
  expect(result).toEqual(expected);
});
```

See the example code above for how to structure tests.

## Known Issues

- **Cannot find "_generated" directory**: The `convex-test` library currently fails to locate the generated API files. This appears to be a compatibility issue with pnpm's node_modules structure and the expected location of the _generated convex code. There is an open PR on the library to fix - when fixed, I will implement convex tests.

## Notes

- Tests run in an edge runtime environment to match Convex's execution context.
- The schema is required for proper validation and typing.
- Use `t.runMutation` and `t.query` to exercise your functions.