# reference/

Hand-built ontology files in [Turtle (.ttl)](https://www.w3.org/TR/turtle/) format. These are the **ground truth** that Step 6 compares the cognee-extracted graph against.

An ontology is a formal vocabulary of types and relationships. The `.ttl` files here define that vocabulary and populate it with real CASA facts.

## Files

### `lesson1_simple.ttl`

A minimal HR toy ontology — the first lesson in the series. Teaches the two-layer structure:
- **Layer 1 (ontology):** declares classes (`Employee`, `Department`) and properties (`worksIn`, `manages`)
- **Layer 2 (instances):** populates those classes with real individuals

Nothing CASA-specific. Purpose: learn valid Turtle syntax and the ontology/instance distinction before touching the legal domain.

### `lesson2_casa.ttl`

A focused legal ontology built from real CASA Agreement clauses. Contains exactly the vocabulary and facts needed to express the two legal traps:

**The vocabulary (PART 1 — ontology layer):**
- `casa:Agreement`, `casa:Clause`, `casa:EmployeeType`, `casa:Entitlement` — the types
- `casa:coversType`, `casa:excludesType`, `casa:exceptionTo`, `casa:grantsEntitlement` — the relationships

**The facts (PART 2 — instance layer):**
- `casa:Agreement2023` covers `casa:Employee`, with source clause `casa:Clause_3_1`
- `casa:Clause_3_1_2_2` is an exception to `casa:Clause_3_1` and excludes `casa:MedicalOfficer`
- `casa:Overtime` entitlement has eligibility rule "only employees at or below the Overtime barrier"

## How These Relate to cognee

cognee extracts a graph automatically from the PDF using an LLM. The `.ttl` files are the **hand-curated equivalent** — built by reading the clauses carefully and expressing them as precise triples.

Step 6 compares the two:
- Does cognee's extracted graph contain the `excluded_from` link for Medical Officers?
- Does it connect `overtime → eligibility_determined_by → overtime barrier → defined_as → CSL3`?

The ontology is the quality ceiling. Anything cognee misses is a gap in extraction, not a gap in the law.

## Reading Turtle syntax

```turtle
casa:MedicalOfficer  a  casa:EmployeeType .         # "is a" relationship
casa:Clause_3_1_2_2  casa:excludesType  casa:MedicalOfficer .  # typed edge
```

Each line is a triple: **subject → predicate → object** — the same structure as a graph edge.
