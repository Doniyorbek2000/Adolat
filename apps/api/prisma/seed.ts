import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PLANS = [
  {
    code: 'free',
    name: 'Free',
    priceUzs: 0,
    questionsLimit: 10,
    documentAnalysisLimit: 1,
    documentGeneratorLimit: 1,
    voiceMinutesLimit: 5,
    maxFileSizeMb: 5,
    exportEnabled: false,
    prioritySupport: false,
  },
  {
    code: 'standard',
    name: 'Oddiy',
    priceUzs: 49_000,
    questionsLimit: 100,
    documentAnalysisLimit: 10,
    documentGeneratorLimit: 10,
    voiceMinutesLimit: 30,
    maxFileSizeMb: 15,
    exportEnabled: true,
    prioritySupport: false,
  },
  {
    code: 'pro',
    name: 'Pro',
    priceUzs: 99_000,
    questionsLimit: 400,
    documentAnalysisLimit: 40,
    documentGeneratorLimit: 40,
    voiceMinutesLimit: 120,
    maxFileSizeMb: 30,
    exportEnabled: true,
    prioritySupport: true,
  },
  {
    code: 'business',
    name: 'Business',
    priceUzs: 249_000,
    questionsLimit: 1500,
    documentAnalysisLimit: 150,
    documentGeneratorLimit: 150,
    voiceMinutesLimit: 400,
    maxFileSizeMb: 50,
    exportEnabled: true,
    prioritySupport: true,
  },
  {
    code: 'vip',
    name: 'VIP',
    priceUzs: 499_000,
    questionsLimit: 5000,
    documentAnalysisLimit: 500,
    documentGeneratorLimit: 500,
    voiceMinutesLimit: 1000,
    maxFileSizeMb: 100,
    exportEnabled: true,
    prioritySupport: true,
  },
];

const ROLES = [
  { name: 'super_admin', description: 'Tizimni to\'liq boshqarish huquqi' },
  { name: 'admin', description: 'Standart admin huquqlari' },
  { name: 'user', description: 'Oddiy foydalanuvchi' },
];

async function main(): Promise<void> {
  for (const role of ROLES) {
    await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role });
  }

  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }

  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL ?? 'admin@adolat.ai';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;

  if (adminPassword) {
    const passwordHash = await argon2.hash(adminPassword);
    const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'super_admin' } });

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        passwordHash,
        authProvider: 'EMAIL',
        status: 'ACTIVE',
        language: 'UZ',
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: superAdminRole.id },
    });

    // eslint-disable-next-line no-console
    console.log(`Super admin tayyor: ${adminEmail}`);
  } else {
    // eslint-disable-next-line no-console
    console.warn('ADMIN_DEFAULT_PASSWORD berilmagan — super admin yaratilmadi.');
  }

  // eslint-disable-next-line no-console
  console.log('Seed muvaffaqiyatli yakunlandi: rollar va tariflar yaratildi.');
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
