"""
relay_demo.py — Makes the vector → graph → answer relay visible with ONE query.

The three stages that run for every cognee.recall() call:
  Stage 1 — embed_and_search()  : turn the question into numbers, find nearest stored items
  Stage 2 — traverse_graph()    : from the nearest item, walk the relationship links
  Stage 3 — get_answer()        : LLM reads the graph context and writes a human answer

Run with the venv active from the ontology/ directory:
    python relay_demo.py
"""
import asyncio
import lancedb
from fastembed import TextEmbedding
import cognee
from cognee.infrastructure.databases.graph import get_graph_engine

LANCEDB_PATH = (
    ".venv/lib/python3.14/site-packages/cognee/.cognee_system/databases/cognee.lancedb"
)
QUERY = "What overtime does a Medical Officer receive?"


# ── Stage 1 ───────────────────────────────────────────────────────────────────

def embed_query(query: str) -> list[float]:
    """
    Convert a plain English question into a list of 384 numbers (a vector).

    How it works:
      The fastembed model (BAAI/bge-small-en-v1.5) was trained on massive amounts
      of text. It learned to map words and phrases to positions in a 384-dimensional
      space such that phrases with similar *meaning* land near each other —
      even if they share no words.

      Example: "rest after working late" and "ceasing overtime" end up close
      together because the model knows they mean the same thing.

    What you get back:
      A list of 384 floats. Think of it as GPS coordinates in a 384-axis space.
      The actual numbers are meaningless to humans — what matters is the distance
      between vectors, not the values themselves.
    """
    embedder = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    vector = list(embedder.embed([query]))[0].tolist()
    print(f"  Question → {len(vector)}-dimensional vector")
    print(f"  First 6 of {len(vector)} numbers: {[round(x, 4) for x in vector[:6]]}")
    print(f"  (the actual values are meaningless — only distances between vectors matter)\n")
    return vector


def search_vectors(query_vec: list[float]) -> tuple[list, str | None]:
    """
    Ask LanceDB: 'which stored items are closest in meaning to this query vector?'

    How it works:
      Every entity and text chunk ingested by cognee was also embedded and stored
      in LanceDB as a vector. LanceDB computes the distance between the query
      vector and every stored vector, then returns the nearest ones.

      Distance metric: L2 (Euclidean distance). Smaller = more similar.
      We convert it to a 0-1 score with score = 1 / (1 + distance) so that
      higher score = better match, which is easier to read.

    What the collections are:
      Entity_name       — named entities Claude extracted (e.g. "overtime", "overtime barrier")
      DocumentChunk_text — raw text chunks from the PDF pages
      TextSummary_text  — summaries of each chunk
      EdgeType_*        — the relationship labels on edges (e.g. "governs", "excludes")

    What you get back:
      A ranked list of (score, collection, text) tuples — the raw similarity hits
      before any graph reasoning has happened.
      Also returns the top Entity hit, which becomes the graph entry point.
    """
    db = lancedb.connect(LANCEDB_PATH)
    print(f"  LanceDB collections: {db.table_names()}\n")

    hits = []
    for coll_name in db.table_names():
        try:
            tbl = db.open_table(coll_name)
            results = tbl.search(query_vec).limit(3).to_list()
            for row in results:
                dist = row.get("_distance", 1.0)
                score = 1 / (1 + dist)           # convert distance → similarity score
                text = (row.get("payload") or {}).get("text", "") or ""
                hits.append((score, coll_name, str(text)[:80]))
        except Exception:
            continue

    hits.sort(reverse=True)

    print(f"  Top 8 matches by similarity score:\n")
    print(f"  {'Score':>6}  {'Collection':<25}  Stored text")
    print(f"  {'------':>6}  {'-----------':<25}  -----------")
    for score, coll, text in hits[:8]:
        print(f"  {score:>6.4f}  {coll:<25}  {text}")

    # The top Entity hit is used as the starting node for graph traversal.
    # (Entity_name holds the named concepts — agreement, overtime, barrier etc.)
    entry_point = next((text for _, coll, text in hits[:8] if "Entity" in coll), None)
    print(f"\n  → Entry point for graph traversal: {entry_point!r}")
    print(f"  NOTE: vectors found 'overtime' — a plain search would stop here")
    print(f"        and return the overtime rates. The graph goes further.\n")

    return hits, entry_point


async def traverse_graph(entry_point: str | None) -> None:
    """
    Starting from the vector entry point, walk the typed relationship links in the graph.

    How it works:
      The graph stores named nodes connected by labelled edges, e.g.:
        overtime --[eligibility_determined_by]--> overtime barrier
        overtime barrier --[defined_as]--> corporate services level 3
        director of aviation safety --[excluded_from]--> agreement

      We look up the entry point node by name, then collect all edges where
      it appears as source or destination. That gives us the immediate neighbourhood.

      We also highlight the 'trap' edges — the ones that encode the multi-hop
      legal reasoning plain search can never reach because the clauses share
      no vocabulary.

    Why this matters:
      The vector search landed on 'overtime' (correct entry point).
      The graph then reveals that overtime eligibility depends on the barrier,
      AND that Medical Officers are excluded from the agreement entirely —
      a fact that lives 40 pages away from the overtime clause.
    """
    graph_engine = await get_graph_engine()
    nodes, edges = await graph_engine.get_graph_data()

    # Build lookup maps: name → node_id and node_id → name
    node_map   = {attrs.get("name", "").lower(): nid  for nid, attrs in nodes}
    id_to_name = {nid: attrs.get("name", str(nid)[:8]) for nid, attrs in nodes}

    # Show edges directly connected to the entry point node
    if entry_point:
        entry_id = node_map.get(entry_point.lower())
        outgoing = [(rel, id_to_name.get(dst, dst)) for src, dst, rel, _ in edges if src == entry_id]
        incoming = [(rel, id_to_name.get(src, src)) for src, dst, rel, _ in edges if dst == entry_id]

        print(f"  Direct edges from '{entry_point}':")
        for rel, other in outgoing:
            print(f"    [{entry_point}]  --[{rel}]-->  [{other}]")
        print(f"\n  Direct edges into '{entry_point}':")
        for rel, other in incoming:
            print(f"    [{other}]  --[{rel}]-->  [{entry_point}]")

    # Show the specific edges that encode the legal traps.
    # These are the relationships plain search CANNOT find because the
    # source and destination clauses share no vocabulary.
    trap_rels = {
        "excluded_from",             # Medical Officers excluded from agreement
        "eligibility_determined_by", # overtime eligibility depends on barrier
        "defined_as",                # barrier is defined as CSL3
        "applies_to_employees_under",# emergency duty scoped by barrier too
        "governs",                   # agreement governs each entitlement
    }
    print(f"\n  Trap edges (multi-hop links plain search misses):")
    for src, dst, rel, _ in edges:
        if rel in trap_rels:
            src_name = id_to_name.get(src, src)
            dst_name = id_to_name.get(dst, dst)
            print(f"    [{src_name}]  --[{rel}]-->  [{dst_name}]")


async def get_answer(query: str) -> None:
    """
    Pass the query to cognee.recall(), which runs the full relay internally
    and returns an LLM-generated answer grounded in the graph context.

    How it works internally (what cognee does for us):
      1. Embeds the query (same as Stage 1)
      2. Finds vector entry points across all collections
      3. Loads the subgraph reachable from those entry points
      4. Serialises the subgraph into a text context
      5. Sends context + question to Claude Sonnet → structured answer

    The answer should cite graph relationships, not just retrieve text chunks.
    That is the difference between a graph-grounded answer and a RAG answer.
    """
    results = await cognee.recall(query)
    for r in results:
        print(r.text)


# ── Orchestrator ──────────────────────────────────────────────────────────────

async def main():
    print("=" * 65)
    print(f"QUERY: {QUERY!r}")
    print("=" * 65)

    print("\n── STAGE 1: EMBED + VECTOR SEARCH ───────────────────────────\n")
    query_vec = embed_query(QUERY)
    hits, entry_point = search_vectors(query_vec)

    print("\n── STAGE 2: GRAPH TRAVERSAL ──────────────────────────────────\n")
    await traverse_graph(entry_point)

    print("\n── STAGE 3: LLM ANSWER (graph-grounded) ─────────────────────\n")
    await get_answer(QUERY)


if __name__ == "__main__":
    asyncio.run(main())
