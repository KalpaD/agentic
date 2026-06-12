"""
Verification script for Step 3.
Checks the graph structure and runs targeted recall queries for both traps.

Run with the venv active from the ontology/ directory:
    python verify_ingest.py
"""
import asyncio
from collections import Counter
import cognee
from cognee.infrastructure.databases.graph import get_graph_engine


async def main():
    graph_engine = await get_graph_engine()
    nodes, edges = await graph_engine.get_graph_data()

    # ── 1. Graph stats ────────────────────────────────────────────────────────
    print("=" * 60)
    print("GRAPH STATS")
    print("=" * 60)
    print(f"  Nodes : {len(nodes)}")
    print(f"  Edges : {len(edges)}")

    type_counts = Counter(attrs.get("type", "?") for _, attrs in nodes)
    print("\n  Node types:")
    for t, count in type_counts.most_common():
        print(f"    {count:3d}  {t}")

    rel_counts = Counter(rel for _, _, rel, _ in edges)
    print("\n  Relationship types:")
    for r, count in rel_counts.most_common():
        print(f"    {count:3d}  {r}")

    # ── 2. Spot-check key nodes ───────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("KEY NODES (trap-relevant)")
    print("=" * 60)
    targets = {"overtime barrier", "overtime", "medical officers",
               "director of aviation safety", "corporate services level 3",
               "emergency duty", "rest relief after overtime"}
    found = {attrs.get("name", "").lower(): attrs.get("type")
             for _, attrs in nodes}
    for t in sorted(targets):
        status = "✓" if t in found else "✗ MISSING"
        print(f"  {status}  {t}")

    # ── 3. Trap recall queries ────────────────────────────────────────────────
    queries = [
        (
            "TRAP 1 — Medical Officer overtime",
            "What overtime entitlements does a Medical Officer receive?",
            "Expected: excluded from agreement / not covered — NOT overtime rates"
        ),
        (
            "TRAP 2 — Overtime barrier",
            "Who is eligible for overtime payments?",
            "Expected: only employees at or below the Overtime barrier (CSL3)"
        ),
        (
            "BONUS — Rest relief",
            "What happens if an employee returns to work without enough rest after overtime?",
            "Expected: paid double time until 8 consecutive hours off"
        ),
    ]

    for title, question, expected in queries:
        print(f"\n{'=' * 60}")
        print(f"RECALL: {title}")
        print(f"{'=' * 60}")
        print(f"Q: {question}")
        print(f"[Expected] {expected}")
        print()
        results = await cognee.recall(question)
        for r in results:
            print(f"A: {r.text}")


if __name__ == "__main__":
    asyncio.run(main())
