import { NextResponse } from 'next/server';
import { readTelemetry } from '@/services/telemetry-service';

export async function GET() {
  try {
    // Use pure function from telemetry-service
    const data = await readTelemetry();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to read telemetry data',
      },
      { status: 500 }
    );
  }
}
