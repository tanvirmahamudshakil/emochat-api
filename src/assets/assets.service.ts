import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

@Injectable()
export class AssetsService {
  private readonly assetsRoot = resolve(process.cwd(), 'assets');

  ensureCategoryDirectory(category: string): string {
    const safeCategory = this.sanitizeCategory(category);
    if (!safeCategory) {
      throw new BadRequestException('Invalid `category` value');
    }

    const targetDirectory = join(this.assetsRoot, safeCategory);

    if (!existsSync(targetDirectory)) {
      mkdirSync(targetDirectory, { recursive: true });
    }

    return targetDirectory;
  }

  getCategoryAssets(category: string): {
    category: string;
    assets: string[];
  } {
    const safeCategory = this.sanitizeCategory(category);
    if (!safeCategory) {
      throw new BadRequestException('Invalid `category` value');
    }

    const targetDirectory = join(this.assetsRoot, safeCategory);
    if (!existsSync(targetDirectory)) {
      return {
        category: safeCategory,
        assets: [],
      };
    }

    const assets = readdirSync(targetDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    return {
      category: safeCategory,
      assets,
    };
  }

  getAllCategoryAssets(): Array<{
    category: string;
    assets: string[];
  }> {
    if (!existsSync(this.assetsRoot)) {
      return [];
    }

    const categories = readdirSync(this.assetsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !entry.name.startsWith('.'))
      .map((entry) => entry.name);

    return categories.map((category) => this.getCategoryAssets(category));
  }

  getProfileAssetsInfo() {
    if (!existsSync(this.assetsRoot)) {
      return {
        totalAssets: 0,
        totalDownloadSizeBytes: 0,
        totalDownloadSizeMB: 0,
        categories: [],
      };
    }

    const categoryNames = readdirSync(this.assetsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    let totalBytes = 0;
    const categories = categoryNames.map((category) => {
      const folderPath = join(this.assetsRoot, category);
      const files = this.collectFilesRecursively(folderPath).map((filePath) => {
        const sizeBytes = statSync(filePath).size;
        totalBytes += sizeBytes;

        return {
          fileName: filePath.split(/[\\/]/).pop() ?? '',
          path: join('assets', relative(this.assetsRoot, filePath)).replace(
            /\\/g,
            '/',
          ),
          sizeBytes,
          sizeMB: this.toMB(sizeBytes),
        };
      });

      const categoryBytes = files.reduce(
        (sum, item) => sum + item.sizeBytes,
        0,
      );

      return {
        category,
        totalAssets: files.length,
        totalSizeBytes: categoryBytes,
        totalSizeMB: this.toMB(categoryBytes),
        assets: files,
      };
    });

    let processedBytes = 0;
    const categoriesWithProgress = categories.map((category) => {
      const assets = category.assets.map((asset) => {
        processedBytes += asset.sizeBytes;
        const progressPercent =
          totalBytes === 0
            ? 0
            : Number(((processedBytes / totalBytes) * 100).toFixed(2));

        return {
          ...asset,
          cumulativeDownloadedBytes: processedBytes,
          cumulativeProgressPercent: progressPercent,
        };
      });

      return {
        ...category,
        assets,
      };
    });

    const totalAssets = categoriesWithProgress.reduce(
      (sum, category) => sum + category.totalAssets,
      0,
    );

    return {
      totalAssets,
      totalDownloadSizeBytes: totalBytes,
      totalDownloadSizeMB: this.toMB(totalBytes),
      categories: categoriesWithProgress,
    };
  }

  sanitizeCategory(category: string): string {
    return category.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  }

  private toMB(bytes: number): number {
    return Number((bytes / (1024 * 1024)).toFixed(2));
  }

  private collectFilesRecursively(directoryPath: string): string[] {
    if (!existsSync(directoryPath)) {
      return [];
    }

    return readdirSync(directoryPath, { withFileTypes: true }).flatMap(
      (entry) => {
        if (entry.name.startsWith('.')) {
          return [];
        }

        const entryPath = join(directoryPath, entry.name);

        if (entry.isFile()) {
          return [entryPath];
        }

        if (entry.isDirectory()) {
          return this.collectFilesRecursively(entryPath);
        }

        return [];
      },
    );
  }
}
