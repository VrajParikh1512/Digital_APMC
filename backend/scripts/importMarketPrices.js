/**
 * One-time CSV import script for agmarknet cleaned data.
 * Run directly: node backend/scripts/importMarketPrices.js
 *
 * Also exports `runImport()` so the Admin API can trigger a re-import.
 * Requires MONGODB_URI in backend/.env
 * CSV files must be present in ../../agmarknet_cleaned/ relative to this script.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MarketPrice from '../models/MarketPrice.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const CSV_DIR = path.resolve(__dirname, '..', '..', 'agmarknet_cleaned');

const CSV_FILES = [
  'vegetables.csv',
  'fruits.csv',
  'cereals.csv',
  'pulses.csv',
  'spices.csv',
  'oilSeeds.csv',
  'fibreCrops.csv',
  'dryFruits.csv',
];

const BATCH_SIZE = 5000;

/**
 * Parse a single CSV file and insert rows in batches.
 * @param {string} filePath - Absolute path to the CSV file.
 * @returns {Promise<number>} Number of rows inserted.
 */
async function importFile(filePath) {
  const fileName = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  Skipping ${fileName} (file not found)`);
    return 0;
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let headers = null;
  let batch   = [];
  let total   = 0;
  let skipped = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!headers) {
      headers = trimmed.split(',').map(h => h.trim());
      continue;
    }

    const cols = trimmed.split(',');
    const row  = {};
    headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim(); });

    const dateVal = row['date'] ? new Date(row['date']) : null;
    if (!dateVal || isNaN(dateVal.getTime()) || !row['commodity']) {
      skipped++;
      continue;
    }

    batch.push({
      state:           row['state']           || null,
      district:        row['district']        || null,
      commodity_group: row['commodity_group'] || null,
      commodity:       row['commodity']       || null,
      date:            dateVal,
      min_price:       row['min_price']   !== '' ? parseFloat(row['min_price'])   : null,
      modal_price:     row['modal_price'] !== '' ? parseFloat(row['modal_price']) : null,
      max_price:       row['max_price']   !== '' ? parseFloat(row['max_price'])   : null,
      price_unit:      row['price_unit']  || null,
      arrival_qty:     row['arrival_qty'] !== '' ? parseFloat(row['arrival_qty']) : null,
      arrival_unit:    row['arrival_unit'] || null,
      msp:             row['msp']         !== '' ? parseFloat(row['msp'])         : null,
    });

    if (batch.length >= BATCH_SIZE) {
      await MarketPrice.insertMany(batch, { ordered: false });
      total += batch.length;
      process.stdout.write(`\r  Inserted ${total.toLocaleString()} rows...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await MarketPrice.insertMany(batch, { ordered: false });
    total += batch.length;
  }

  console.log(`\r  ✅ ${fileName}: ${total.toLocaleString()} rows inserted, ${skipped} skipped`);
  return total;
}

/**
 * Core import logic — exported so the Admin API route can call it.
 * Assumes MongoDB is already connected when called from the API.
 * When called standalone (CLI), it connects/disconnects itself.
 * @param {boolean} standalone - true when run from CLI (handles DB connection)
 */
export async function runImport(standalone = false) {
  if (standalone) {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set in backend/.env');
      process.exit(1);
    }
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');
  }

  console.log('🗑️  Dropping existing marketprices collection...');
  await mongoose.connection.dropCollection('marketprices').catch(() => {
    console.log('   (Collection did not exist — creating fresh)');
  });

  let grandTotal = 0;
  const startTime = Date.now();

  for (const file of CSV_FILES) {
    const fp = path.join(CSV_DIR, file);
    console.log(`\n📂 Importing ${file}...`);
    const count = await importFile(fp);
    grandTotal += count;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Import complete! ${grandTotal.toLocaleString()} total rows in ${elapsed}s`);

  if (standalone) {
    await mongoose.disconnect();
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────
// Only runs when executed directly: node scripts/importMarketPrices.js
const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMain) {
  runImport(true).catch(err => {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  });
}
