# Step 1 — Install

Step 1 is pure shell — no Python script. Run these commands once from the project root (`ontology/`).

## Commands

```bash
# Check Python version (must be 3.10–3.14)
python3 --version

# Create the virtual environment
python3 -m venv .venv
source .venv/bin/activate   # Mac/Linux
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install --upgrade pip
pip install cognee anthropic fastembed
```

## Configure your API key

Edit `.env` and replace the placeholder:
```
LLM_API_KEY=your-anthropic-api-key-here
```

Get a key at https://console.anthropic.com

## Verify

Both of these must succeed:

```bash
python -c "import cognee; print('cognee', cognee.__version__)"
cognee-cli --help
```

Expected output: `cognee 1.1.2` (or later) and the CLI help text.

## What was installed

| Package | Purpose |
|---------|---------|
| `cognee` | Core framework — orchestrates LLM extraction, graph storage, vector search |
| `anthropic` | Anthropic SDK — used by cognee for LLM calls to Claude |
| `fastembed` | Local embedding model — converts text to vectors without an API call |

cognee also pulls in `lancedb` (vector store) and its own `ladybug` graph database as dependencies.
