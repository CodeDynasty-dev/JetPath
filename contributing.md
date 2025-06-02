
# JetPath  Contributing Guide


Welcome to the JetPath Contributing Guide, and thank you for your interest.

If you would like to contribute to a specific part of the project, check out the following list of contributions that we accept and their corresponding sections that are within this guide:

* Documentation 
  * Go to the `docs` dir
* Bug Fixes
  * Go to source code dir at `src`
* New Features
  * Create a sample of the new feature, and start a discussion  in the community forum.

However, at this time, we do not accept the following contributions:

* Maintenance 

## JetPath overview

The purpose of the JetPath is to streamline your development process while offering flexibility in your choice of runtime environment

## Ground rules

Before contributing, read our [Code of Conduct](https://github.com/CodeDynasty-dev/Jetpath?tab=coc-ov-file) to learn more about our community guidelines and expectations.

## Community engagement

Refer to the following channels to connect with fellow contributors or to stay up-to-date with news about JetPath:

* Join our project contributors on [Discord](https://discord.codedynasty.dev/) 


## Before you start

Before you start contributing, ensure you have the following:
* For developers: The latest version of [Node.js](https://nodejs.org/en/download), [Bon.js](https://bun.sh/), [Deno.js](https://deno.com/).
* For writers: The lastest version of [Node.js](https://nodejs.org/en/download).


## Environment setup

To set up your environment, perform the following actions:

### Developer

1. Fork the Repository

2. Clone your forked repository to your local machine using the command below.

```bash
git clone https://github.com/<yourusername>/JetPath.git
```
Replace `yourusername` with your GitHub username

3. Navigate to the Project Directory

```bash
cd JetPath
```
4. Install Dependencies

```bash
npm install

```
This will download and set up all libraries the project depends on.

5. Create a new branch for your feature or fix
```bash
git checkout -b your-feature-branch
```
6. Start the local server to preview your changes

```bash
npm run dev
```
Open your browser and click the URL shown in the terminal (usually http://localhost:4000).

7. Run the following command to  build the project for production

```bash
npm run compile
```
8. Push your branch to your fork and open a Pull Request to the main repository.
Feel free to ask questions or open an issue if you need help!


### Writers


1. Fork the Repository

2. Clone your forked repository to your computer using the command below. 

```bash
git clone https://github.com/<yourusername>/JetPath.git
```
Replace <yourusername> with your GitHub username
3. Navigate to the Project Directory
```bash
cd JetPath
```
4. Install Dependencies
```bash
npm install

```

5. Create a new branch

```bash
git checkout -b your-feature-branch
```
6. Preview your changes with this command below

```bash
npx docmach 
```
Open your browser and click the URL shown in the terminal (usually http://localhost:4000).
7. Push your branch to your fork and open a Pull Request to the main repository.


### Troubleshoot

If you encounter issues as you set up your environment,
reach out to the team @fridaycandour for development and @NickyShe for documentation.


## Best practices

Our project  uses the [Google Typescript coding style guide](https://github.com/google/gts) as our parent guide for best practices. Reference the guide to familiarize yourself with the best practices we want contributors to follow
### Developers

* Organize your code properly
* Always run your test before pushing any code

### Writers

Read the [Google developers documentation writing style guide](https://developers.google.com/style) to understand the guidelines for writing and formatting documents. The purpose of the style guide is to ensure consistency in the tone, voice, and structure of our documentation.

## Contribution workflow

### Report issues and bugs

To help us improve JetPath, please report any issues or bugs you encounter. Here’s how you can do it:

1. Before creating a new issue, search the issue tracker to see if someone else has already reported the problem.
2. If you can’t find an existing issue, click the **New issue** button and fill out the template provided. Make sure to include:

* A summary the issue in a few words.
* Explain the problem, including any error messages or unexpected behavior.
* List the steps you took that led to the issue.
* Describe what you expected to happen and what actually happened.
* Attach any relevant screenshots or log files if applicable.

3. If relevant, mention your environment for example, operating system, browser, version of JetPath.

4. Apply labels to categorize issues by type for eexample,bug, feature request, documentation.
5. Use priority labels for example, high, medium, low to indicate the urgency of the issue.

6. Use the issue comments to discuss the problem and potential solutions with other contributors.

Following these steps will help us track and resolve issues, ensuring JetPath continues to improve for everyone.

### Commit messages
Here are the types and description of commit messages

| Type     | Description | 
|----------|------------ |
| feat     | New feature |
| fix      | Bug fix     | 
| docs     | Documentation changes |
| chore    | Maintenance / build tasks |
| refactor | Code refactoring without feature change |

Example Commit message

```bash
feat: add support for Deno.js runtime environment detection

fix: resolve issue with npm run compile failing on Windows

docs: update contributing guide with branch naming conventions

chore: upgrade dependencies to latest stable versions

refactor: reorganize src/utils for better modularity

```

### Branch creation

To keep our repository organized and make collaboration easy, please follow these guidelines when creating and naming branches:

Use a consistent prefix to indicate the type of work:

* feature/ for new features

* bugfix/ for bug fixes

* hotfix/ for urgent or critical fixes

* release/ for release preparation

* docs/ for documentation updates

Example: 
```bash
git checkout -b feature/add-user-authentication
git checkout -b bugfix/fix-login-error
git checkout -b docs/update-contributing-guide
git checkout -b release/1.0.0

```
Sticking to these conventions helps everyone quickly understand the purpose of each branch and keeps our workflow efficient

### Pull requests

When your changes are ready, submit a pull request (PR) to propose merging your branch into the main repository. Please follow these steps:

1. Push your branch to your forked repository:

```bash
git push -u origin your-branch-name
```
2. Open a pull request on GitHub: 

* Navigate to the main repository on GitHub.

* Click "Compare & pull request" next to your branch.

* Ensure the base branch is main (or the appropriate target branch).

3. Fill out the pull request template:

* Provide a clear title and description.

* List the main changes and the motivation behind them.

* Reference any related issues by number (e.g., fixes #42).

Pull Request Template Example:
```
## Description
Briefly describe the purpose of this pull request.

## Changes
- List key changes here

## Additional Information
Add any extra context, screenshots, or testing instructions.

## Checklist
- [ ] Tests passed
- [ ] Documentation updated
```
---
 