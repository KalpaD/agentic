# CASA × cognee — Knowledge Graph Learning Project

A hands-on project that builds a local [cognee](https://github.com/topoteretes/cognee) knowledge graph over the CASA Enterprise Agreement 2023–2026 PDF, then answers legal questions with clause-level accuracy.

**End goal:** an agent that answers legal questions correctly even when the answer requires following relationships across clauses — the kind of multi-hop reasoning that plain keyword or semantic search cannot do.

---

## The Core Idea

Plain semantic search finds text that *sounds like* the question. A knowledge graph follows *typed relationships* between concepts. You need both:

```
Vector search   →  finds the entry node  (fuzzy, handles natural language)
Graph traversal →  walks the links       (precise, handles multi-hop logic)
LLM             →  writes the answer     (grounded in graph context, not raw text)
```

This three-stage relay is what cognee implements. This project makes each stage visible and testable.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10 – 3.14 | Check with `python3 --version` |
| Anthropic API key | any tier | Free tier works; rate limiting is pre-configured |

Get an Anthropic API key at [console.anthropic.com](https://console.anthropic.com).

---

## Project Structure

```
ontology/                        ← run ALL commands from here
├── .env                         ← LLM + embedding config (never committed)
├── .env.example                 ← template — copy to .env and fill in your key
├── requirements.txt             ← pinned direct dependencies
├── README.md                    ← this file
├── HANDOFF.md                   ← full project narrative and decisions log
│
├── data/
│   ├── source/                  ← original 85-page PDF (input, never modified)
│   └── processed/               ← 8-page subset extracted by step 3a
│
├── reference/
│   ├── lesson1_simple.ttl       ← minimal ontology warm-up example
│   └── lesson2_casa.ttl         ← hand-built CASA ontology (ground truth)
│
├── pipeline/                    ← the 6 learning steps, run in order
│   ├── step1_install.md         ← setup instructions (this section)
│   ├── step2_smoke_test.py      ← verify the full pipeline is wired
│   ├── step3_build_subset.py    ← extract 8 pages from the full PDF
│   ├── step3_ingest.py          ← build the knowledge graph from the PDF
│   ├── step3_verify.py          ← confirm graph stats + trap queries
│   ├── step5_recall.py          ← 8 legal questions across 3 difficulty levels
│   └── step6_pressure_test.py   ← (not yet built) compare graph vs reference TTL
│
├── explore/
│   ├── inspect_graph.py         ← print all nodes/edges + generate graph.html
│   └── relay_demo.py            ← show the 3-stage relay in slow motion
│
└── output/
    └── graph.html               ← interactive visualisation (generated, not committed)
```

---

## Step-by-Step Setup and Run

### Step 1 — Create the virtual environment

Run all commands from the `ontology/` directory.

```bash
python3 -m venv .venv
source .venv/bin/activate        # Mac / Linux
# .venv\Scripts\activate         # Windows
```

### Step 1b — Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs:

| Package | Version | Purpose |
|---|---|---|
| `cognee` | 1.1.2 | Core framework — graph extraction, storage, vector search, LLM recall |
| `anthropic` | 0.107.0 | Anthropic SDK — used by cognee for LLM calls to Claude |
| `fastembed` | 0.8.0 | Local embedding model — text → 384-dim vectors, no API needed |
| `lancedb` | 0.33.0 | Vector store — holds the embeddings (pulled in by cognee) |
| `pypdf` | 6.13.0 | PDF reader — used to extract the 8-page subset |
| `rdflib` | 7.1.4 | RDF/Turtle parser — used in step 6 to read the reference ontology |

Verify:
```bash
python -c "import cognee; print('cognee', cognee.__version__)"
# Expected: cognee 1.1.2
```

### Step 1c — Configure the environment

Create a `.env` file in the project root with the following contents, replacing the placeholder with your key:

```
# ── LLM: Anthropic ──────────────────────────────────────────────────────────
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-6
LLM_API_KEY=your-anthropic-api-key-here

# ── Embeddings: fastembed (fully local, no API key needed) ───────────────────
EMBEDDING_PROVIDER=fastembed
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5

# ── Data storage: keep inside this project dir, not buried in the venv ───────
COGNEE_DATA_PATH=.cognee_data

# ── Disable multi-user isolation so all scripts share the same graph ─────────
ENABLE_BACKEND_ACCESS_CONTROL=false

# ── LLM rate limiting (free tier: 8k output tokens/min ≈ 5 calls/min) ────────
LLM_RATE_LIMIT_ENABLED=true
LLM_RATE_LIMIT_REQUESTS=5
LLM_RATE_LIMIT_INTERVAL=60

# ── Skip the 30-second preflight connection test ─────────────────────────────
COGNEE_SKIP_CONNECTION_TEST=true
```

> **Why `ENABLE_BACKEND_ACCESS_CONTROL=false`?** cognee defaults to multi-user session isolation — each script run creates its own user context and cannot see data written by another run. Disabling this makes all scripts share one graph, which is what we want for a single-developer project.

> **Why rate limiting?** The Anthropic free tier allows ~8,000 output tokens per minute. Without throttling, cognee fires all PDF chunks at the LLM in parallel and hits 429 errors. 5 calls/minute keeps it within limits; ingest takes ~90 seconds as a result.

---

### Step 2 — Smoke test (verify the full pipeline is wired)

```bash
python pipeline/step2_smoke_test.py
```

This prunes any existing data, stores one CASA fact, then recalls it. It exercises the full path: Anthropic LLM → fastembed embeddings → LanceDB → Ladybug graph → recall.

**Expected output includes:**
```
Medical Officers are excluded
agreement --[excludes]--> medical officers
```

If the smoke test passes, the entire pipeline is wired correctly. If it fails, fix it before proceeding — there is no point building the graph on a broken foundation.

> **Warning:** step 2 calls `cognee.prune.prune_data()` — it wipes any previously ingested graph. Do not run it after step 3 unless you intend to re-ingest.

---

### Step 3a — Build the 8-page PDF subset

```bash
python pipeline/step3_build_subset.py
```

The source PDF is 85 pages. Ingesting the full document at free-tier rate limits would take ~30 minutes and include mostly irrelevant clauses. This script extracts the 8 pages that cover the two legal traps and writes them to `data/processed/casa-subset.pdf`.

**Pages extracted:**

| Pages (0-indexed) | Content |
|---|---|
| 0 | Cover page |
| 2 | Clauses 1–3 (coverage, parties, exclusions) |
| 3–4 | Definitions including Overtime barrier (Clause 6) |
| 23–26 | Clause 36 (overtime) + Clause 37 (emergency duty) |

**Expected output:**
```
Subset PDF written → data/processed/casa-subset.pdf  (8 pages)
```

---

### Step 3b — Ingest into cognee

```bash
python pipeline/step3_ingest.py
```

This is the main build step. It takes ~90 seconds on the free tier.

**What happens internally:**
1. `pypdf` reads the 8-page PDF and splits it into text chunks
2. Each chunk is sent to Claude Sonnet — it extracts entities and relationships as a typed graph
3. `fastembed` converts the text into 384-dim vectors, stored in LanceDB
4. The graph (nodes + typed edges) is stored in Ladybug (cognee's embedded graph DB)
5. SQLite records which chunks came from which document

**Expected output (last few lines):**
```
Ingest complete.
```

The rate limit means you will see pauses between LLM calls — this is expected.

---

### Step 3c — Verify the graph

```bash
python pipeline/step3_verify.py
```

**Expected output:**
```
GRAPH STATS
  Nodes : 47
  Edges : 122

KEY NODES (trap-relevant)
  ✓  corporate services level 3
  ✓  director of aviation safety
  ✓  overtime
  ✓  overtime barrier

RECALL: TRAP 1 — Medical Officer overtime
A: Medical Officers receive no overtime entitlements...

RECALL: TRAP 2 — Overtime barrier
A: Only employees at or below the Overtime barrier (CSL3)...
```

If either trap returns the wrong answer (e.g., returns overtime rates for Medical Officers instead of "excluded"), the graph extraction missed a key relationship. Re-run step 3b after confirming your API key and rate limits are configured.

---

### Step 4 — Inspect the graph visually

```bash
python explore/inspect_graph.py
open output/graph.html           # Mac
# xdg-open output/graph.html    # Linux
# start output/graph.html       # Windows
```

`inspect_graph.py` prints every node and edge to the terminal, then generates a self-contained interactive HTML visualisation. No internet connection required to open it.

**What to verify in the terminal output:**
```
overtime  --[eligibility_determined_by]-->  overtime barrier
overtime barrier  --[defined_as]-->  corporate services level 3
director of aviation safety  --[excluded_from]-->  agreement
```

These three lines confirm the two traps are wired in the graph.

---

### Step 5 — Real legal questions

```bash
python pipeline/step5_recall.py
```

Asks 8 legal questions across three difficulty levels:

| Category | Questions | Why hard |
|---|---|---|
| A — Traps | 2 | Multi-hop: answer requires crossing clauses with zero shared vocabulary |
| B — Straightforward | 3 | Single-clause lookups any system should answer |
| C — Edge cases | 3 | Boundary conditions requiring careful reading of multiple sub-clauses |

**All 8 answers should be legally correct.** Each question has the expected answer embedded in its `why_hard` field in the script — compare the LLM output against those expectations.

---

## The Two Legal Traps

These are the benchmark questions — cases that plain semantic search gets wrong because the answer lives across two clauses with no shared vocabulary.

### Trap 1 — Medical Officer overtime

> "What overtime entitlements does a Medical Officer receive?"

Plain search lands on Clause 36 (overtime rates) because that's where "overtime" and "Medical Officer" appear near each other. The correct answer requires jumping to Clause 3.1.2.2 (40 pages away) which excludes Medical Officers from the agreement entirely. The graph follows the `excluded_from` relationship; search has no path to it.

**Correct answer:** none — Medical Officers are excluded from the agreement and receive no overtime entitlements.

### Trap 2 — Overtime barrier

> "Is a CSL4 employee eligible for overtime?"

Clause 36.1.1 says "employees at or below the Overtime barrier." The barrier itself is defined in Clause 6 (definitions) as Corporate Services Level 3 (CSL3). Two separate clauses, no shared words. The graph follows `eligibility_determined_by → defined_as`; search never connects them.

**Correct answer:** no — CSL4 is above the Overtime barrier (CSL3), so not eligible.

---

## Exploration Tools

Run these at any point after step 3:

```bash
# Interactive graph visualisation
python explore/inspect_graph.py
open output/graph.html

# Watch the 3-stage relay (vectors → graph → answer) in slow motion
python explore/relay_demo.py
```

`relay_demo.py` is particularly useful for understanding *why* the system works — it shows the raw similarity scores from vector search, the edges traversed from the graph entry point, and the final grounded LLM answer as three separate, visible stages.

---

## Troubleshooting

**`No module named 'anthropic'`**
cognee does not bundle the Anthropic SDK. Run `pip install anthropic`.

**`429 Too Many Requests` during ingest**
The Anthropic free tier has an 8,000 output tokens/minute limit. Confirm `LLM_RATE_LIMIT_ENABLED=true` is in your `.env`.

**Graph has 0 nodes after ingest**
Usually caused by rate limit errors being silently swallowed. Run `step3_ingest.py` again — if it completes without errors and the 429s were fixed, `step3_verify.py` should show 47 nodes.

**`BufferedReader` / 415 error on ingest**
`cognee.remember()` does not accept an open file handle — it needs an absolute path string. The ingest script already handles this: `str(Path(PDF_PATH).resolve())`.

**Recall returns wrong answers after running step 2**
`step2_smoke_test.py` prunes all data. If you ran it after step 3, re-run the ingest: steps 3b and 3c.

**All scripts read graph data from the same place?**
Yes — `ENABLE_BACKEND_ACCESS_CONTROL=false` in `.env` disables session isolation. Without it, each script run creates its own user context and finds an empty graph.
