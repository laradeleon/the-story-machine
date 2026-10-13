# The Story Machine

The Story Machine is a platform where anyone can write, publish, read, and discuss interactive stories in which readers shape the story through their choices, bringing authors and readers together in one community.

This repository contains the client application built with Angular. The server application, built with NestJS and MongoDB, lives in a [separate repository](https://github.com/nifemi-cd/the-story-machine).

## Documentation

- [Vision Statement](./docs/sprint-0/vision.md)

## Deliverables

- [Sprint 0](./docs/sprint-0/sprint0.md)

## Running Locally

### Prerequisites

Make sure the following tools are installed:

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) **v26.x**

Verify your installation:

```bash
node -v
git --version
```

`node -v` should output a version beginning with `v26`.

### Clone the Repository

```bash
git clone https://github.com/laradeleon/the-story-machine.git
cd the-story-machine
npm ci
```

`npm ci` installs the exact dependency versions defined in `package-lock.json`. This ensures we're all running the same project setup.

You may see warnings starting with `npm warn install-scripts` at the end of the output. These are harmless and everything still installs and runs normally.

### Start the Development Server

```bash
npm start
```

Once the application has finished compiling, open:

<http://localhost:4200>

To stop the development server, press `Ctrl + C` in the terminal.

### Run the Tests

```bash
npm run test:ci
```

## Group Members

- Lara De Leon
- Carsten Kolynchuk
- Colin Leger
- Arthur McMullen
- Krupal Patel
- Adejare Taiwo
- Oluwanifemi Tawoju
