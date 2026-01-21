import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Security: Whitelist allowed ports
const ALLOWED_PORTS = [3000, 3001, 5432, 8080, 8000, 5000, 4000];

export async function GET() {
  try {
    // Get active ports on Windows
    const { stdout } = await execAsync('netstat -ano | findstr LISTENING');

    const ports = new Set<number>();
    const portProcessMap: Record<number, string> = {};

    stdout.split('\n').forEach((line) => {
      const match = line.match(/:(\d+)\s+.*\s+(\d+)$/);
      if (match && match[1] && match[2]) {
        const port = parseInt(match[1]);
        const pid = match[2];
        if (ALLOWED_PORTS.includes(port)) {
          ports.add(port);
          portProcessMap[port] = pid;
        }
      }
    });

    return NextResponse.json({
      success: true,
      ports: Array.from(ports).map((port) => ({
        port,
        pid: portProcessMap[port],
        status: 'active',
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch ports',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { port } = await request.json();

    // Security: Validate port is in whitelist
    if (!ALLOWED_PORTS.includes(port)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Port not in whitelist',
        },
        { status: 403 }
      );
    }

    // Get PID for port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const match = stdout.match(/\s+(\d+)$/m);

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: 'Port not found',
        },
        { status: 404 }
      );
    }

    const pid = match[1];

    // Kill process
    await execAsync(`taskkill /PID ${pid} /F`);

    return NextResponse.json({
      success: true,
      message: `Process on port ${port} terminated`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to kill process',
      },
      { status: 500 }
    );
  }
}
