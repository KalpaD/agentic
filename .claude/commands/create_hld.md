---
description: Create a high-level design document (HLD)
argument-hint: [hld-template]
---

# Prime: Create Project Context

## Objective
You are a solution architect at a startup that is building a personal finance application.
Build a comprehensive High Level Design (HLD) document that provides a high-level overview of the project and its architecture.

## Process

### 1. Read Core Documentation
- Read CLAUDE.md to understand the global level principles for the system and project.
- Read the hld_template.md document

### 2. Understand the Problem and Project Scope

Problem statement:
- The key problem you solve is to make an easy way to manager the personal finances of an individual by providng seamless web UI interface to record transactions
- The features are as follows:
    - Ability to register the application via email and password
    - Ability to log in to the application
    - Create a new user account
    - View all transactions for a user account
    - Ability to filter transactions by date
    - Add a new transaction to an account
    - Categorize a transaction (ex: groceries, rent, utilities)
    - Edit a transaction category
    - Delete an account
    - Delete a transaction
    - Edit a transaction
- For the MVP these are all the features that are required.
- This needs to be a scalable system that can be easily extended to support more features.
- This needs to be deployable on AWS using terraform.

### 3. Deep dive in to the feature and overall system 
- Ask questions about features
- Ask question on how this feature works, to cut of the guesswork and ambiguity
- Look for any open questions
- Identify any design decisions
- Research the common patterns and best practices to solve open questions and ask clarifying questions
- Crosscutting concerns such as security, performance, and scalability
- Pay close attention to each segment of the high-level design, ask questions to clarify, and make sure all those are answered.
- When it is unclear, mark that for a followup with and ADR and create a placeholder for that Architecture decision record.

### 4. Create HLD

- Create a high-level design document (HLD) according to the $ARGUMENT template and save it as hld.md.
- Draw diagrams to illustrate the architecture using C4 plant uml notations.
- Lay out the assumptions and dependencies between the components.
- Pay close attention to each segment of the high-level design document and make sure it is clear and concise and completed.