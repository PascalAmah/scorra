import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface StorageDriver {
  upload(buffer: Buffer, key: string, contentType?: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}

/**
 * Local disk storage driver — writes files to a configurable directory.
 * Used in development and self-hosted deployments.
 */
class LocalStorageDriver implements StorageDriver {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async upload(buffer: Buffer, key: string): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, key);
    try {
      return await fs.readFile(filePath);
    } catch {
      throw new InternalServerErrorException(`File not found: ${key}`);
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist — no-op
    }
  }

  async getUrl(key: string): Promise<string> {
    return path.join(this.baseDir, key);
  }
}

@Injectable()
export class StorageService {
  private readonly driver: StorageDriver;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const driverType = configService.get<string>('STORAGE_DRIVER', 'local');
    const uploadDir = configService.get<string>(
      'UPLOAD_DIR',
      path.join(process.cwd(), 'uploads'),
    );

    if (driverType === 's3') {
      throw new InternalServerErrorException(
        'S3 storage driver not yet implemented. Set STORAGE_DRIVER=local or install @aws-sdk/client-s3.',
      );
    }

    this.driver = new LocalStorageDriver(uploadDir);
    this.logger.log(`Storage driver: local (${uploadDir})`);
  }

  getDriver(): StorageDriver {
    return this.driver;
  }

  async upload(buffer: Buffer, key: string, contentType?: string): Promise<string> {
    return this.driver.upload(buffer, key, contentType);
  }

  async download(key: string): Promise<Buffer> {
    return this.driver.download(key);
  }

  async delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  async getUrl(key: string): Promise<string> {
    return this.driver.getUrl(key);
  }
}
