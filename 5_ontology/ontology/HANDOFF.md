# CASA × cognee — Project Handoff

Paste this file's contents to Claude Code (or keep it open) to continue the build with full context.

## Goal
Learn ontology / knowledge graphs / semantic search by building a **local cognee** memory
over the **CASA Enterprise Agreement 2023–2026** (PDF). End state: an agent that can answer
legal questions about the agreement with clause-level traceability, to use the law as
requirements for software system design.

## Working style (must follow)
- **One step at a time.** Do Step N, I verify on my machine, THEN proceed to Step N+1.
- Think before coding: state assumptions, surface tradeoffs, don't pick silently.
- Simplicity first. Surgical changes. Every step has an explicit **verify** gate.

## Decisions locked
- **Runtime:** plain pip + venv (NOT Docker yet). Docker only later, when the MCP server needs it.
- **LLM provider (extraction / Cognify):** Anthropic (Claude).
- **Embeddings:** OPEN DECISION (Step 2). Anthropic has no embeddings; cognee will silently
  fall back to OpenAI unless we point it at a LOCAL embedder (fastembed/HuggingFace). Decide in Step 2.

## Verified cognee facts (from docs, June 2026)
- Python 3.10–3.14; `pip install cognee`.
- Core API: `remember()`, `recall()`, `forget()`, `improve()`. CLI: `cognee-cli`. Local UI: `cognee-cli -ui`.
- Pipeline = Extract → Cognify (LLM extracts entities+relationships into a graph) → Load.
  Combines vector embeddings (semantic search) + knowledge graph (relationship traversal).
- Anthropic config (.env):
    LLM_PROVIDER="anthropic"
    LLM_MODEL="claude-sonnet-4-5-20250929"   # check for a newer Claude model id
    LLM_API_KEY="sk-ant-..."
  Default structured-output mode for anthropic = anthropic_tools (no override needed).
- WARNING from docs: "If you configure only LLM or only embeddings, the other defaults to OpenAI."
  So embeddings MUST be configured explicitly to stay fully local/Anthropic-only.
- Optional: COGNEE_SKIP_CONNECTION_TEST=true if the 30s preflight test times out.

## Plan (6 steps, verify gate each)
1. Install cognee in a venv      -> verify: `import cognee` + `cognee-cli --help` work        [IN PROGRESS]
2. Configure .env (Anthropic LLM + local embeddings) + smoke -> verify: remember()/recall() trivial fact returns
3. Ingest the CASA PDF           -> verify: pipeline completes, graph has nodes/edges
4. Open local UI, inspect graph  -> verify: see CASA entities + relationships
5. Recall real legal questions   -> verify: answers return with clause traceability
6. Pressure-test extraction      -> verify: compare to hand-built traps below

## Step 1 commands (current step)
```bash
python3 --version                      # must be 3.10–3.14
mkdir -p ~/casa-cognee && cd ~/casa-cognee
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install cognee
# VERIFY (both must succeed):
python -c "import cognee; print('cognee', cognee.__version__)"
cognee-cli --help
```

## Ground-truth "traps" to test cognee against (Step 6)
These are real CASA multi-hop cases plain semantic search gets WRONG. cognee's graph should get them right.
1. **Medical Officer overtime** — Clause 3.1.2.2 EXCLUDES Medical Officers from the agreement entirely
   (exception to coverage clause 3.1). So the correct answer to "what overtime does a Medical Officer get?"
   is "out of scope," NOT the rates in Clause 36. Tests multi-hop: coverage -> exception -> excluded type.
2. **Overtime barrier** — Clause 36.1.1: only employees at/below the "Overtime barrier" (a classification
   threshold) are eligible for overtime. Eligibility depends on classification, not just the overtime clause.

## Hand-built reference files (in this folder)
- `lesson1_simple.ttl` — minimal ontology + instances (HR toy), valid Turtle, parses in rdflib.
- `lesson2_casa.ttl`   — tiny LEGAL ontology + real CASA facts; demonstrates the trap query above.

## Conceptual model already learned (for grounding)
ontology (curated vocabulary of types+relations) -> LLM extraction turns prose into triples
-> stored as knowledge graph + vector embeddings -> at query time: VECTORS find the entry point
(fuzzy recall from human language), GRAPH traverses relationships (precise multi-hop) -> MCP hands
that context to the agent. Vector = recall; graph = precision. The ontology is the quality ceiling.
```
