# explore/

Reusable inspection and learning tools. These are not pipeline steps — run them at any point after step 3 to look inside the system.

**Run from the project root (`ontology/`).**

---

## inspect_graph.py

```bash
python explore/inspect_graph.py
open output/graph.html
```

**What it does:**
1. Connects to cognee's Ladybug graph database
2. Prints all nodes with their types, and all edges with their relationship labels
3. Generates `output/graph.html` — a self-contained interactive visualisation

**When to use:** after any ingest to verify what the LLM extracted. The node/edge counts and the specific relationships printed tell you whether the graph captured the concepts you care about.

**What to look for in the output:**
- `overtime  --[eligibility_determined_by]-->  overtime barrier` — Trap 2 is wired
- `director of aviation safety  --[excluded_from]-->  agreement` — Trap 1 is wired
- `overtime barrier  --[defined_as]-->  corporate services level 3` — the barrier is defined

---

## relay_demo.py

```bash
python explore/relay_demo.py
```

**What it does:** runs one query through all three stages of the architecture, making each stage visible:

**Stage 1 — `embed_query()`**
Converts the question to a 384-dimensional vector using fastembed (BAAI/bge-small-en-v1.5). Shows the raw numbers so you can see that the question is just a point in high-dimensional space.

**Stage 2 — `search_vectors()`**
Searches LanceDB for the nearest stored vectors. Shows similarity scores for each collection (`Entity_name`, `DocumentChunk_text`, `EdgeType_relationship_name`, etc.) and which entity becomes the graph entry point.

**Stage 3 — `traverse_graph()`**
From the entry point, walks the graph edges and shows the relationships. The "trap edges" section highlights the multi-hop links that plain search cannot reach.

**`get_answer()`**
Calls `cognee.recall()` which runs all three stages internally and returns an LLM-generated answer grounded in the graph context.

**Why this tool exists:** it makes the claim "vectors find the entry point, graph does the reasoning" concrete and measurable. You can see that vectors land on `overtime` (the obvious match) while the graph then crosses to `excluded_from` — a relationship that no similarity score would ever surface.
