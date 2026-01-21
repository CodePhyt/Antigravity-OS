import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Security: Whitelist allowed image prefixes
const ALLOWED_IMAGE_PREFIXES = ['antigravity', 'test-', 'dev-'];

export async function GET() {
  try {
    // Get Docker containers
    const { stdout: containers } = await execAsync(
      'docker ps -a --format "{{.ID}}|{{.Image}}|{{.Status}}"'
    );

    // Get Docker images
    const { stdout: images } = await execAsync(
      'docker images --format "{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}"'
    );

    const containerList = containers
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [id, image, status] = line.split('|');
        return { id, image, status };
      });

    const imageList = images
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [name, id, size] = line.split('|');
        return { name, id, size };
      });

    return NextResponse.json({
      success: true,
      containers: containerList,
      images: imageList,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Docker not available or not running',
      containers: [],
      images: [],
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const { type, id, name } = await request.json();

    // Security: Validate image name prefix
    if (type === 'image' && name) {
      const isAllowed = ALLOWED_IMAGE_PREFIXES.some((prefix) => name.startsWith(prefix));
      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Image not in whitelist',
          },
          { status: 403 }
        );
      }
    }

    if (type === 'container') {
      await execAsync(`docker rm -f ${id}`);
      return NextResponse.json({
        success: true,
        message: `Container ${id} removed`,
      });
    } else if (type === 'image') {
      await execAsync(`docker rmi -f ${id}`);
      return NextResponse.json({
        success: true,
        message: `Image ${id} removed`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid type',
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove Docker resource',
      },
      { status: 500 }
    );
  }
}
