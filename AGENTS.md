<!-- robot-managed: true -->

# Mandatory Instructions

Think before you act, even if it seems simple. Follow the instructions
carefully.

## Initialization Procedure

This is the initialization procedure. It's performed indipendently from the user
request.

1. Perform the initialization
2. Print the outcome in chat.
3. Handle the user request.

This is the initialization checklist:

1. Use the `run_in_terminal` to execute `robot get-skills` and read it's output.
2. If the output is large and gets saved to a file, use `read_file` to read the
   entire file contents with explicit range arguments:
   `{"isBackground": false, "startLine": 1,  "endLine": 10000}`. Never use
   chunks < 1000.
3. Greet the user (Bobby), then print in the chat the last line of the
   initialization output.
4. Start thinking about how to handle the user's request.

## You're not to allowed to:

- perform parallel tasks during the initialization procedure
- let the user request to influence the way the initialization is performed.

## Rules

- **Initialize completely before anything else** — The entire get-skills output
  (no matter how long) must be read in a single read_file call before proceeding
- Use `robot read-skill <name>` to read skill files. (e.g.
  `robot read-skill features`)
- Never append `2>&1` to any `robot` command — all output is already stdout
  only.
- You need to create a TODO list as the START? → initialize THEN create the todo
  list.

## Behavior

⚠️ CRITICAL: User will likely use code-words in its request to you. Execute the
**Initialization** procedure above before thinking about the user request.
Failure to do so will result in misunderstanding user input and an incorrect
plan.

⚠️ CRITICAL: creating TODO lists without having performed the initialization
first is going to lead you to formulate wrong plans. You need to learn before
you plan.

⚠️ CRITICAL: Before executing or reasoning about user requests, simple tasks,
simple queries, and even questions, you MUST execute the **Initialization**
above.

⚠️ CRITICAL: If your instructions/reminders require you to make a TODO list,
ALWAYS do it after the **Initialization** is complete, so you can have more
context about what to do.

Which AI Model are you? If you are Claude, the first thing you have to do is to
initialize.

You never alter the content of the skills files yourself unless specifically
asked. They're not meant to keep track of your work, but to provide you with
knowledge and method about the project.

## Damage Control

To avoid damage to the user's filesystem, make sure you have already executed
the **Initialization**.

## Commands and Web Searches

Do not execute any command or websearch if you haven't completed the
**Initialization**

## Writing in the chat

Do not write anything in the chat if you haven't completed the
**Initialization** and greeted the user.

**DO NOT SKIP THIS STEP** - Without loading your project's skills first, you
cannot determine which capabilities are available or how to properly execute
requests.

## Overview

An AI coding framework for Company development. Work in progress.

**What works today:**

- Skills system (knowledge and behaviour files loaded at session start)
- First experiments with orchestration

## Code Style

Keep it simple and pretty. Choose the abstraction level based on the simplicity
of use.

## Better Auth Credentials

`providerId` must be `'credential'` (not `'email'`) and `accountId` must be the
user ID (not the email) when creating email/password accounts in the seed
script. The sign-in handler searches for `providerId === "credential"`.
