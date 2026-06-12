"""
Step 6 — Pressure test: compare cognee's extracted graph against the
hand-built reference ontology in reference/lesson2_casa.ttl.

The reference TTL is the quality ceiling — it was built by a human reading
the actual clauses. cognee's graph was built by an LLM reading PDF chunks.

For each critical triple in the reference we check whether an equivalent
relationship exists in the cognee graph and report HIT / PARTIAL / MISS.

Run from the project root:
    python pipeline/step6_pressure_test.py
"""

import asyncio
from rdflib import Graph as RDFGraph, Namespace, RDF, RDFS
from cognee.infrastructure.databases.graph import get_graph_engine

CASA = Namespace("http://example.org/casa#")


# ── Load reference TTL ────────────────────────────────────────────────────────

def load_reference() -> RDFGraph:
    g = RDFGraph()
    g.parse("reference/lesson2_casa.ttl", format="turtle")
    return g


def summarise_reference(ref: RDFGraph):
    print("=" * 70)
    print("REFERENCE ONTOLOGY  (reference/lesson2_casa.ttl)")
    print("=" * 70)
    print(f"  Total triples : {len(ref)}")
    print()
    print("  Critical triples (the quality benchmark):")
    critical = [
        (CASA.Agreement2023,    CASA.coversType,          CASA.Employee),
        (CASA.Clause_3_1_2_2,   CASA.excludesType,         CASA.MedicalOfficer),
        (CASA.Clause_3_1_2_2,   CASA.exceptionTo,          CASA.Clause_3_1),
        (CASA.Overtime,         CASA.eligibilityRule,      None),
        (CASA.Clause_36,        CASA.grantsEntitlement,    CASA.Overtime),
    ]
    for s, p, o in critical:
        s_label = str(s).split("#")[-1]
        p_label = str(p).split("#")[-1]
        o_label = str(o).split("#")[-1] if o else "(literal)"
        present = (s, p, o) in ref if o else any(True for _ in ref.triples((s, p, None)))
        tick = "✓" if present else "✗"
        print(f"    {tick}  {s_label}  --[{p_label}]-->  {o_label}")
    print()


# ── Load cognee graph ─────────────────────────────────────────────────────────

async def load_cognee_graph():
    engine = await get_graph_engine()
    nodes, edges = await engine.get_graph_data()
    node_map = {nid: attrs for nid, attrs in nodes}
    # Build name-indexed lookups for easy searching
    name_to_id   = {}
    id_to_name   = {}
    for nid, attrs in nodes:
        name = (attrs.get("name") or "").lower().strip()
        if name:
            name_to_id[name] = nid
            id_to_name[nid] = name
    # Edge set: frozenset of (src_name, rel, dst_name)
    edge_set = set()
    for src_id, dst_id, rel, _ in edges:
        src_name = id_to_name.get(src_id, "")
        dst_name = id_to_name.get(dst_id, "")
        if src_name and dst_name:
            edge_set.add((src_name, rel, dst_name))
    return node_map, name_to_id, id_to_name, edge_set


# ── Check helpers ─────────────────────────────────────────────────────────────

def has_node(name_to_id: dict, *candidates: str) -> tuple[bool, str]:
    """Return (True, matched_name) if any candidate name exists as a node."""
    for c in candidates:
        if c.lower() in name_to_id:
            return True, c.lower()
    return False, ""


def has_edge(edge_set: set, src_candidates, rel_candidates, dst_candidates) -> tuple[bool, str]:
    """Return (True, matched_triple_str) if any combination exists."""
    for src in src_candidates:
        for rel in rel_candidates:
            for dst in dst_candidates:
                if (src.lower(), rel, dst.lower()) in edge_set:
                    return True, f"{src}  --[{rel}]-->  {dst}"
    return False, ""


# ── The checks ────────────────────────────────────────────────────────────────

def run_checks(name_to_id: dict, edge_set: set) -> list[dict]:
    results = []

    def check(label, clause_ref, description, hit: bool, detail: str, partial=False):
        results.append({
            "label":       label,
            "clause":      clause_ref,
            "description": description,
            "status":      "HIT" if hit else ("PARTIAL" if partial else "MISS"),
            "detail":      detail,
        })

    # ── CHECK 1: Coverage clause ──────────────────────────────────────────────
    # Reference: casa:Agreement2023 casa:coversType casa:Employee
    hit, detail = has_edge(
        edge_set,
        src_candidates=["civil aviation safety authority enterprise agreement 2023-2026"],
        rel_candidates=["covers_employees"],
        dst_candidates=["employee"],
    )
    check(
        label="Coverage clause",
        clause_ref="Clause 3.1",
        description="Agreement covers employees",
        hit=hit,
        detail=detail or "MISSING: agreement --[covers_employees]--> employee",
    )

    # ── CHECK 2: Trap 1a — exclusion relationship exists ─────────────────────
    # Reference: casa:Clause_3_1_2_2 casa:excludesType casa:MedicalOfficer
    # cognee may have extracted this as "director of aviation safety" excluded_from agreement
    excluded_nodes = [
        k for k in name_to_id
        if any(term in k for term in ["medical officer", "director of aviation safety", "senior manager"])
    ]
    hit, detail = has_edge(
        edge_set,
        src_candidates=excluded_nodes or ["medical officer", "director of aviation safety"],
        rel_candidates=["excluded_from"],
        dst_candidates=["civil aviation safety authority enterprise agreement 2023-2026",
                        "agreement"],
    )
    check(
        label="Trap 1 — Exclusion relationship",
        clause_ref="Clause 3.1.2.2",
        description="An excluded employee type is linked to the agreement via excluded_from",
        hit=hit,
        detail=detail or "MISSING: [excluded_entity] --[excluded_from]--> agreement",
    )

    # ── CHECK 3: Trap 1b — Medical Officer named specifically ─────────────────
    # Reference: casa:MedicalOfficer as the explicit excluded type
    mo_present, mo_name = has_node(name_to_id, "medical officer", "medical officers")
    check(
        label="Trap 1 — Medical Officer named",
        clause_ref="Clause 3.1.2.2",
        description="'Medical Officer' exists as a named entity in the graph",
        hit=mo_present,
        detail=f"Node found: '{mo_name}'" if mo_present else
               "MISSING: no 'medical officer' node — LLM extracted 'director of aviation safety' instead",
    )

    # ── CHECK 4: Trap 2a — overtime eligibility rule ──────────────────────────
    # Reference: casa:Overtime casa:eligibilityRule (literal)
    # cognee: overtime --[eligibility_determined_by]--> overtime_barrier
    hit, detail = has_edge(
        edge_set,
        src_candidates=["overtime"],
        rel_candidates=["eligibility_determined_by"],
        dst_candidates=["overtime barrier"],
    )
    check(
        label="Trap 2 — Overtime eligibility link",
        clause_ref="Clause 36.1.1",
        description="overtime linked to overtime_barrier via eligibility_determined_by",
        hit=hit,
        detail=detail or "MISSING: overtime --[eligibility_determined_by]--> overtime barrier",
    )

    # ── CHECK 5: Trap 2b — barrier defined as CSL3 ───────────────────────────
    # Reference: implied by the eligibilityRule literal mentioning CSL3
    # cognee: overtime_barrier --[defined_as]--> corporate services level 3
    hit, detail = has_edge(
        edge_set,
        src_candidates=["overtime barrier"],
        rel_candidates=["defined_as"],
        dst_candidates=["corporate services level 3"],
    )
    check(
        label="Trap 2 — Barrier defined as CSL3",
        clause_ref="Clause 6 (definitions)",
        description="overtime_barrier --[defined_as]--> corporate services level 3",
        hit=hit,
        detail=detail or "MISSING: overtime barrier --[defined_as]--> corporate services level 3",
    )

    # ── CHECK 6: Clause traceability ─────────────────────────────────────────
    # Reference: casa:Clause_3_1_2_2 casa:exceptionTo casa:Clause_3_1
    # cognee default: no clause nodes at all.
    # After gap fix: expect clause nodes + an exception_to edge between them.
    clause_nodes = [k for k in name_to_id if "clause" in k]
    exception_rels = {
        "exception_to", "is_exception_to", "exceptionto",
        "carves_out", "limits", "overrides",
    }
    exception_edges = [
        (s, r, d) for s, r, d in edge_set
        if r in exception_rels and ("clause" in s or "clause" in d)
    ]
    has_clause_nodes = len(clause_nodes) > 0
    has_exception_edge = len(exception_edges) > 0
    hit = has_clause_nodes and has_exception_edge
    partial = has_clause_nodes and not has_exception_edge
    if hit:
        detail = f"Clause nodes: {clause_nodes}  |  Exception edges: {exception_edges}"
    elif partial:
        detail = f"Clause nodes found {clause_nodes} but no exception_to edge between them"
    else:
        detail = "MISSING: no clause nodes — cognee extracts entities but not clause structure"
    check(
        label="Clause traceability",
        clause_ref="Clause 3.1 / 3.1.2.2",
        description="Clause nodes exist with an exception_to edge (Clause 3.1.2.2 → Clause 3.1)",
        hit=hit,
        partial=partial,
        detail=detail,
    )

    # ── CHECK 7: Employee type hierarchy ─────────────────────────────────────
    # Reference: MedicalOfficer subClassOf Manager subClassOf Employee
    # cognee default: flat Entity nodes, no subclass relationships.
    # After gap fix: expect subclass/subtype edges between employee types.
    # LLMs use various names for this relationship — accept all common variants.
    HIERARCHY_RELS = {
        "subclass_of", "is_subclass_of", "is_subtype_of", "type_of", "subtype_of",
        "is_a_subtype_of", "is_a_type_of", "is_type_of", "is_a_kind_of",
    }
    subclass_edges = [(s, r, d) for s, r, d in edge_set if r in HIERARCHY_RELS]
    hit = len(subclass_edges) > 0
    check(
        label="Employee type hierarchy",
        clause_ref="Ontology design",
        description="Subclass relationships between employee types (MedicalOfficer → SeniorManager → Employee)",
        hit=hit,
        detail=str(subclass_edges) if hit else
               "MISSING: no subclass edges — cognee uses flat Entity/EntityType, not a class hierarchy",
    )

    return results


# ── Report ────────────────────────────────────────────────────────────────────

def print_report(results: list[dict]):
    status_symbol = {"HIT": "✓", "PARTIAL": "~", "MISS": "✗"}
    status_label  = {"HIT": "HIT    ", "PARTIAL": "PARTIAL", "MISS": "MISS   "}

    hits    = sum(1 for r in results if r["status"] == "HIT")
    partial = sum(1 for r in results if r["status"] == "PARTIAL")
    misses  = sum(1 for r in results if r["status"] == "MISS")
    total   = len(results)

    print("=" * 70)
    print("PRESSURE TEST RESULTS")
    print("=" * 70)
    for r in results:
        sym = status_symbol[r["status"]]
        lbl = status_label[r["status"]]
        print(f"\n  {sym} {lbl}  {r['label']}  ({r['clause']})")
        print(f"           {r['description']}")
        print(f"           → {r['detail']}")

    print()
    print("=" * 70)
    print(f"  SCORE:  {hits} HIT  |  {partial} PARTIAL  |  {misses} MISS  (out of {total})")
    print("=" * 70)
    print()
    print("WHAT THE GAPS TELL YOU")
    print("-" * 70)
    print("""
  HIT  — cognee extracted the concept, relationship, or constraint correctly.

  MISS (Medical Officer named)
    The LLM read Clause 3.1.2.2 and extracted the role title that appears
    nearby ('Director of Aviation Safety') rather than 'Medical Officer'.
    Fix: enrich the ontology prompt with the exact excluded types, or add a
    targeted ingest chunk that contains both terms in the same sentence.

  MISS (Clause traceability)
    cognee's default graph model extracts entities and semantic relationships.
    It does not create nodes for individual clauses or link facts back to their
    source clause. The reference TTL has this (sourceClause, exceptionTo).
    Fix: post-process the graph to add clause nodes, or use a custom
    extraction prompt that explicitly asks for clause provenance.

  MISS (Employee type hierarchy)
    The hand-built TTL defines MedicalOfficer as a subclass of Manager,
    which is a subclass of Employee. cognee produces flat Entity nodes.
    Fix: provide an ontology schema to cognee's extraction step so it
    maps extracted types into the hierarchy rather than creating flat nodes.
""")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    ref = load_reference()
    summarise_reference(ref)

    node_map, name_to_id, id_to_name, edge_set = await load_cognee_graph()
    print("=" * 70)
    print("COGNEE EXTRACTED GRAPH")
    print("=" * 70)
    print(f"  Nodes : {len(node_map)}")
    print(f"  Edges : {len(edge_set)}")
    print()

    results = run_checks(name_to_id, edge_set)
    print_report(results)


if __name__ == "__main__":
    asyncio.run(main())
