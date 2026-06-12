"""
Extracts a focused subset of the CASA Agreement into a smaller PDF for testing.

Selected pages cover the two "trap" multi-hop cases:
  - Clause 3   (coverage + Clause 3.1.2.2 exclusion of Medical Officers/Senior Managers)
  - Clause 6   (definitions, including the Overtime barrier definition)
  - Clause 36  (overtime: eligibility barrier, rates, rest relief, time-in-lieu)
  - Clause 37  (emergency duty — shares the overtime barrier rule)
"""
import pypdf
from pathlib import Path

SOURCE = "data/source/casa-enterprise-agreement-2023-26.pdf"
OUTPUT = "data/processed/casa-subset.pdf"

# 0-indexed page numbers from the source PDF
PAGES = [
    0,          # Cover page
    2,          # Clause 1-3: purpose, title, coverage + exclusions (the Medical Officer trap)
    3,          # Clause 6 definitions part 1
    4,          # Clause 6 definitions part 2: Overtime barrier definition
    23,         # Clause 36.1: overtime eligibility (the barrier trap)
    24,         # Clause 36.2-36.3: overtime rates + minimum payment
    25,         # Clause 36.4-36.5: meal allowance + rest relief
    26,         # Clause 36.6-37: time-in-lieu + emergency duty
]

reader = pypdf.PdfReader(SOURCE)
writer = pypdf.PdfWriter()

for page_num in PAGES:
    writer.add_page(reader.pages[page_num])

with open(OUTPUT, "wb") as f:
    writer.write(f)

print(f"Created {OUTPUT} ({len(PAGES)} pages from {len(reader.pages)})")
print("\nPages included:")
labels = [
    "Cover",
    "Clauses 1-3: Purpose, Title, Coverage + Medical Officer exclusion (3.1.2.2)",
    "Clause 6: Definitions part 1",
    "Clause 6: Definitions part 2 — Overtime barrier (CSL3) defined here",
    "Clause 36.1: Overtime eligibility — barrier rule (36.1.1)",
    "Clause 36.2-36.3: Overtime rates + minimum payment",
    "Clause 36.4-36.5: Meal allowance + rest relief after overtime",
    "Clause 36.6-37: Time-in-lieu + Emergency duty",
]
for p, label in zip(PAGES, labels):
    print(f"  PDF p.{p+1:2d}  →  {label}")
