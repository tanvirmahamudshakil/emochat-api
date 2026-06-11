/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import type { Request } from 'express';
import type { Response } from 'express';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}
  private readonly assetsRoot = resolve(process.cwd(), 'assets');

  @Get('profile-info')
  getProfileAssetsInfo() {
    return this.assetsService.getProfileAssetsInfo();
  }

  @Get('all')
  getAllAssetsByCategory() {
    const all = this.assetsService.getAllCategoryAssets();
    const data = all.map((item) => ({
      category: item.category,
      total: item.assets.length,
      assets: item.assets.map((fileName) =>
        join('assets', item.category, fileName).replace(/\\/g, '/'),
      ),
    }));

    return {
      totalCategories: data.length,
      data,
    };
  }

  @Get('by-category/:category')
  getAssetsByCategory(@Param('category') category: string) {
    const result = this.assetsService.getCategoryAssets(category);
    const assetPaths = result.assets.map((fileName) =>
      join('assets', result.category, fileName).replace(/\\/g, '/'),
    );

    return {
      category: result.category,
      total: assetPaths.length,
      assets: assetPaths,
    };
  }

  @Get('*')
  getAssetFile(@Req() req: Request, @Res() res: Response) {
    const normalizedPath = req.path.replace(/^\/assets\/?/, '').replace(/^\/+/, '');
    if (normalizedPath.split('/').some((part) => part.startsWith('.'))) {
      throw new NotFoundException(`Asset not found: ${normalizedPath}`);
    }

    const absolutePath = resolve(this.assetsRoot, normalizedPath);
    const relativePath = relative(this.assetsRoot, absolutePath);

    if (relativePath.startsWith('..') || relativePath.includes('..')) {
      throw new BadRequestException('Invalid asset path');
    }

    if (!existsSync(absolutePath)) {
      throw new NotFoundException(`Asset not found: ${normalizedPath}`);
    }

    return res.sendFile(absolutePath);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadAsset(@UploadedFile() file: any, @Body('category') category: string) {
    if (!category || typeof category !== 'string') {
      throw new BadRequestException('`category` is required');
    }

    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (extname(file.originalname).toLowerCase() !== '.svga') {
      throw new BadRequestException('Only .svga files are allowed');
    }

    const targetDirectory =
      this.assetsService.ensureCategoryDirectory(category);
    const fileName = basename(file.originalname);
    const targetPath = join(targetDirectory, fileName);
    writeFileSync(targetPath, file.buffer);

    const assetsRoot = resolve(process.cwd(), 'assets');
    const filePath = relative(assetsRoot, targetPath);
    const normalizedPath = join('assets', filePath).replace(/\\/g, '/');

    return {
      message: 'Asset uploaded successfully',
      fileName,
      path: normalizedPath,
    };
  }
}
