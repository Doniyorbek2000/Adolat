import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 65536),
  timeCost: Number(process.env.ARGON2_TIME_COST ?? 3),
};

const PERMISSIONS = [
  { code: 'users.read', description: "Foydalanuvchilar ro'yxatini va profilini ko'rish" },
  { code: 'users.update', description: "Foydalanuvchi ma'lumotlarini tahrirlash" },
  { code: 'users.block', description: 'Foydalanuvchini bloklash / blokdan chiqarish' },
  { code: 'plans.manage', description: 'Tarif rejalarini yaratish va tahrirlash' },
  { code: 'promo.manage', description: 'Promo-kodlarni boshqarish' },
  { code: 'payments.read', description: "To'lovlar va invoyslarni ko'rish" },
  { code: 'support.manage', description: "Qo'llab-quvvatlash murojaatlarini boshqarish" },
  { code: 'ai.manage', description: 'AI provayderlar va sozlamalarini boshqarish' },
  { code: 'legal_sources.manage', description: 'Yuridik manbalarni boshqarish (RAG)' },
  { code: 'analytics.read', description: "Analitika va statistikani ko'rish" },
  { code: 'audit.read', description: "Audit jurnalini ko'rish" },
  { code: 'settings.manage', description: 'Tizim sozlamalarini boshqarish' },
] as const;

const ROLES = [
  { name: 'USER', description: 'Oddiy foydalanuvchi' },
  { name: 'ADMIN', description: 'Standart administrator' },
  { name: 'SUPER_ADMIN', description: "Tizimni to'liq boshqarish huquqiga ega administrator" },
  { name: 'SUPPORT', description: "Qo'llab-quvvatlash xodimi" },
  { name: 'MODERATOR', description: 'Kontent va RAG manbalarini moderatsiya qiluvchi' },
] as const;

const ADMIN_PERMISSION_CODES = [
  'users.read',
  'users.update',
  'users.block',
  'plans.manage',
  'promo.manage',
  'payments.read',
  'support.manage',
  'ai.manage',
  'legal_sources.manage',
  'analytics.read',
];

const SUPPORT_PERMISSION_CODES = ['users.read', 'support.manage'];

const PLANS = [
  {
    code: 'FREE' as const,
    name: 'Bepul',
    description: 'Tanishish uchun cheklangan imkoniyatlar',
    priceUzs: '0',
    billingPeriodDays: 30,
    questionLimit: 2,
    documentAnalysisLimit: 1,
    generatedDocumentLimit: 1,
    voiceMinutesLimit: 2,
    maxFileSizeMb: 1,
    exportEnabled: false,
    prioritySupport: false,
  },
  {
    code: 'ODDIY' as const,
    name: 'Oddiy',
    description: 'Shaxsiy foydalanuvchilar uchun asosiy reja',
    priceUzs: '49000',
    billingPeriodDays: 30,
    questionLimit: 20,
    documentAnalysisLimit: 5,
    generatedDocumentLimit: 20,
    voiceMinutesLimit: 10,
    maxFileSizeMb: 5,
    exportEnabled: true,
    prioritySupport: false,
  },
  {
    code: 'PRO' as const,
    name: 'Pro',
    description: 'Faol foydalanuvchilar uchun kengaytirilgan reja',
    priceUzs: '99000',
    billingPeriodDays: 30,
    questionLimit: 50,
    documentAnalysisLimit: 10,
    generatedDocumentLimit: 50,
    voiceMinutesLimit: 25,
    maxFileSizeMb: 8,
    exportEnabled: true,
    prioritySupport: false,
  },
  {
    code: 'BUSINESS' as const,
    name: 'Biznes',
    description: "Kichik va o'rta biznes jamoalari uchun",
    priceUzs: '249000',
    billingPeriodDays: 30,
    questionLimit: 300,
    documentAnalysisLimit: 50,
    generatedDocumentLimit: 100,
    voiceMinutesLimit: 60,
    maxFileSizeMb: 10,
    exportEnabled: true,
    prioritySupport: true,
  },
  {
    code: 'VIP' as const,
    name: 'VIP',
    description: "Maksimal limit va ustuvor qo'llab-quvvatlash",
    priceUzs: '499000',
    billingPeriodDays: 30,
    questionLimit: 3500,
    documentAnalysisLimit: 350,
    generatedDocumentLimit: 1500,
    voiceMinutesLimit: 2400,
    maxFileSizeMb: 25,
    exportEnabled: true,
    prioritySupport: true,
  },
  {
    code: 'PAY_AS_YOU_GO' as const,
    name: "Foydalanganingizcha to'lash",
    description: "Oylik obunasiz, faqat foydalanilgan hajm uchun to'lov",
    priceUzs: '0',
    billingPeriodDays: 30,
    questionLimit: 0,
    documentAnalysisLimit: 0,
    generatedDocumentLimit: 0,
    voiceMinutesLimit: 0,
    maxFileSizeMb: 10,
    exportEnabled: true,
    prioritySupport: false,
  },
];

const LEGAL_SOURCES = [
  {
    name: "Lex.uz — Milliy qonunchilik ma'lumotlari bazasi",
    type: 'LEGAL' as const,
    baseUrl: 'https://lex.uz',
    description: "O'zbekiston Respublikasi qonunchilik hujjatlarining rasmiy bazasi",
  },
  {
    name: "Soliq.uz — Davlat soliq qo'mitasi",
    type: 'TAX' as const,
    baseUrl: 'https://soliq.uz',
    description: "Soliq qonunchiligi va rasmiy yo'riqnomalar",
  },
  {
    name: 'My.gov.uz — Yagona davlat xizmatlari portali',
    type: 'GOVERNMENT_SERVICE' as const,
    baseUrl: 'https://my.gov.uz',
    description: "Davlat xizmatlari bo'yicha rasmiy ma'lumotlar",
  },
  {
    name: "President.uz — O'zbekiston Respublikasi Prezidenti",
    type: 'PRESIDENT' as const,
    baseUrl: 'https://president.uz',
    description: 'Farmonlar, qarorlar va rasmiy bayonotlar',
  },
  {
    name: "Gov.uz — O'zbekiston Respublikasi Hukumat portali",
    type: 'GOVERNMENT' as const,
    baseUrl: 'https://gov.uz',
    description: 'Hukumat qarorlari va rasmiy hujjatlar',
  },
  {
    name: 'Adliya.uz — Adliya vazirligi',
    type: 'JUSTICE' as const,
    baseUrl: 'https://adliya.uz',
    description: "Huquqiy hujjatlarni davlat ro'yxatidan o'tkazish ma'lumotlari",
  },
  {
    name: "Markaziy bank — O'zbekiston Respublikasi Markaziy banki",
    type: 'CENTRAL_BANK' as const,
    baseUrl: 'https://cbu.uz',
    description: 'Bank va valyuta tartibga solish hujjatlari',
  },
  {
    name: 'Kadastr agentligi',
    type: 'CADASTRE' as const,
    baseUrl: 'https://kadastr.uz',
    description: "Yer-mulk va ko'chmas mulk bo'yicha rasmiy ma'lumotlar",
  },
  {
    name: "Bojxona qo'mitasi",
    type: 'CUSTOMS' as const,
    baseUrl: 'https://customs.uz',
    description: "Bojxona qoidalari va tartiblari bo'yicha rasmiy hujjatlar",
  },
];

async function seedPermissions(): Promise<Map<string, string>> {
  const codeToId = new Map<string, string>();

  for (const permission of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: permission,
    });
    codeToId.set(record.code, record.id);
  }

  return codeToId;
}

async function seedRoles(): Promise<Map<string, string>> {
  const nameToId = new Map<string, string>();

  for (const role of ROLES) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
    nameToId.set(record.name, record.id);
  }

  return nameToId;
}

async function seedRolePermissions(
  roleIds: Map<string, string>,
  permissionIds: Map<string, string>,
): Promise<void> {
  const assignments: Array<{ roleId: string; permissionId: string }> = [];

  const allPermissionIds = [...permissionIds.values()];
  const superAdminRoleId = roleIds.get('SUPER_ADMIN');
  if (superAdminRoleId) {
    for (const permissionId of allPermissionIds) {
      assignments.push({ roleId: superAdminRoleId, permissionId });
    }
  }

  const adminRoleId = roleIds.get('ADMIN');
  if (adminRoleId) {
    for (const code of ADMIN_PERMISSION_CODES) {
      const permissionId = permissionIds.get(code);
      if (permissionId) {
        assignments.push({ roleId: adminRoleId, permissionId });
      }
    }
  }

  const supportRoleId = roleIds.get('SUPPORT');
  if (supportRoleId) {
    for (const code of SUPPORT_PERMISSION_CODES) {
      const permissionId = permissionIds.get(code);
      if (permissionId) {
        assignments.push({ roleId: supportRoleId, permissionId });
      }
    }
  }

  for (const assignment of assignments) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: assignment },
      update: {},
      create: assignment,
    });
  }
}

async function seedPlans(): Promise<void> {
  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
}

async function seedLegalSources(): Promise<void> {
  for (const source of LEGAL_SOURCES) {
    const existing = await prisma.legalSource.findFirst({ where: { baseUrl: source.baseUrl } });
    if (existing) {
      await prisma.legalSource.update({ where: { id: existing.id }, data: source });
    } else {
      await prisma.legalSource.create({ data: source });
    }
  }
}

async function seedSuperAdmin(superAdminRoleId: string | undefined): Promise<void> {
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL;
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;

  if (!adminEmail || !adminPassword) {
    // eslint-disable-next-line no-console
    console.warn('ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD berilmagan — super admin yaratilmadi.');
    return;
  }

  if (!superAdminRoleId) {
    // eslint-disable-next-line no-console
    console.warn('SUPER_ADMIN roli topilmadi — super admin yaratilmadi.');
    return;
  }

  const passwordHash = await argon2.hash(adminPassword, ARGON2_OPTIONS);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      status: 'ACTIVE',
      language: 'UZ',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRoleId } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRoleId },
  });

  // eslint-disable-next-line no-console
  console.log(`Super admin tayyor: ${adminEmail}`);
}

async function main(): Promise<void> {
  const permissionIds = await seedPermissions();
  const roleIds = await seedRoles();
  await seedRolePermissions(roleIds, permissionIds);
  await seedPlans();
  await seedLegalSources();
  await seedSuperAdmin(roleIds.get('SUPER_ADMIN'));

  // eslint-disable-next-line no-console
  console.log('Seed muvaffaqiyatli yakunlandi: rollar, ruxsatlar, tariflar va yuridik manbalar tayyor.');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed xatolik bilan tugadi:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
