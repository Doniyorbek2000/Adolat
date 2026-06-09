import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  PromoCode,
  PromoType,
  UsageCounter,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/create-promo-code.dto';

export interface PromoApplicationResult {
  success: boolean;
  message: string;
  promoCode: PromoCode;
  effect: {
    type: PromoType;
    discount?: number;
    extraUsage?: Partial<UsageCounter>;
  };
}

@Injectable()
export class PromoService {
  private readonly logger = new Logger(PromoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async apply(userId: string, code: string): Promise<PromoApplicationResult> {
    // 1. Find promo code case-insensitively
    const promoCode = await this.prisma.promoCode.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
      include: { redemptions: { where: { userId } } },
    });

    if (!promoCode) {
      throw new NotFoundException('Promo kod topilmadi');
    }

    // 2. Validate promo code
    if (!promoCode.isActive) {
      throw new ForbiddenException('Promo kod faol emas');
    }

    if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
      throw new ForbiddenException('Promo kodning amal qilish muddati tugagan');
    }

    // Check global redemption limit
    const totalRedemptions = await this.prisma.promoRedemption.count({
      where: { promoCodeId: promoCode.id },
    });
    if (
      promoCode.maxRedemptions !== null &&
      promoCode.maxRedemptions !== undefined &&
      totalRedemptions >= promoCode.maxRedemptions
    ) {
      throw new ForbiddenException('Promo kodning ishlatish limiti tugagan');
    }

    // 3. Check user per-limit redemption
    if (promoCode.redemptions.length >= promoCode.perUserLimit) {
      throw new ForbiddenException('Siz bu promo kodni allaqachon ishlatgansiz');
    }

    // 4. Create redemption record
    await this.prisma.promoRedemption.create({
      data: {
        promoCodeId: promoCode.id,
        userId,
      },
    });

    // 5. Apply effect
    const effect = await this.applyEffect(userId, promoCode);

    // 6. Create notification
    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.PROMO,
        title: "Promo kod muvaffaqiyatli qo'llandi",
        body: effect.message,
      },
    });

    this.logger.log(`Promo code ${code} applied for user ${userId}, type=${promoCode.type}`);

    return {
      success: true,
      message: effect.message,
      promoCode,
      effect: {
        type: promoCode.type,
        discount: promoCode.discountPercent ?? undefined,
        extraUsage: effect.extraUsage,
      },
    };
  }

  private async applyEffect(
    userId: string,
    promoCode: PromoCode,
  ): Promise<{ message: string; extraUsage?: Partial<UsageCounter> }> {
    switch (promoCode.type) {
      case PromoType.DISCOUNT: {
        const pct = promoCode.discountPercent ?? 0;
        return {
          message: `${pct}% chegirma keyingi to'lovingizga qo'llanildi`,
        };
      }

      case PromoType.FREE_PLAN: {
        if (promoCode.freePlanCode) {
          const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { code: promoCode.freePlanCode },
          });
          if (plan) {
            await this.subscriptionsService.activateSubscription(userId, plan.id);
            return { message: `${plan.name} rejasi 1 oy bepul faollashtirildi` };
          }
        }
        return { message: 'Bepul reja faollashtirildi' };
      }

      case PromoType.EXTRA_USAGE: {
        const extra = promoCode.extraUsageAmount ?? 0;
        if (extra > 0) {
          await this.subscriptionsService.incrementUsage(userId, 'questionsUsed', -extra);
        }
        return {
          message: `${extra} ta qo'shimcha foydalanish imkoniyati qo'shildi`,
          extraUsage: { questionsUsed: extra },
        };
      }

      default:
        return { message: "Promo kod qo'llandi" };
    }
  }

  // ----------------------------------------------------------------
  // Admin CRUD
  // ----------------------------------------------------------------

  async create(dto: CreatePromoCodeDto, adminId: string): Promise<PromoCode> {
    const existing = await this.prisma.promoCode.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException('Bu kod allaqachon mavjud');
    }

    return this.prisma.promoCode.create({
      data: {
        code: dto.code,
        type: dto.type,
        discountPercent: dto.discountPercent ?? null,
        freePlanCode: dto.freePlanCode ?? null,
        extraUsageAmount: dto.extraUsageAmount ?? null,
        maxRedemptions: dto.maxRedemptions ?? null,
        expiresAt: dto.expiresAt ?? null,
        isActive: dto.isActive ?? true,
        createdById: adminId,
      },
    });
  }

  async findAll(_adminId: string): Promise<PromoCode[]> {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const existing = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`PromoCode ${id} topilmadi`);
    }
    return this.prisma.promoCode.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.maxRedemptions !== undefined ? { maxRedemptions: dto.maxRedemptions } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt } : {}),
      },
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`PromoCode ${id} topilmadi`);
    }
    await this.prisma.promoCode.delete({ where: { id } });
  }
}
