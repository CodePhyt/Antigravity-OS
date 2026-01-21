import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const telemetryPath = path.join(process.cwd(), 'docs', 'telemetry.json');
    if (!fs.existsSync(telemetryPath))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data = JSON.parse(fs.readFileSync(telemetryPath, 'utf8'));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
