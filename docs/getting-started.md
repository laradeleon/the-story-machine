# Getting Started

This is a rundown of the current project environment and how development will work. If you only want to do the setup and run the app, the [README](../README.md) should be enough.

---

## 1. How an Angular project is organized

An Angular project comes with a lot of files but we'll really only ever work in a small part of it. I've grouped everything below based on how much you would need to care about it.

### Where you'll work

| File / folder    | What it is                                                                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`       | **This is where our application code goes.** Every page, component and service we build goes in here (in its own folder). This is where you'll likely spend almost all your time.                                                                                                             |
| `src/styles.css` | This is for global styles that apply to the **whole** app, e.g. fonts and colours. If it's a style for one specific component, then it would go in that component's own `.css` file instead.                                                                                                  |
| `public/`        | Files that are part of **the website itself**, such as the favicon, our logo, UI icons, or a default cover image for stories without one. **This is not where story content goes.** Any images and audio that authors would upload for their stories are stored by the back end, not in here. |
| `docs/`          | All of our project documentation and any sprint deliverables.                                                                                                                                                                                                                                 |

### Edit occasionally and only when you know why

These files configure the project. We will rarely need to change them, and if you were to, please mention it in your PR.

| File / folder                  | What it is                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`                 | This just lists the packages the project uses and defines the commands (`npm start`, `npm test`, etc.). It changes automatically when you `npm install` a package. |
| `angular.json`                 | Angular's settings for building, serving and testing the app.                                                                                                      |
| `eslint.config.js`             | The rules the linter checks our code against.                                                                                                                      |
| `.prettierrc`, `.editorconfig` | Formatting rules (indentation, quotes, line width). Prettier applies them for you.                                                                                 |
| `.prettierignore`              | Files Prettier should leave alone.                                                                                                                                 |
| `.github/workflows/ci.yml`     | The automated checks GitHub runs on every pull request.                                                                                                            |
| `.husky/pre-commit`            | The checks that run on your computer every time you `git commit`.                                                                                                  |
| `.nvmrc`                       | The Node version we use (26).                                                                                                                                      |

### Don't touch

These are either generated automatically or are boilerplate that Angular needs and that we won't change.

| File / folder                                              | What it is                                                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `package-lock.json`                                        | The exact version of every installed package. npm manages it so don't edit it by hand but **do** commit it when it changes. |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json` | TypeScript compiler settings for the project, the app and the tests. This is generated by Angular.                          |
| `.vscode/`                                                 | Shared VS Code settings and recommended extensions.                                                                         |
| `node_modules/`                                            | All the installed packages. Created by `npm ci`. Git ignored.                                                               |
| `dist/`                                                    | The built app. Created by `npm run build`. Git ignored.                                                                     |
| `.angular/`                                                | Angular's build cache, which makes rebuilds faster. Git ignored.                                                            |

The last three folders aren't in the repo at all. They'll only exist on your machine.

### Inside `src/`

`src/` contains a few files that start the app, and the `app/` folder where our code lives.

```
src/
├── index.html    - the one HTML page the browser loads. Angular puts the whole app inside it.
├── main.ts       - starts the app. You won't need to touch this.
├── styles.css    - global styles (see what I mentioned above)
└── app/          - our code
    ├── app.ts          ┐
    ├── app.html        │ the App component: the outer shell around every page
    ├── app.css         │ e.g. where a nav bar would go. Its .ts, .html and .css files and its tests (.spec.ts)
    ├── app.spec.ts     ┘
    ├── app.routes.ts   - which page to show for each URL, e.g. /login shows the login page
    └── app.config.ts   - app wide setup, like turning on routing. Rarely changes.
```

You'll see there's a pattern in `app.ts`, `app.html`, `app.css` and `app.spec.ts`. Every component we build will have these same four files:

- logic (**.ts**)
- markup (**.html**)
- styles (**.css**)
- tests (**.spec.ts**)

grouped in its own folder inside `src/app/`.

---

## 2. Command reference

### Running and building

| Command               | What it does                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `npm start`           | Starts the dev server at http://localhost:4200 with live reload.                                   |
| `npm start -- --open` | Same as above but this also opens the browser for you.                                             |
| `npm run build`       | Creates an optimized production build in `dist/`. Useful to confirm nothing is broken before a PR. |

### Testing

| Command           | What it does                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `npm test`        | Runs the unit and integration tests in watch mode, so they rerun every time you save.                     |
| `npm run test:ci` | Runs all unit and integration tests once and exits. Use this before opening a PR. It's also what CI runs. |

See [3. Testing](#3-testing) for which tools we'll use.

### Code quality

| Command                | What it does                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `npm run lint`         | Checks all `.ts` and `.html` files for bugs and common Angular mistakes. |
| `npm run format`       | Formats every file to match our rules in `.prettierrc`.                  |
| `npm run format:check` | Lists files that aren't formatted properly without changing them.        |

These will run automatically, so you will not need to manually call them. See [4. Code quality and CI/CD](#4-code-quality-and-cicd) for _when_ they do run automatically.

---

## 3. Testing

This is just a breakdown of how the three kinds of tests we need to write fit into the project.

### What we use

| Kind            | Tool                         |
| --------------- | ---------------------------- |
| **Unit**        | Vitest + Angular's `TestBed` |
| **Integration** | Vitest + Angular's `TestBed` |
| **Acceptance**  | Playwright (not set up yet)  |

- **Vitest** is our test runner. It will find all our test files (anything ending in `.spec.ts`), runs every test in them, and reports which passed and which failed. It's what `npm test` starts.
  - It's also already installed so there's nothing to set up.
- **`TestBed`** is Angular's own testing helper so it's built into Angular.
- **Playwright** opens a real browser and clicks through the app like a user would, and checks what's on screen.
  - This what we'll use for acceptance tests as Vitest isn't designed for this.
  - **This isn't installed yet.** We'll add it once there are real pages to test.

### Where tests go

Unit and integration tests live **next to the code they test**, i.e., in the same folder.

---

## 4. Code quality and CI/CD

This section lists the tools set up in this project to keep our code consistent and working.

### What's installed

| Tool                            | What it does                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ESLint** (via angular-eslint) | A **linter** that reads our code and flags likely bugs and bad practices, such as unused variables or Angular specific mistakes in templates. Rules are in `eslint.config.js`. |
| **Prettier**                    | A **formatter**. This just rewrites code to a consistent style (indentation, quotes, line length). Rules are in `.prettierrc`.                                                 |
| **Husky**                       | Runs a script automatically every time you `git commit` (a "pre-commit hook"). Ours is in `.husky/pre-commit`.                                                                 |
| **lint-staged**                 | Used by the Husky hook to run ESLint and Prettier on **only the files you're committing** so its fast. Its settings are under `"lint-staged"` in `package.json`.               |
| **GitHub Actions**              | Runs our full set of checks on GitHub's servers for every pull request. The steps are in `.github/workflows/ci.yml`.                                                           |

### Do I need to set any of this up?

**Not for the linter, formatter, hook or CI.** As long as you've done the setup in the [README](../README.md), you already have them. They're project dependencies, so the `npm ci` step installed them along with everything else and turned on the Husky hook automatically. GitHub Actions runs on GitHub, so there's nothing to install for it at all.

**Optional VS Code extensions.** These extensions I've listed below show problems and fix formatting _as you type_, instead of only when you commit, which is helpful for catching things early. VS Code should suggest them when you open the project as I've also got them listed in `.vscode/extensions.json`.

- **Prettier - Code formatter** (`esbenp.prettier-vscode`): after installing it, turn on **Format On Save** in VS Code's settings and choose Prettier as the default formatter.
- **ESLint** (`dbaeumer.vscode-eslint`): underlines lint problems in the editor as you type.

### When do these checks run

**1. When you commit (on your computer).** Everytime you `git commit`, it triggers the pre-commit hook, which runs on the files you're committing:

- `.ts` and `.html` files: ESLint fixes what it can, then Prettier formats them.
- `.css`, `.scss`, `.json` and `.md` files: Prettier formats them.

What you'll see:

- **It passes:** a few lines of output in the terminal (or a short pause in VS Code), and the commit goes through. Any formatting fixes are automatically included in the commit.
- **ESLint finds a problem it can't fix:** the commit is **stopped**, and the problem is printed with its file and line number. Fix it, `git add` the file again, and commit again.

**2. When you open or update a pull request (on GitHub).** For every PR into `develop`, `staging` or `main`, and every merge into those branches, GitHub Actions runs these checks in order:

1. `npm ci`: installs everything fresh, on Node 26 (from `.nvmrc`)
2. `npm run lint`: no lint errors
3. `npm run format:check`: every file is formatted
4. `npm run test:ci`: all unit and integration tests pass
5. `npm run build`: the app builds
6. `npm audit`: no security problems in the packages that ship to users

What you'll see:

- At the bottom of the PR, a check called **Lint, test and build** with a check or an 'X'.
- If it fails, click **Details** to see which step failed and the error. Fix it, commit and push, and the checks re-run automatically.
- **A PR can't be merged until this check passes.**

### Deployment (CD)?

Automatic deployment isn't set up yet. Once our Azure hosting is ready, merging into `main` will automatically publish the live site. This section will be updated then.
