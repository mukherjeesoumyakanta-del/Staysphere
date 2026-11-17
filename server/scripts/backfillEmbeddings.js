#!/usr/bin/env node
/**
 * StaySphere Property Embeddings Backfill Script.
 * Scans MongoDB Atlas listings collection, normalizes searchable text,
 * generates 768-dimensional Google Gemini embeddings, and updates documents.
 * Safe to rerun idempotently.
 */

import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

import { Listing } from "../src/models/Listing.js";
import {
  buildPropertySearchText,
  createEmbeddingService,
  generateMockEmbedding,
} from "../src/services/embeddingService.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("\x1b[31m[Error] MONGO_URI is missing in .env\x1b[0m");
    process.exit(1);
  }

  console.log("\x1b[36m%s\x1b[0m", "=================================================");
  console.log("\x1b[36m%s\x1b[0m", "   StaySphere Atlas Vector Embeddings Backfill   ");
  console.log("\x1b[36m%s\x1b[0m", "=================================================");

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected to MongoDB Atlas.");

  const embedService = createEmbeddingService();
  const configured = embedService.isConfigured();
  console.log(
    `Embedding Model: ${embedService.model} (${embedService.dimensions} dims)`
  );
  console.log(
    `API Status: ${configured ? "Live Gemini Key Configured" : "Unconfigured/Test Mode (Using Mock Deterministic Vectors)"}`
  );

  const listings = await Listing.find({}).select("+embedding");
  console.log(`Found ${listings.length} total listings to inspect.\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const currentSearchText = buildPropertySearchText(listing);

    const hasValidVector =
      Array.isArray(listing.embedding) &&
      listing.embedding.length === embedService.dimensions;
    const isUpToDate =
      hasValidVector &&
      listing.searchText === currentSearchText &&
      listing.embeddingStatus === "COMPLETED";

    if (isUpToDate) {
      console.log(
        `[${i + 1}/${listings.length}] Skipped (Already up-to-date): "${listing.title}"`
      );
      skippedCount++;
      continue;
    }

    process.stdout.write(
      `[${i + 1}/${listings.length}] Generating vector for: "${listing.title}"... `
    );

    try {
      let vector;
      if (configured) {
        vector = await embedService.generateEmbedding(
          currentSearchText,
          "RETRIEVAL_DOCUMENT"
        );
      } else {
        vector = generateMockEmbedding(currentSearchText, embedService.dimensions);
      }

      await Listing.updateOne(
        { _id: listing._id },
        {
          $set: {
            searchText: currentSearchText,
            embedding: vector,
            embeddingModel: embedService.model,
            embeddingStatus: "COMPLETED",
            embeddingUpdatedAt: new Date(),
          },
        }
      );

      console.log("\x1b[32mCOMPLETED (768 dims)\x1b[0m");
      updatedCount++;
      await sleep(150); // Respect Gemini API rate limit
    } catch (err) {
      console.log(`\x1b[31mFAILED: ${err.message}\x1b[0m`);
      await Listing.updateOne(
        { _id: listing._id },
        {
          $set: {
            searchText: currentSearchText,
            embeddingStatus: "FAILED",
          },
        }
      ).catch(() => {});
      failedCount++;
    }
  }

  console.log("\n=================================================");
  console.log(`Backfill Complete!`);
  console.log(`- Updated: ${updatedCount}`);
  console.log(`- Skipped: ${skippedCount}`);
  console.log(`- Failed:  ${failedCount}`);
  console.log("=================================================");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill script error:", err);
  process.exit(1);
});
