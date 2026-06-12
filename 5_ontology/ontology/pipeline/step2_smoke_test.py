"""
Step 2 smoke test — verifies Anthropic LLM + fastembed embeddings are wired up.
Run from the ontology/ directory with the venv active:
    python smoke_test.py
"""
import asyncio
import cognee

async def main():
    await cognee.prune.prune_data()
    await cognee.prune.prune_system(metadata=True)

    fact = "The CASA Enterprise Agreement 2023-2026 covers all employees except Medical Officers."
    print(f"Remembering: {fact!r}")
    await cognee.remember(fact)

    print("Recalling: 'Who is excluded from the CASA agreement?'")
    results = await cognee.recall("Who is excluded from the CASA agreement?")
    print("\n--- Results ---")
    for r in results:
        print(r)

if __name__ == "__main__":
    asyncio.run(main())
