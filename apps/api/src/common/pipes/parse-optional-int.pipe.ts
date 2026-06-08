import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Ixtiyoriy son query-parametrlar uchun (masalan ?page=2&limit=20).
 * Qiymat berilmasa `undefined` qaytaradi, noto'g'ri format bo'lsa 400 tashlaydi.
 */
@Injectable()
export class ParseOptionalIntPipe implements PipeTransform<string | undefined, number | undefined> {
  transform(value: string | undefined, metadata: ArgumentMetadata): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      throw new BadRequestException(`"${metadata.data}" butun son bo'lishi kerak`);
    }

    return parsed;
  }
}
