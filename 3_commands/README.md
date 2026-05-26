# Commands 

Commands are repeatable prompts. The difference between commands and the global rules and reference guides is that commands
define a specific process. It provides a context as input to the process -> process (a set of steps) -> output (expected results)

Think about this as asking one of your team member to perform a repetitive task.

- Code review 
- Triage and issue
- Fix Pr description
- Commit some code

### 1. Commands are:
- Commands are markdown files containing prompts
- Clear structure: Context (INPUT) → Process (PROCESS) → Output Format (OUTPUT)


### 2. Commands can take arguments

**What it demonstrates:**
- `$1`, `$2` = positional arguments for specific values
- Arguments make commands reusable with different inputs

**Two ways to use arguments:**
- `$1`, `$2`, `$3`, etc. - Individual positional arguments
- `$ARGUMENTS` - All arguments as a single string (alternative approach)

**Usage:** `/fix-issue 123 high`
- `$1` becomes `123` (issue number)
- `$2` becomes `high` (priority)
- Expands to: "Fix issue #123 with priority high following our coding standards..."


### 3. Can execute bash commands

- `!` prefix executes bash commands and loads output into context
- Frontmatter with `allowed-tools` to permit specific commands
- Command output is available before the prompt runs

**Usage:** `/create-commit`
- Runs `git status` and `git diff HEAD` automatically
- Includes the output in context
- Claude creates a commit based on the actual changes

**Key feature:** The `!` makes bash commands run immediately when the command is invoked

```
---
allowed-tools: Bash(git status:*), Bash(git diff:*)
---

Current git status:
!`git status`

Recent changes:
!`git diff HEAD`

Based on the above changes, create a descriptive commit message and commit.
---
```


