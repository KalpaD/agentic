"""
Exports the cognee-extracted graph to Turtle (.ttl) format so it can be
reviewed alongside the hand-built reference/lesson2_casa.ttl.

Output: output/extracted_graph.ttl

Only semantic nodes (Entity, EntityType) are exported. Infrastructure nodes
(DocumentChunk, TextDocument, TextSummary) are filtered out — they describe
how the document was chunked, not what it means.

Run from the project root:
    python explore/export_graph_ttl.py
"""

import asyncio
import re
import cognee
from cognee.infrastructure.databases.graph import get_graph_engine
from rdflib import Graph, Namespace, RDF, RDFS, URIRef, Literal

BASE = "http://example.org/casa-extracted#"
EX = Namespace(BASE)

SEMANTIC_TYPES = {"Entity", "EntityType"}
SKIP_RELATIONS = {"contains", "is_a"}   # graph-infrastructure edges, not legal meaning


def slug(text: str) -> str:
    """'Overtime Barrier' → 'overtime_barrier'"""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


async def main():
    graph_engine = await get_graph_engine()
    nodes, edges = await graph_engine.get_graph_data()

    node_map = {node_id: attrs for node_id, attrs in nodes}

    rdf = Graph()
    rdf.bind("rdf", RDF)
    rdf.bind("rdfs", RDFS)
    rdf.bind("ex", EX)

    # ── Nodes ────────────────────────────────────────────────────────────────
    exported_ids = set()
    for node_id, attrs in nodes:
        kind = attrs.get("type", "")
        if kind not in SEMANTIC_TYPES:
            continue

        name = attrs.get("name") or attrs.get("id") or node_id
        uri = URIRef(BASE + slug(name))
        rdf_type = EX.Entity if kind == "Entity" else EX.EntityType

        rdf.add((uri, RDF.type, rdf_type))
        rdf.add((uri, RDFS.label, Literal(name)))
        exported_ids.add(node_id)

    # ── Edges ────────────────────────────────────────────────────────────────
    for src_id, dst_id, rel, _attrs in edges:
        if rel in SKIP_RELATIONS:
            continue
        if src_id not in exported_ids or dst_id not in exported_ids:
            continue

        src_name = node_map[src_id].get("name") or src_id
        dst_name = node_map[dst_id].get("name") or dst_id
        src_uri = URIRef(BASE + slug(src_name))
        dst_uri = URIRef(BASE + slug(dst_name))
        prop_uri = URIRef(BASE + slug(rel))

        rdf.add((src_uri, prop_uri, dst_uri))

    # ── Serialise ─────────────────────────────────────────────────────────────
    out_path = "output/extracted_graph.ttl"
    rdf.serialize(destination=out_path, format="turtle")

    triple_count = len(rdf)
    print(f"Exported {triple_count} triples → {out_path}")
    print(f"  Semantic nodes : {len(exported_ids)}")
    print(f"  (Filtered out infrastructure nodes: DocumentChunk, TextDocument, TextSummary)")
    print()
    print("Key relationships in the export:")
    for src_id, dst_id, rel, _ in edges:
        if rel in SKIP_RELATIONS:
            continue
        if src_id not in exported_ids or dst_id not in exported_ids:
            continue
        src_name = node_map[src_id].get("name") or src_id
        dst_name = node_map[dst_id].get("name") or dst_id
        print(f"  {src_name}  --[{rel}]-->  {dst_name}")


if __name__ == "__main__":
    asyncio.run(main())
