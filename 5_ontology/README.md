## 5. Ontology

**ontology** = vocabulary

**graph** = the wired-up facts in that vocabulary

**semantic search** = the meaning-based way in

**agent** = the thing that queries all of it to converse with you about the law while you bring the system-design expertise.


On `lesson2_case.ttl`
#### Question : 
A plain-search agent does one thing: it finds the chunk of text that looks most like the question.
That's Clause 36 — the overtime clause, with the rates right there.
So it reads Clause 36 and answers "time-and-a-half for the first 3 hours…"
But that answer is wrong, because the correct answer lives in a totally different place — Clause 3.1.2.2, ~40 pages away,
which says Medical Officers aren't even covered by this agreement.
Clause 36 never mentions Medical Officers. Clause 3.1.2.2 never mentions overtime.
The two clauses share almost no words.
So my question is really: why does plain search get stuck at Clause 36 and never reach Clause 3.1.2.2 — but the graph does reach it?
What is it about how each one works that makes the difference?

#### Answer
Plain search matches on similarity of meaning/words.
It turns "Medical Officer overtime" into a vector and grabs the chunks that sound closest. Clause 3.1.2.2 sounds nothing like the question — no "overtime," no "pay," it's dry coverage/exclusion language — so it ranks low and never surfaces. Plain search has no notion that 3.1.2.2 governs 36; to it they're just two unrelated paragraphs with different words.
The graph doesn't care about wording at all. It follows the typed links you built — exceptionTo, excludesType — regardless of vocabulary overlap. That's why it crosses the 40-page gap that similarity can't.

#### Important Takeaway

(the ontology, which you control, not the LLM) and you drew the right big conclusion:
the ontology is the quality ceiling; the extractor can only link what the vocabulary
lets it express. 

#### Semantic Search
What semantic search actually does
Every clause gets turned into a vector, a long list of numbers (say 256 of them) that encodes its meaning,
produced by a model trained on huge text so that passages with similar meaning land at nearby points,
even with zero shared words. Your query becomes a vector the same way.
"Search" = find the clause vectors closest to the query vector (cosine similarity).

The right answer is 36.5.1 Rest relief — "minimum of 8 consecutive hours off work… between ceasing overtime and recommencing work.
" Now read both carefully: the query and that clause share no content words.
No "rest," no "relief," no "8 hours," no "recovery," no "tired."
A keyword search scores them zero overlap and would never connect them.
A good embedding model still ranks 36.5.1 first,
because it learned that 
tired ↔ rest, 
recovery time ↔ hours off,
returning to duty ↔ recommencing work mean the same thing.

That gap — matching on meaning across totally different vocabulary — is the entire point of semantic search.

**Why you need this even with your beautiful graph ?**

Here's the crux, and it's the reason cognee bothers to do both:
Your graph is brilliant at "follow the links" — but only once you know where to start. Every graph query we ran began at a known entity: casa:MedicalOfficer, casa:Clause_3_1. The graph has no good way to take a vague human sentence — "what happens when someone's too wiped out to keep working safely?" — and figure out which node that's even about. It can't fuzzy-match. You'd have to already know it's clause 36.5 about rest relief.
Semantic search is the opposite: terrible at multi-hop reasoning, but excellent at turning fuzzy human language into "you probably mean clause 36.5."
So they're not competitors — they're a relay, and this is the whole architecture:

Semantic search finds the entry point. Messy question → nearest clause/entity. ("You mean Rest relief, 36.5.1.")
The graph traverses from there. From that node, follow exceptionTo, excludesType, appliesTo… to assemble the full, correct, connected answer with its exceptions and cross-references.

Vectors get you in the door; the graph walks you through the building.
That hybrid — embeddings + graph — is exactly what cognee combines (it was the one verified thing from my first search: "combines vector similarity and graph relationship retrieval").
Now you can see why it combines them, instead of taking it on faith.
That's semantic search and, crucially, its division of labour with the graph. Every piece you named is now on the table: ontology → triples → graph → semantic search → and the relay that joins them.

#### How it works when we put eveything together
ontology (your curated rulebook) → LLM extraction turns prose into triples → stored as a knowledge graph + vector embeddings → at query time, vectors find the entry, graph traverses → MCP hands that context to the agent → grounded conversation.