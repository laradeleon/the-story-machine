# Sprint 1

## 1 Sprint Summary

## 2 Testing Status

### Front end testing

We tested the Angular client with **Vitest** and Angular's **TestBed**, running in **jsdom** which is essentially a browser that is a simulation that runs in Node. The backend(HTTP calls) has been mocked using `provideHttpClientTesting()` and `HttpTestingController`. This lets us test and check every request that the webapp sends and controls the response including errors.

#### Unit Tests

These unit tests checks every part of a function on its own, it uses a mocked backend. This helps us know exactly which part is broken in the code.

We tested 3 kinds of units: a service, the pages and a component

- **`story.service.spec.ts`**: We tested on getting data from the backend, made sure that the stories show their correct author, chapters and title and lines.
- **`story-preview.spec.ts`**: This tests the popup that shows a story's detail that is shown in the card. it makes sure the popup opens when a story is clicked and closes when we click outside of it.
- **`landing.spec.ts`**: This tests the homepage of the website, it test to see if the cards show for each story.
- **`reader.spec.ts`**: THis test checks the reader page where you read the story. It makes sure the lines pop up 1 by 1 with the speaker's name for dialogue.
- **`app.spec.ts`**: This checks if the webapp starts properly.

#### Integration Tests

These tests check the the different parts of the webapp works together, the backend is mocked.

**Boundaries we test:**

- **Client and API**: The 'StoryServices' sends requests to the backend,`HttpTestingController` answers them just like the API would. This way we check that the app is sending the right rewuest and it handles the responses along with any error encountered.
- **Router and pages**: THis tests the routes that checks that the links are going to the correct places.
- **Component and component**: This tests the story popup works like the real homepage, it checks the opening and closing of it.

**What we test** (`app.integration.spec.ts`):

- **Reading a story from start to end**: We tested this like a user would, go through the entire app. Going to the homepage, clicking a story's link, and clicking till it ends.
- **Opening a story link directly**: We tested by directly opening the story link, so we woudn't have to go through the homepage. THis way a user could jump straight into reading.
- **Backend errors**: These tests send teh backend an error, this way we test that the homepage and reader show the correct error response to it.

## 3 CI Status

While we've split up our project across two repositories, both of them have CI set up the same way:

| Repository | CI workflow                                                                                                         | Run history                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Frontend   | [`.github/workflows/ci.yml`](https://github.com/laradeleon/the-story-machine/blob/develop/.github/workflows/ci.yml) | [Actions](https://github.com/laradeleon/the-story-machine/actions/workflows/ci.yml) |
| Backend    | [`.github/workflows/ci.yml`](https://github.com/nifemi-cd/the-story-machine/blob/develop/.github/workflows/ci.yml)  | [Actions](https://github.com/nifemi-cd/the-story-machine/actions/workflows/ci.yml)  |

In both repositories, we check our code at two points: on our own machines when we commit and also on GitHub when we open a PR.

#### 1. Before every commit (Husky)

When any of us runs `git commit`, a pre-commit hook runs automatically on our own machine. We set this up with Husky and lint-staged (the hook is in `.husky/pre-commit` and its settings are under `"lint-staged"` in `package.json`). It only looks at the files being committed, runs our linter over them and formats them with **Prettier**.

#### 2. On pull requests (GitHub Actions)

On GitHub Actions, each repository has a workflow called **CI**. It runs whenever one of us opens or updates a pull request into `develop`, `staging` or `main`, and again whenever something is pushed or merged into those branches. It checks the whole project in this order:

1. **Install** (`npm ci`): installs the package versions in `package-lock.json`.
2. **Lint** (`npm run lint` / `npm run lint:ci`)
3. **Format check** (`npm run format:check`): makes sure the code follows our Prettier style.
4. **Unit tests**: runs all our Vitest tests once.
5. **Build** (`npm run build`): makes sure the project actually compiles.
6. **Security audit** (`npm audit --omit=dev --audit-level=high`): fails if a package that ships to users has a vulnerability.

**Why this trigger:** we picked **pull requests** because that's where we review each other's work, so every change gets checked before it's merged into a shared branch. It also runs on **pushes to the shared branches**, so we know `develop`, `staging` and `main` stay working after a merge. We chose not to run it on every push to our personal branches since the pre-commit hook already covers that work.

**Why both the hook and CI:** the commit hook is fast and lets us catch problems early, however, it can be skipped. For example, editing a file directly on GitHub's website doesn't run it. So the GitHub Actions CI is our other safety net that checks everything.

**As the pipeline matures:** we plan to add some more checks:

- **Coverage threshold:** make CI fail if test coverage drops below a set percentage
- **End-to-end tests in CI:** add a step that runs the backend's end-to-end tests (`npm run test:e2e`), which aren't part of CI yet, and a frontend job that runs browser tests (through Playwright for example)

## 4 API Documentation

## 5 Architecture

## 6 Deployment

## 7 Reflection

As a group, we are proud of the progress that we made for Sprint 1, and the feature that we are particularly proud of is the story reading feature. It’s one of our primary user facing features and its development also heavily depended on the parser, which we identified as a major bottleneck early on since a lot of our project’s functionality relied on it being completed first. Being able to complete the reader and the parser represents significant progress for our Sprint 1 and gives us a strong foundation to work on for Sprint 2.

One area that could have been improved was the writing feature. We underestimated the amount of effort that it would require to learn, integrate and build around CodeMirror, which introduced additional complexity that affected our development time. As a result, we weren’t able to implement the writing functionality to the extent that we had originally envisioned for this sprint. However, despite this challenge, we now have a much better understanding of this process and the remaining work we need to complete and we plan to continue refining and expanding the writing feature for Sprint 2.

Our testing was done primarily after implementation. Our initial focus was on ensuring that our core functionality was working before dedicating time to write tests and fix issues that were discovered during development. Having a more test driven approach may have helped us catch some problems earlier, however our main priority was establishing a functional foundation given the scope of our project and any time constraints. As our project matures, we do expect testing to become a more integrated part of our development process.

Our team working agreement is still valid. While our Git branching strategy was followed somewhat more loosely than we originally planned, we were careful when we were integrating changes and communicated regularly to avoid conflicts. We were responsible when it came to always pulling in the latest changes. Additionally, the repository management and pull request tools we used also provided us with some safeguards to reduce the risk of any major integration problems.

## 8 Known Issues

| Issue                           | Description                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Writing functionality not added | The writer page required much more overhead than expected to be able to start, thus was not included in this sprint |
|                                 |                                                                                                                     |
|                                 |                                                                                                                     |
