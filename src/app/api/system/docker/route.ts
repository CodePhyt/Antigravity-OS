import { NextResponse } from 'next/server';
import {
  listContainers,
  listImages,
  removeContainer,
  removeImage,
  isDockerAvailable,
} from '@/services/docker-service';

// Security: Whitelist allowed image prefixes
const ALLOWED_IMAGE_PREFIXES = ['antigravity', 'test-', 'dev-'];

export async function GET() {
  try {
    // Check if Docker is available
    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      return NextResponse.json({
        success: false,
        error: 'Docker not available or not running',
        containers: [],
        images: [],
      });
    }

    // Use pure functions from docker-service
    const containers = await listContainers();
    const images = await listImages();

    return NextResponse.json({
      success: true,
      containers,
      images,
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

    // Use pure functions from docker-service
    if (type === 'container') {
      await removeContainer(id);
      return NextResponse.json({
        success: true,
        message: `Container ${id} removed`,
      });
    } else if (type === 'image') {
      await removeImage(id);
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
