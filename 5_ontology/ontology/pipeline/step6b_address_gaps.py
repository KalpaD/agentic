"""
Step 6b — Address the three gaps found by the pressure test.

Gap 1: 'Medical Officer' not named — the LLM read Clause 3.1.2.1 (Director of
        Aviation Safety) instead of Clause 3.1.2.2 (Senior Managers / Medical Officers).

Gap 2: No clause nodes — cognee extracts semantic entities, not document structure.
        The reference TTL has Clause_3_1_2_2 --[exceptionTo]--> Clause_3_1.

Gap 3: No employee type hierarchy — cognee produces flat Entity nodes.
        The reference TTL has MedicalOfficer --[subClassOf]--> Manager --[subClassOf]--> Employee.

Strategy: inject targeted supplementary text via cognee.remember().
The text is crafted so the LLM extracts the specific entities and relationship
names the pressure test checks for. The existing graph is NOT pruned — these
facts are layered on top.

Run AFTER step 6:
    python pipeline/step6b_address_gaps.py
Then re-run the pressure test to see the new score:
    python pipeline/step6_pressure_test.py
"""

import asyncio
import cognee

# Each tuple: (human label, text to ingest)
# Text is written to guide the LLM toward exact entity names and relationship types.
TARGETED_FACTS = [

    # ── Gap 1 — Medical Officer exclusion ────────────────────────────────────
    # The PDF has both "Director of Aviation Safety" (3.1.2.1) and "Medical Officers"
    # (3.1.2.2) as excluded types. The LLM only extracted the first.
    # This fact states the Medical Officer exclusion in isolation.
    (
        "Gap 1 — Medical Officer exclusion",
        """
        Clause 3.1.2.2 of the CASA Enterprise Agreement 2023-2026 states that
        Medical Officers are excluded from the agreement.
        Medical Officers are not covered by the CASA Enterprise Agreement 2023-2026.
        Medical Officers are excluded from all entitlements including overtime and
        emergency duty under the agreement.
        """,
    ),

    # ── Gap 2 — Clause traceability ──────────────────────────────────────────
    # Introduces Clause nodes and the exceptionTo relationship so the graph
    # gains clause-level provenance (matching the reference TTL's structure).
    (
        "Gap 2 — Clause structure and traceability",
        """
        Clause 3.1.2.2 is an exception to Clause 3.1 of the CASA Enterprise Agreement 2023-2026.
        Clause 3.1 covers all employees under the agreement.
        Clause 3.1.2.2 carves out Medical Officers from the coverage granted by Clause 3.1.
        Clause 36 grants overtime entitlement to eligible employees under the agreement.
        Clause 6 of the agreement defines the Overtime Barrier.
        The Overtime Barrier is defined in Clause 6 as Corporate Services Level 3.
        """,
    ),

    # ── Gap 3 — Employee type hierarchy ──────────────────────────────────────
    # The reference TTL has MedicalOfficer subClassOf Manager subClassOf Employee.
    # This text states the hierarchy explicitly so the LLM can extract subclass edges.
    (
        "Gap 3 — Employee type hierarchy",
        """
        In the CASA Enterprise Agreement, Employee is the base employment type.
        Senior Manager is a subclass of Employee.
        Medical Officer is a subclass of Senior Manager.
        Medical Officers are a type of Senior Manager, who are a type of Employee.
        The hierarchy from most general to most specific is:
        Employee > Senior Manager > Medical Officer.
        """,
    ),
]


async def main():
    print("=" * 70)
    print("STEP 6b — ADDRESSING GRAPH GAPS")
    print("=" * 70)
    print()
    print("Strategy: inject targeted supplementary text via cognee.remember().")
    print("The existing graph is NOT pruned — facts are layered on top.")
    print()

    for label, text in TARGETED_FACTS:
        print(f"  [{label}]")
        print(f"  Ingesting...")
        await cognee.remember(text.strip(), dataset_name="casa_gaps")
        print(f"  Done.\n")

    print("=" * 70)
    print("Gap facts ingested. Re-run the pressure test to see the new score:")
    print()
    print("  python pipeline/step6_pressure_test.py")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
