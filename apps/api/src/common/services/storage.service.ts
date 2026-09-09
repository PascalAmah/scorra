import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

  /**
   * Resolve a storage key to an absolute path, tolerating keys that already
   * carry the base directory prefix (e.g. stored fileUrl from upload()).
   */
  private resolve(key: string): string {
    const base = path.resolve(this.baseDir);
    const abs = path.resolve(key);
    if (abs === base || abs.startsWith(base + path.sep)) return abs;
    return path.join(base, key);
  }

  async upload(buffer: Buffer, key: string): Promise<string> {
    const filePath = this.resolve(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolve(key);
    try {
      return await fs.readFile(filePath);
    } catch {
      throw new InternalServerErrorException(`File not found: ${key}`);
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist — no-op
    }
  }

  async getUrl(key: string): Promise<string> {
    return this.resolve(key);
  }
}

/**
 * Supabase Storage driver — uploads files to a Supabase project bucket.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
class SupabaseStorageDriver implements StorageDriver {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(supabaseUrl: string, serviceRoleKey: string, bucket: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey);
    this.bucket = bucket;
  }

  async upload(buffer: Buffer, key: string, contentType?: string): Promise<string> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, buffer, {
        contentType: contentType ?? 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      throw new InternalServerErrorException(`Supabase upload failed: ${error.message}`);
    }

    // Return the storage key (not the public URL) so callers can round-trip
    // it through download()/delete() — e.g. Dataset.fileUrl is used as a key.
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(key);

    if (error) {
      throw new InternalServerErrorException(`Supabase download failed: ${error.message}`);
    }

    return Buffer.from(await data.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([key]);

    if (error) {
      // Log but don't throw — file may not exist
      console.warn(`Supabase delete warning: ${error.message}`);
    }
  }

  async getUrl(key: string): Promise<string> {
    const { data } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(key);

    return data.publicUrl;
  }
}

@Injectable()
export class StorageService {
  private readonly driver: StorageDriver;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const driverType = configService.get<string>('STORAGE_DRIVER', 'local');

    if (driverType === 'supabase') {
      const supabaseUrl = configService.get<string>('SUPABASE_URL');
      const serviceRoleKey = configService.get<string>('SUPABASE_SECRET_KEY');
      const bucket = configService.get<string>('SUPABASE_STORAGE_BUCKET', 'uploads');

      if (!supabaseUrl || !serviceRoleKey) {
        throw new InternalServerErrorException(
          'Supabase storage requires SUPABASE_URL and SUPABASE_SECRET_KEY',
        );
      }

      this.driver = new SupabaseStorageDriver(supabaseUrl, serviceRoleKey, bucket);
      this.logger.log(`Storage driver: supabase (bucket: ${bucket})`);
    } else {
      const uploadDir = configService.get<string>(
        'UPLOAD_DIR',
        path.join(process.cwd(), 'uploads'),
      );
      this.driver = new LocalStorageDriver(uploadDir);
      this.logger.log(`Storage driver: local (${uploadDir})`);
    }
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
