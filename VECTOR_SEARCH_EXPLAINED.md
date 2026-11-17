# StaySphere — MongoDB Atlas Semantic Vector Search & Embeddings

This document explains the architecture, design choices, data flow, and viva questions for StaySphere's semantic vector search engine built for a final-year B.Tech Computer Science project.

---

## 1. What is Semantic Vector Search?

Traditional property search matches exact keywords or regexes (e.g. searching `"cottage"` will only return documents that contain the exact string `"cottage"`).

Semantic vector search transforms natural language text into high-dimensional numerical vectors (embeddings). Properties with semantically similar meanings cluster together in vector space:
- Searching for *"a peaceful hillside cabin with mountain views"* automatically surfaces listings described as *"serene wooden chalet"*, *"nature retreat"*, or *"isolated mountain homestay"*, even if they do not share a single word.

---

## 2. Technical Architecture & Components

```
User Query: "romantic sunset cottage near the beach"
               │
               ▼
[Google Gemini Embedding API] (models/gemini-embedding-001)
               │ (taskType: RETRIEVAL_QUERY, outputDimensionality: 768)
               ▼
   [768-dimensional Float Vector]
               │
               ▼
[MongoDB Atlas $vectorSearch Aggregation]
   ├── Index: property_vector_index
   ├── Metric: Cosine Similarity
   ├── Pre-filter: status: "ACTIVE"
   └── Limit: top K candidates (numCandidates: 100)
               │
               ▼
Sorted Results Ranked by Relevance Score
```

### Components:
1. **Embedding Model**: Google Gemini `gemini-embedding-001` (with `outputDimensionality: 768`).
2. **Dimension Size**: 768 floating-point values per vector, L2-normalized.
3. **Similarity Metric**: **Cosine similarity** ($\cos(\theta) = \frac{A \cdot B}{\|A\| \|B\|}$), which measures the directional angle between vectors regardless of text length.
4. **Database**: MongoDB Atlas with native Search Index `$vectorSearch`.
5. **Failover Architecture**: Graceful fallback to regex keyword search if Atlas Vector Search index is temporarily unavailable or if external API quotas are exhausted.

---

## 3. Privacy & Data Minimization

To preserve privacy and prevent prompt leakage:
1. Only public property characteristics are embedded:
   - Property Title
   - Property Type & Location (City, State)
   - Capacity (Bedrooms, Max Guests)
   - Public Description & Highlights
   - Amenities List
2. All sensitive data is strictly excluded from embedding generation:
   - No prices (prices are filtered dynamically via query filters, not embedded)
   - No host names, emails, phone numbers, or user IDs
   - No password hashes, session cookies, or auth tokens
3. In Mongoose, `embedding` is defined with `select: false` so that 768-float arrays are never returned in public listing queries, conserving API bandwidth.

---

## 4. Viva / Interview Questions & Answers

### Q1: Why use 768 dimensions instead of 1536 or 3072?
> **Answer:** 768 dimensions strike an optimal balance between semantic representation fidelity, RAM footprint, and retrieval latency for property search. With 768 dimensions, each vector consumes ~3 KB of storage, allowing thousands of property vectors to reside entirely in Atlas memory for sub-10ms similarity searches.

### Q2: Why Cosine Similarity instead of Euclidean Distance?
> **Answer:** Cosine similarity measures the angle between vectors rather than magnitude. In natural language descriptions, some hosts write long detailed paragraphs while others write concise summaries. Cosine similarity prevents longer descriptions from artificially dominating shorter ones.

### Q3: What happens if MongoDB Atlas Vector Search index is not yet built or Gemini is offline?
> **Answer:** The system implements defensive resilience. If `$vectorSearch` throws an `index not found` error, or if external API keys are unavailable, the `listingRepository` automatically catches the exception and falls back to MongoDB B-tree regex/keyword search without crashing or degrading user experience.

### Q4: How is the vector index created on MongoDB Atlas?
> **Answer:** In Atlas Search / Vector Search, an index named `property_vector_index` is created on the `listings` collection using the JSON definition:
> ```json
> {
>   "fields": [
>     {
>       "type": "vector",
>       "path": "embedding",
>       "numDimensions": 768,
>       "similarity": "cosine"
>     },
>     { "type": "filter", "path": "status" },
>     { "type": "filter", "path": "city" },
>     { "type": "filter", "path": "propertyType" }
>   ]
> }
> ```

---

## 5. Backfill Command

To index all properties in the database:
```bash
cd server
npm run embeddings:backfill
```
The script runs idempotently, skipping listings whose vectors and search text are already up to date.
