# Copy-Paste Prompt: Create On-Demand Reference Guide

Copy the text below and paste it into your AI coding assistant to generate a task-specific reference guide for your Layer 1 on-demand context.

---

**PROMPT BEGINS HERE:**

---

Help me create an on-demand reference guide for a specific task type in my project. This guide will be stored in a `reference/` folder and loaded only when working on this specific type of task.

## What I Need

I want to create a reference guide for: Crete a new API endpoint for a given api resource.

Research best practices and conventions from this resource: https://github.com/zhanymkanov/fastapi-best-practices

## Instructions for Creating the Reference Guide

Create a concise, actionable reference guide following this structure:

### Required Sections:

1. **Title and Purpose**
    - Clear title describing the task type
    - 1-2 sentence explanation of when to use this guide

2. **Overall Pattern/Structure**
    - High-level overview of the approach or pattern
    - Visual representation if applicable (ASCII diagram, folder structure, etc.)
    - 2-3 sentences explaining the pattern

3. **Step-by-Step Instructions**
    - Break down the task into 3-6 clear steps
    - Each step should have:
        - Clear heading describing what to do
        - Code example showing how to do it
        - 3-5 key rules or requirements for that step
    - Use actual code, not placeholders

4. **Quick Checklist**
    - Bulleted markdown checklist summarizing all steps
    - Use checkbox format: `- [ ] Item`
    - Include critical validation or testing steps

### Critical Requirements:

- **Length: 50-200 lines MAXIMUM** - Must be concise and scannable
- **Code-heavy, explanation-light** - Show more than tell
- **No generic advice** - Specific to this task type and codebase
- **Real examples** - Based on best practices from the provided resource
- **Actionable** - A developer should be able to follow it step-by-step

## Process to Follow:

1. **Research the provided link thoroughly:**
    - Extract key patterns and best practices
    - Identify common steps or structure
    - Note specific conventions or anti-patterns
    - Look for code examples to adapt

2. **Analyze my existing codebase (if applicable):**
    - Check if similar patterns already exist
    - Identify naming conventions to match
    - Find existing examples to reference
    - Ensure consistency with global rules (CLAUDE.md)

3. **Create the guide following the structure above:**
    - Start with the overall pattern
    - Break into clear, numbered steps
    - Include code examples for each step
    - End with a quick checklist

4. **Keep it focused:**
    - This guide is for ONE specific task type only
    - Don't include general principles (those belong in CLAUDE.md)
    - Don't duplicate information from global rules
    - Focus on the step-by-step "how" not the "why"

## Output Format:

Save the guide as `reference/{task_type}_guide.md` with:
- Clear section headers (## Step 1: ...)
- Code blocks with proper syntax highlighting
- Minimal explanatory text (let code speak)
- Practical checklist at the end

## Example Task Types:

- Building API endpoints
- Creating React components
- Adding database models
- Writing integration tests
- Implementing authentication
- Creating CLI commands
- Building custom tools for agents
- Setting up background jobs

Start by researching the provided link now and analyzing the codebase for existing patterns. Then create the focused, actionable reference guide.