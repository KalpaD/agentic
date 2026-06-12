"""
Step 3 — Ingest the full CASA PDF into cognee.
This will take several minutes: the PDF is ~150 pages and every chunk
goes through Claude for entity/relationship extraction.

Run from the ontology/ directory with the venv active:
    python ingest_casa.py
"""
import asyncio
import time
from pathlib import Path
import cognee

PDF_PATH = "data/processed/casa-subset.pdf"
DATASET  = "casa_agreement"


async def main():
    # Fresh slate — remove any previous CASA ingest
    print("Pruning previous data...")
    await cognee.prune.prune_data()
    await cognee.prune.prune_system(metadata=True)

    print(f"Ingesting {PDF_PATH} — this will take several minutes...\n")
    start = time.time()

    pdf_abs_path = str(Path(PDF_PATH).resolve())
    await cognee.remember(pdf_abs_path, dataset_name=DATASET)

    elapsed = time.time() - start
    print(f"\nDone in {elapsed:.0f}s")
    print(f"Dataset: {DATASET!r}")
    print("\nVerify — run: python explore/inspect_graph.py")


if __name__ == "__main__":
    asyncio.run(main())
