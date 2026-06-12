# pipeline/

The 6 learning steps, run in order. Each step has a verify gate — confirm it works before moving to the next.

**Run all commands from the project root (`ontology/`).**

---

## Step 1 — Install (shell only, no script)

See `step1_install.md` for the exact commands.

Verify: `python -c "import cognee; print(cognee.__version__)"` and `cognee-cli --help` both work.

---

## Step 2 — Smoke test

```bash
python pipeline/step2_smoke_test.py
```

**What it does:** remembers one CASA fact, recalls it back. Proves the full pipeline (Anthropic LLM + fastembed embeddings + LanceDB + Ladybug graph) is wired correctly before touching the real PDF.

**Verify:** the recall result mentions "Medical Officers are excluded" and shows the graph relationship `agreement --[excludes]--> medical officers`.

---

## Step 3 — Build subset + ingest + verify

```bash
# 3a: extract the 8 relevant pages from the 85-page source PDF
python pipeline/step3_build_subset.py

# 3b: ingest into cognee (~90 seconds on free tier with rate limiting)
python pipeline/step3_ingest.py

# 3c: confirm the graph has nodes/edges and the two traps are wired
python pipeline/step3_verify.py
```

**What step 3b does internally:**
1. pypdf reads the PDF and splits it into text chunks
2. Each chunk goes to Claude Sonnet — it extracts entities and relationships as a graph
3. fastembed turns the text into 384-dim vectors, stored in LanceDB
4. The graph (nodes + typed edges) is stored in Ladybug
5. SQLite tracks which chunks came from which document

**Verify:** `step3_verify.py` reports 47 nodes, 122 edges, and correctly answers the two trap queries.

---

## Step 4 — Inspect graph visually

```bash
python explore/inspect_graph.py
open output/graph.html
```

Not a separate script — uses the explore tool. See `explore/README.md`.

**Verify:** `graph.html` opens in the browser and shows the CASA entities and typed relationships.

---

## Step 5 — Real legal questions

```bash
python pipeline/step5_recall.py
```

**What it does:** asks 8 legal questions covering three difficulty levels:
- **Category A (traps):** multi-hop questions that plain search gets wrong
- **Category B (straightforward):** single-clause questions any system should answer
- **Category C (edge cases):** boundary conditions requiring careful reading

**Verify:** all 8 answers are legally correct. See `step5_recall.py` for the expected answers embedded in the `why_hard` field of each question.

---

## Step 6 — Pressure test (to be built)

```bash
python pipeline/step6_pressure_test.py
```

**What it will do:** compare the cognee-extracted graph against the hand-built `reference/lesson2_casa.ttl` using rdflib. Checks whether specific triples exist in the extracted graph — the two traps, the coverage clause, and the overtime barrier definition.

**Not yet implemented.** See `step6_pressure_test.py` for the planned structure.

---

## Rate limiting note

The `.env` contains:
```
LLM_RATE_LIMIT_ENABLED=true
LLM_RATE_LIMIT_REQUESTS=5
LLM_RATE_LIMIT_INTERVAL=60
```

This throttles cognee to 5 LLM calls/minute to stay within the Anthropic free tier (8,000 output tokens/minute). Remove or increase these if you upgrade your Anthropic tier.
