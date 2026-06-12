# data/

Input documents for the CASA cognee project.

## source/

The original, unmodified legal PDF from CASA:

- **`casa-enterprise-agreement-2023-26.pdf`** — Civil Aviation Safety Authority Enterprise Agreement 2023–2026 (85 pages, published February 2024). This is the authoritative source. Never modify it.

## processed/

Derived files generated from `source/`. Safe to regenerate — run `pipeline/step3_build_subset.py` to recreate them.

- **`casa-subset.pdf`** — 8-page extract built for cost-efficient testing and learning. Contains exactly the clauses needed to exercise the two legal traps:

| Source page | Content |
|-------------|---------|
| 1 | Cover |
| 3 | Clauses 1–3: purpose, title, coverage, **Medical Officer exclusion (3.1.2.2)** |
| 4–5 | Clause 6: definitions — **Overtime barrier defined as CSL3** |
| 24 | Clause 36.1: **overtime eligibility — barrier rule** |
| 25–27 | Clause 36.2–37: overtime rates, rest relief, TOIL, emergency duty |

### Why a subset?

The full 85-page PDF would require ~300+ LLM calls to ingest, hitting Anthropic free-tier rate limits (8,000 output tokens/minute). The 8-page subset is small enough to ingest in ~90 seconds on the free tier while containing all the content needed to test the graph's multi-hop reasoning.
