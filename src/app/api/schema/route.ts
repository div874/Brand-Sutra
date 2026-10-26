import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({ error: 'schema.sql file not found' }, { status: 404 });
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    return NextResponse.json({ sql });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to read schema' },
      { status: 500 }
    );
  }
}
