---
description: Make agent understand the problem
argument-hint: [hld, output-report]
---

# Prime: Load Project Context

## Objective

Build a comprehensive understanding of the documentation and key files and the guiding principles of the project.

## Process

### 1. Read Core Documentation

- Read CLAUDE.md or similar global rules file
- Read the HLD.md document

### 2. Identify Subcomponent

- Based on the high-level design document, identify the subcomponent you are going to work on based on a standard SLDC process.

### 3. Deep dive in to the Subcomponent and surroundings 
- Ask questions about that component
- Aks question on how this target component interacts with other components
- Look for any open questions
- Identify any missing design decisions
- Research the common patterns and best practices to solve open questions and ask clarifying questions
- Crosscutting concerns such as security, performance, and scalability

### 4. Create Output Report

Provide a concise summary document covering:

#### Project Overview
- Purpose and type of system and the target subcomponent

#### Architecture
- Overall structure and organization
- Key architectural patterns identified
- Key open questions and design decisions
- Any missing or contradicting crosscutting concerns

#### Current State
- Any immediate observations or concerns before moving to the planning stage.

**Make this summary easy to scan - use bullet points and clear headers.**

**This report will be used to guide the planning process. And as context to an AI agent**