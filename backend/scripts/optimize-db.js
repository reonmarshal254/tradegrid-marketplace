#!/usr/bin/env node

/**
 * Database query optimization script
 * Adds indexes and analyzes tables for better query performance
 */

require('dotenv').config();
const { query } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function optimizeDatabase() {
  try {
    console.log('🚀 Starting database optimization...\n');

    const sqlPath = path.join(__dirname, '../src/db/optimize-queries.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 60)}...`);
      await query(statement);
      console.log('✓ Done\n');
    }

    console.log('✅ Database optimization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

optimizeDatabase();
