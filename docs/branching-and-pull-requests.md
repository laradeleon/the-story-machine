# Branches and Pull Requests

Some of this is enforced by a GitHub ruleset on the repo.

---

## 1. Our branches

| Branch          | What it's for                                                                                        | Push to it directly?                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `main`          | The finished and working version of the app.                                                         | **No.** Changes should come through a pull request and only from `staging`.  |
| `staging`       | A final check before `main`. Work from `develop` is collected here and checked before it's released. | **No.** Changes should come through a pull request and only from `develop`.  |
| `develop`       | Where everyone's finished work comes together. This is the **default branch**.                       | **No.** Changes should come through a pull request and from your own branch. |
| Your own branch | Where you do your work, one branch per task.                                                         | **Yes.** Push as often as you like.                                          |

Changes will go in this direction:

```
your branch -> develop -> staging -> main
```

**Nothing on GitHub enforces this order.** The ruleset requires a pull request into `develop`, `staging` and `main`, but it doesn't check which branch that pull request comes from, so it's technically possible to open a PR from your own branch straight into `main`. Try to follow the flow above, so that `staging` and `main` only ever get work that has already been through `develop`.

---

## 2. Rules on `develop`, `staging` and `main`

As mentioned, this repository has a ruleset which applies to `develop`, `staging` and `main`. You can see it at <https://github.com/laradeleon/the-story-machine/rules>.

Everything in the table below is **enforced by GitHub**: if you try to break one of these rules, GitHub refuses. The branch order from section 1 is **not** in this table, because it can't be enforced so it's up to us to follow that one.

| Rule                      | What it means for you                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pull request required** | You can't push commits straight to these branches. If you try, GitHub rejects the push.                                                                                            |
| **CI must pass**          | A pull request can't be merged until the **Lint, test and build** check passes. See [Getting Started, section 4](./getting-started.md#4-code-quality-and-cicd) for what it checks. |
| **No force pushes**       | Nobody can rewrite the history of these branches (`git push --force`).                                                                                                             |
| **No deleting**           | These branches (develop, staging and main) can't be deleted.                                                                                                                       |
| **Approvals**             | At least one person has to approve your pull request once CI passes.                                                                                                               |

---

## 3. Making a change, step by step

This is likely redundant for all of us, but worth mentioning anyway.

**1. Start from the latest `develop`.**

```bash
git checkout develop
git pull
```

**2. Create a branch for your task.**

```bash
git checkout -b feature/story-card
```

Name it `<type>/<short-description>`, using lowercase and dashes:

| Prefix     | Use it for                              | Example                 |
| ---------- | --------------------------------------- | ----------------------- |
| `feature/` | New functionality, usually a user story | `feature/story-browse`  |
| `fix/`     | Fixing a bug                            | `fix/choice-not-saving` |
| `docs/`    | Documentation only                      | `docs/update-readme`    |
| `setup/`   | Tooling and configuration               | `setup/playwright`      |

**3. Commit as you go.**

```bash
git add .
git commit -m "Add story card component"
```

Each commit runs the pre-commit hook, which formats your files and checks them for lint errors. If it stops the commit, fix the error it prints, `git add` the file again, and commit again.

**4. Push your branch.**

```bash
git push -u origin feature/story-card
```

**5. Open a pull request into `develop`.**

On GitHub, click **Compare & pull request**. Confirm that the base branch is `develop`.

- If it completes a user story, write `Closes #<issue number>` in the description, e.g. `Closes #26`. The issue then closes automatically when the pull request is merged.

**6. Wait for CI.**

The **Lint, test and build** check runs automatically and takes a minute or two. If it fails, click **Details** to see why, fix it on your branch, commit and push. The check re-runs on its own.

**7. Merge.**

Once the check passes, the **Merge pull request** button becomes available. After merging, you can delete your branch on GitHub.

---

## 4. Moving work from `develop` to `staging` to `main`

This works the same way as step 5, but between the shared branches:

1. Open a pull request from `develop` into `staging`. CI runs, and once it passes, merge it.
2. Check that everything works together on `staging`.
3. Open a pull request from `staging` into `main`. CI runs again, and once it passes, merge it.

This will likely only happen when we agree that the work is ready to release, e.g. at the end of a sprint.
