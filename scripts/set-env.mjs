import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const { SUPABASE_URL, SUPABASE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const content = `export const environment = {
  supabaseUrl: '${SUPABASE_URL}',
  supabaseKey: '${SUPABASE_KEY}',
};
`;

mkdirSync('src/environments', { recursive: true });

for (const file of ['environment.ts', 'environment.development.ts']) {
  writeFileSync(`src/environments/${file}`, content);
}

console.log('Supabase environment files created.');
