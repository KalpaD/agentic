"""
Dumps the current cognee graph two ways:
  1. Prints all nodes + edges to the terminal
  2. Writes an interactive HTML visualization to graph.html
Run with the venv active from the ontology/ directory.
"""
import asyncio
import cognee
from cognee.infrastructure.databases.graph import get_graph_engine


async def main():
    graph_engine = await get_graph_engine()
    graph_data = await graph_engine.get_graph_data()

    nodes, edges = graph_data

    print(f"\n=== NODES ({len(nodes)}) ===")
    for node_id, attrs in nodes:
        name = attrs.get("name") or attrs.get("id") or node_id
        kind = attrs.get("type", "?")
        print(f"  [{kind}]  {name}")

    print(f"\n=== EDGES ({len(edges)}) ===")
    for src, dst, rel, attrs in edges:
        src_name = dict(nodes).get(src, {}).get("name") or src[:8]
        dst_name = dict(nodes).get(dst, {}).get("name") or dst[:8]
        print(f"  {src_name}  --[{rel}]-->  {dst_name}")

    # Write interactive HTML
    import os
    out = os.path.abspath("output/graph.html")
    await cognee.visualize_graph(destination_file_path=out)
    print(f"\nInteractive graph saved → {out}  (open in browser)")


if __name__ == "__main__":
    asyncio.run(main())
