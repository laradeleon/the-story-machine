# Testing 

## Testing Strategy

We add test after writing our code. Unit tests for any logic, integration tests where systems have boundaries. And run tests automatically and frequently.

## How we test

Our frontend tests use **Vitest**, run through Angular's test runner (`ng test`). The tests run in a simulated browser (**jsdom**), so no real browser is needed. The backend is never called during tests: we replace it with fake responses, so the tests are fast and give the same result every time.

**Running the tests**

- `npm test`: runs the tests and re-runs them whenever a file is saved (useful while working).
- `npm run test:ci`: runs every test once and stops. This is what our CI uses.

Generate a coverage report with:
- `npx ng test --coverage --watch=false`

