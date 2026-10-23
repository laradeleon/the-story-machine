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

# Sprint 1 Progress

### Front end testing

We tested the Angular client with **Vitest** and Angular's **TestBed**, running in **jsdom** which is essentially a browser that is a simulation that runs in Node. The backend(HTTP calls) has been mocked using `provideHttpClientTesting()` and `HttpTestingController`. This lets us test and check every request that the webapp sends and controls the response including errors.

#### Unit Tests

These unit tests checks every part of a function on its own, it uses a mocked backend. This helps us know exactly which part is broken in the code.

We tested 3 kinds of units: a service, the pages and a component

- **`story.service.spec.ts`**: We tested on getting data from the backend, made sure that the stories show their correct author, chapters and title and lines.
- **`story-preview.spec.ts`**: This tests the popup that shows a story's detail that is shown in the card. it makes sure the popup opens when a story is clicked and closes when we click outside of it.
- **`landing.spec.ts`**: This tests the homepage of the website, it test to see if the cards show for each story.
- **`reader.spec.ts`**: This test checks the reader page where you read the story. It makes sure the lines pop up 1 by 1 with the speaker's name for dialogue.
- **`app.spec.ts`**: This checks if the webapp starts properly.

#### Integration Tests

These tests check the the different parts of the webapp works together, the backend is mocked. [Here is a link to the est Coverage report for sprint 1](https://github.com/laradeleon/the-story-machine/blob/documentation-testing/docs/sprint-1/test-coverage-report)

**Boundaries we test:**

- **Client and API**: The 'StoryServices' sends requests to the backend,`HttpTestingController` answers them just like the API would. This way we check that the app is sending the right request and it handles the responses along with any error encountered.
- **Router and pages**: This tests the routes that checks that the links are going to the correct places.
- **Component and component**: This tests the story popup works like the real homepage, it checks the opening and closing of it.

**What we test** (`app.integration.spec.ts`):

- **Reading a story from start to end**: We tested this like a user would, go through the entire app. Going to the homepage, clicking a story's link, and clicking till it ends.
- **Opening a story link directly**: We tested by directly opening the story link, so we wouldn't have to go through the homepage. This way a user could jump straight into reading.
- **Backend errors**: These tests send teh backend an error, this way we test that the homepage and reader show the correct error response to it.

### Back end testing

We tested the NestJS API with **ViTest** and Nest's testing module (`@nestjs/testing`), which builds just the parts of the app a test needs. In unit tests the MongoDB models are replaced with mocks, so the tests run without a database and we control exactly what each query returns, including "not found" results and database errors. The end-to-end test uses **supertest** to send real HTTP requests to the whole app.

| Command            | What it runs                                   |
| ------------------ | ---------------------------------------------- |
| `npm test`         | All unit tests once (this is what CI runs)     |
| `npm run test:cov` | The unit tests with a coverage report          |
| `npm run test:e2e` | The end-to-end tests (needs a running MongoDB) |

At the end of Sprint 1 we have **149 unit tests in 17 files**, and all of them pass.

#### Unit Tests

These check each part of the backend on its own, mostly the services (the business logic) and the DTOs (the rules for what a request body may contain).

- **Stories** (`story.service.spec.ts`, `create-story.dto.spec.ts`, `story.entity.spec.ts`): creating a story only when its author exists, listing stories a page at a time with author and status filters, publishing and unpublishing (which sets or clears `publishedAt`), every character getting a `default` emotion, uploading and downloading the story's `.txt` draft, and deleting a story together with its chapters and draft file. The DTO tests check which fields a client may send, for example that `status` and `likeCount` can't be set when creating a story and that two characters can't share a name.
- **Chapters** (`chapter.service.spec.ts`, `create-chapter.dto.spec.ts`): adding a chapter to the end of its story (and taking it back out if saving fails), returning chapters in the agreed story JSON shape, renaming, and deleting a chapter, which moves the later chapters up one place so the reading order has no gaps.
- **Chapter scripts** (`check-script.spec.ts`): the checks a script must pass before it is saved. Each line has exactly one kind (dialogue, prose, choice, background, goto_line or end), `line_id` matches the line's position, every jump and flag points to a real line, and dialogue only uses the story's characters and their emotions.
- **Users** (`user.service.spec.ts`, `create-user.dto.spec.ts`, `user.entity.spec.ts`): registering with a hashed password, rejecting taken emails and usernames with a 409 (case-insensitively, and also when two sign-ups race each other), paging through users and updating profiles. The DTO tests cover the email, username and strong-password rules.
- **Shared pieces** (`src/common`): the response wrapper that puts every reply in `{ success, message, data }`, the error filter that turns every error into the same shape (and hides the details of unexpected errors), the pipe that rejects invalid ids, and the pagination defaults and limits.

#### Contract Tests

The frontend's reader and the backend have to agree on the story JSON format, so we used the two examples from our story JSON documents ("The Lion at the Door" and the sprint 1 Team Beluga example) as test data (`test/fixtures/story-json.ts`). The tests check that both examples pass validation and that a saved chapter comes back **exactly** as the agreed JSON, with no extra or missing fields. If either side's format changes, these tests fail.

#### End-to-End Tests

`test/app.e2e-spec.ts` starts the whole app and sends a real request to the root route (`GET /`), checking the response comes back in the `{ success, message, data }` wrapper. It connects to a real MongoDB, so it isn't part of CI yet (see section 3).

#### Gaps

- The end-to-end tests don't cover the story and chapter routes yet, only the root route.
- The storage service, which saves draft files to Azure Blob Storage, is mocked in the story tests but has no tests of its own.
- There is no minimum coverage that CI enforces.
