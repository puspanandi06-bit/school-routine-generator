import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env if present
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
if (fs.existsSync(schemaPath)) {
  let content = fs.readFileSync(schemaPath, 'utf8');
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
  const targetProvider = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')
    ? 'postgresql'
    : 'sqlite';

  const updated = content.replace(/provider\s*=\s*"(postgresql|sqlite)"/, `provider = "${targetProvider}"`);
  if (updated !== content) {
    fs.writeFileSync(schemaPath, updated, 'utf8');
    console.log(`[Database Provider] Synced Prisma provider to "${targetProvider}" based on DATABASE_URL.`);
  }
}
