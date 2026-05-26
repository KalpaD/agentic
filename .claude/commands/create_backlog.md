---
description: Create backlog from high level design document
argument-hint: [hld]
---

# Prime: Create Project Plan

## Objective

Build a comprehensive backlog of the project based on the high-level design document.

## Process

### 1. Read Core Documentation
- Read CLAUDE.md or similar global rules file
- Read the HLD.md document


### 2. Deep dive in to the High-Level Design Document
- Ask questions using the AskUserQuestion tool about components and their dependencies
- Look for any open questions or gaps in the design think critically about the system
- Identify any missing design decisions and ask clarifying question using AskUserQuestion and make sure we agree before moving forward.
- Research the common patterns and best practices to solve open questions and ask clarifying questions
- Crosscutting concerns such as security, performance, and scalability
- Provide a summary of the high-level design document and verify that with me that we agree.


### 2. Plan Backlog.
- Based on the high-level design document, identify the subcomponents you are going to work on based on a standard SLDC process.
- Categorise those subcomponents into the following categories:
  - Infrastructure
  - Backend
  - Frontend
- Create a backlog item from each subcomponent based on the categorization and present it to me.
- These backlog items must be grouped as a demo able feature. For example, invocable API. Startable backend application with directory structure or loadable react component.
- Make sure I agree with the backlog item before moving forward.


### 4. Create Backlog
- Once I have confirmed the backlog items, use mermaid to create a Requirement Diagram using mermaid digrams of the backlog items.
- The Requirement diagram should show interdependencies between the backlog items which will be used to determine the relative order the backlog items.
- The Requirement diagram should be saved to the `plans` folder.
- Once I have confirmed the backlog items, create a Markdown file for each backlog item and save it to the `stories` folder with unique number and title.
- This is the format of the story Markdown file:
```md

### [Title]

#### Background
This section contains the why, what and how we comes to this story.
For example,
This is the first story of the project, and it creates the foundation for the personal finance application
 monolithic-backed application. It only creates the structure of the application with a dummy API endpoint.

#### User Store
This section contains the user store(s) linked to this ticket
As an engineer working on the PFM application, I want to create a foundation for the application so that I can start working on the rest of the API endpoints.


#### Tasks
This section contains the tasks (technical/nontechnical) that need to be done to complete this story.
It can be implementing an endpoint or creating an architecture decision record or do a spike to understand something that leads to a decision.
For example,
- [ ] Create a directory structure for the application
- [ ] Create a dummy API endpoint


#### Testing and Verification
This section contains how the given story mush be tested and verified that need to be done to complete this story.

- Each service, client, mapping logic needs to have unit tests and list those in the story
- Each integration point needs to have logic needs to have integration tests and list those in the story
- When an API endpoint is created, it needs to have an end-to-end test.
- Integration test and end-to-end tests must be using JSON files for input and output.

#### Dependencies
This section contains the dependencies that need to be done before this story can be completed or anything that is needed to complete this ticket.
For example,
- [ ] Create a repository for the application


#### Open Questions
- Any open questions that need to be answered before this story can be completed?


#### Acceptance Criteria
This section contains the acceptance criteria that need to be met to complete this story.
For example,
- There must be a directory structure for the application
- There must be a dummy API endpoint
- The application must be able to run on the local machine

#### Relative Estimation
This section contains the relative estimation of the story using fibonacci sequence.
For example,
- [ ] 1 point

#### Special Notes
- Anything that needs to call out specifically such as security considerations, performance or scalability considerations.
- If this is missed, that would be detrimental to the project, that needs to be added here.
```
- Once I have confirmed, create a Gnatt chart for the full delivery of the project and save it in the plant directory. Use the relative relative estimation to calculate the delivery time for this chart.

## Confirmation

After creating the plan, confirm:
- ✅ All stories must be created in the stories directory, revalidate that.
- ✅ All stories must be shown on the diagram, revalidate that.
- ✅ Validation all artifacts, all stories, Requirement diagram, and gantt chart are in the correct places.
