import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'clear-cache':
        // Clear .next cache
        try {
          await fs.rm(path.join(process.cwd(), '.next'), { recursive: true, force: true });
          return NextResponse.json({
            success: true,
            message: '.next cache cleared',
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to clear cache',
            },
            { status: 500 }
          );
        }

      case 'clear-tmp':
        // Clear .tmp folder
        try {
          await fs.rm(path.join(process.cwd(), '.tmp'), { recursive: true, force: true });
          await fs.mkdir(path.join(process.cwd(), '.tmp'), { recursive: true });
          return NextResponse.json({
            success: true,
            message: '.tmp folder cleared',
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to clear tmp',
            },
            { status: 500 }
          );
        }

      case 'reset-telemetry':
        // Reset telemetry.json to baseline
        try {
          const baseline = {
            metrics: {
              ralphLoopActivations: 0,
              ralphLoopSuccesses: 0,
              ralphLoopFailures: 0,
              ralphLoopExhaustions: 0,
              autonomousFixes: 0,
              specUpdates: 0,
              tasksCompleted: 0,
              tasksFailed: 0,
              testsPassed: 0,
              testsFailed: 0,
              uptime: 0,
              startTime: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
              successRate: 0,
              ralphLoopEffectiveness: 0,
            },
            recentEvents: [],
            generatedAt: new Date().toISOString(),
          };

          await fs.writeFile(
            path.join(process.cwd(), 'docs', 'telemetry.json'),
            JSON.stringify(baseline, null, 2)
          );

          return NextResponse.json({
            success: true,
            message: 'Telemetry reset to baseline',
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to reset telemetry',
            },
            { status: 500 }
          );
        }

      case 'zero-point':
        // Full system reset
        try {
          // Clear cache
          await fs.rm(path.join(process.cwd(), '.next'), { recursive: true, force: true });

          // Clear tmp
          await fs.rm(path.join(process.cwd(), '.tmp'), { recursive: true, force: true });
          await fs.mkdir(path.join(process.cwd(), '.tmp'), { recursive: true });

          return NextResponse.json({
            success: true,
            message: 'Zero-point reset complete',
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to execute zero-point reset',
            },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'System reset failed',
      },
      { status: 500 }
    );
  }
}
