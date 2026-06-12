"""
recall_questions.py — Step 5: ask real legal questions against the ingested CASA graph.

Questions are grouped into three categories:
  A. The two traps  — multi-hop questions plain search gets WRONG
  B. Straightforward — single-clause questions any approach should get right
  C. Edge cases     — boundary conditions that require reading carefully

Run with the venv active from the ontology/ directory:
    python recall_questions.py
"""
import asyncio
import cognee

QUESTIONS = [
    # ── A. THE TRAPS (multi-hop — the whole point of having a graph) ──────────
    {
        "category": "A — TRAP (multi-hop)",
        "question": "What overtime entitlements does a Medical Officer receive?",
        "why_hard": (
            "Trap 1: The answer is NOT in Clause 36 (overtime rates). "
            "It requires crossing from Clause 36 → Clause 3.1.2.2 (exclusion) "
            "which shares zero vocabulary with 'overtime'. "
            "Plain search always returns the overtime rates — wrong answer."
        ),
    },
    {
        "category": "A — TRAP (multi-hop)",
        "question": "A CASA employee is classified above CSL3. Are they eligible for overtime?",
        "why_hard": (
            "Trap 2: Requires knowing the Overtime barrier is defined as CSL3 (Clause 6), "
            "then applying the eligibility rule in Clause 36.1.1. "
            "Two clauses far apart with no shared words."
        ),
    },
    # ── B. STRAIGHTFORWARD (single clause) ────────────────────────────────────
    {
        "category": "B — Straightforward",
        "question": "What are the overtime rates for working on a Sunday?",
        "why_hard": "Single clause (36.2.1.3) — should be direct.",
    },
    {
        "category": "B — Straightforward",
        "question": "What is the minimum payment when overtime is not continuous with ordinary hours?",
        "why_hard": "Single clause (36.3.1) — 4 hour minimum.",
    },
    {
        "category": "B — Straightforward",
        "question": "Can an employee take time off in lieu instead of overtime payment?",
        "why_hard": "Single clause (36.6) — TOIL with manager agreement.",
    },
    # ── C. EDGE CASES (boundary conditions) ───────────────────────────────────
    {
        "category": "C — Edge case",
        "question": (
            "An employee finishes overtime at 11pm and is asked to start work at 6am. "
            "What are their rights?"
        ),
        "why_hard": (
            "Rest relief (36.5): minimum 8 consecutive hours. "
            "7 hours gap → employee may be absent without salary loss, "
            "or if required to attend → paid double time."
        ),
    },
    {
        "category": "C — Edge case",
        "question": "What happens to unused time off in lieu after 8 weeks?",
        "why_hard": "Clause 36.6.3 — paid out at the overtime rate it was accrued at.",
    },
    {
        "category": "C — Edge case",
        "question": "Is a Senior Manager eligible for emergency duty payments?",
        "why_hard": (
            "Requires knowing Senior Managers are excluded from the agreement (Clause 3.1.2.2) "
            "AND that emergency duty only applies to employees at/below the overtime barrier (Clause 37.1). "
            "Double exclusion."
        ),
    },
]


async def main():
    print("=" * 70)
    print("STEP 5 — REAL LEGAL QUESTIONS AGAINST THE CASA GRAPH")
    print("=" * 70)

    for i, q in enumerate(QUESTIONS, 1):
        print(f"\n{'─' * 70}")
        print(f"Q{i}  [{q['category']}]")
        print(f"{'─' * 70}")
        print(f"QUESTION : {q['question']}")
        print(f"WHY HARD : {q['why_hard']}")
        print()

        results = await cognee.recall(q["question"])

        if results:
            for r in results:
                print(f"ANSWER   : {r.text}")
        else:
            print("ANSWER   : (no results returned)")

    print(f"\n{'=' * 70}")
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
