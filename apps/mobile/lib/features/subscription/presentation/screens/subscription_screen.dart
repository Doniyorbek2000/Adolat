import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/plan_model.dart';
import '../providers/subscription_provider.dart';

class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plansAsync = ref.watch(plansProvider);
    final subscriptionAsync = ref.watch(currentSubscriptionProvider);
    final usageAsync = ref.watch(usageProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Obuna"),
        automaticallyImplyLeading: false,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(plansProvider);
          ref.invalidate(currentSubscriptionProvider);
          ref.invalidate(usageProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Current subscription
              subscriptionAsync.when(
                data: (sub) => _CurrentPlanCard(subscription: sub),
                loading: () => const _LoadingCard(),
                error: (_, __) => const _ErrorCard(),
              ),
              const SizedBox(height: 16),
              // Usage
              usageAsync.when(
                data: (usage) => _UsageCard(usage: usage),
                loading: () => const _LoadingCard(),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 24),
              Text(
                "Rejalar",
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              plansAsync.when(
                data: (plans) => _PlansList(plans: plans),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: Text('Xatolik: $e',
                      style: const TextStyle(color: AppColors.error)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CurrentPlanCard extends StatelessWidget {
  const _CurrentPlanCard({required this.subscription});
  final Map<String, dynamic> subscription;

  @override
  Widget build(BuildContext context) {
    final planName = subscription['plan']?['name'] as String? ?? 'Bepul';
    final status = subscription['status'] as String? ?? 'ACTIVE';
    final endDate = subscription['currentPeriodEnd'] as String?;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Joriy reja",
            style: TextStyle(color: Colors.white70, fontSize: 12),
          ),
          const SizedBox(height: 4),
          Text(
            planName,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  status,
                  style: const TextStyle(color: Colors.white, fontSize: 11),
                ),
              ),
              if (endDate != null) ...[
                const SizedBox(width: 8),
                Text(
                  'Tugaydi: ${endDate.substring(0, 10)}',
                  style:
                      const TextStyle(color: Colors.white70, fontSize: 11),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _UsageCard extends StatelessWidget {
  const _UsageCard({required this.usage});
  final Map<String, dynamic> usage;

  @override
  Widget build(BuildContext context) {
    final questionsUsed = (usage['questionsUsed'] as num?)?.toInt() ?? 0;
    final questionsLimit = (usage['questionsLimit'] as num?)?.toInt() ?? 1;
    final analysesUsed = (usage['analysesUsed'] as num?)?.toInt() ?? 0;
    final analysesLimit = (usage['analysesLimit'] as num?)?.toInt() ?? 1;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Foydalanish",
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
          const SizedBox(height: 12),
          _UsageBar(
              label: "Savollar",
              used: questionsUsed,
              limit: questionsLimit),
          const SizedBox(height: 8),
          _UsageBar(
              label: "Tahlillar",
              used: analysesUsed,
              limit: analysesLimit),
        ],
      ),
    );
  }
}

class _UsageBar extends StatelessWidget {
  const _UsageBar(
      {required this.label, required this.used, required this.limit});
  final String label;
  final int used;
  final int limit;

  @override
  Widget build(BuildContext context) {
    final pct = limit > 0 ? (used / limit).clamp(0.0, 1.0) : 0.0;
    final color = pct > 0.8 ? AppColors.error : AppColors.primary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textSecondary)),
            Text('$used / $limit',
                style:
                    const TextStyle(fontSize: 12, color: AppColors.textPrimaryLight)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 6,
            backgroundColor: AppColors.border,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _PlansList extends ConsumerWidget {
  const _PlansList({required this.plans});
  final List<PlanModel> plans;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (plans.isEmpty) {
      return const Center(
        child: Text("Rejalar mavjud emas",
            style: TextStyle(color: AppColors.textSecondary)),
      );
    }
    return Column(
      children:
          plans.map((plan) => _PlanCard(plan: plan)).toList(),
    );
  }
}

class _PlanCard extends ConsumerWidget {
  const _PlanCard({required this.plan});
  final PlanModel plan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isPopular = plan.isPopular;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isPopular ? AppColors.primary.withValues(alpha: 0.05) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPopular ? AppColors.primary : AppColors.border,
          width: isPopular ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(plan.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16)),
                        if (isPopular) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text("Ommabop",
                                style: TextStyle(
                                    color: Colors.white, fontSize: 10)),
                          ),
                        ],
                      ],
                    ),
                    if (plan.description != null)
                      Text(plan.description!,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12)),
                  ],
                ),
                Text(
                  plan.priceUzs == 0
                      ? "Bepul"
                      : "${_formatPrice(plan.priceUzs)} so'm",
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: plan.priceUzs == 0
                        ? AppColors.success
                        : AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                _feature(Icons.chat_bubble_outline,
                    "${plan.questionsLimit} savol/oy"),
                _feature(Icons.description_outlined,
                    "${plan.analysesLimit} tahlil/oy"),
                _feature(Icons.edit_document,
                    "${plan.documentsLimit} hujjat/oy"),
                _feature(Icons.mic_outlined,
                    "${plan.voiceMinutesLimit} ovoz/oy"),
              ],
            ),
            if (plan.priceUzs > 0) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _showPaymentDialog(context, ref, plan),
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        isPopular ? AppColors.primary : null,
                    padding:
                        const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text("Sotib olish"),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _feature(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(text,
            style: const TextStyle(
                fontSize: 12, color: AppColors.textSecondary)),
      ],
    );
  }

  String _formatPrice(int price) {
    final s = price.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  void _showPaymentDialog(
      BuildContext context, WidgetRef ref, PlanModel plan) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _PaymentSheet(plan: plan),
    );
  }
}

class _PaymentSheet extends ConsumerWidget {
  const _PaymentSheet({required this.plan});
  final PlanModel plan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(invoiceCreationProvider);
    final notifier = ref.read(invoiceCreationProvider.notifier);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            plan.name,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            "To'lov usulini tanlang",
            style: TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 24),
          if (state is AsyncLoading)
            const Center(child: CircularProgressIndicator())
          else ...[
            _PaymentButton(
              label: "Click orqali to'lash",
              color: const Color(0xFF00BFFF),
              onTap: () async {
                final url = await notifier.createInvoice(plan.id, 'CLICK');
                if (url != null && context.mounted) {
                  Navigator.pop(context);
                  await launchUrl(Uri.parse(url),
                      mode: LaunchMode.externalApplication);
                }
              },
            ),
            const SizedBox(height: 12),
            _PaymentButton(
              label: "Payme orqali to'lash",
              color: const Color(0xFF00C853),
              onTap: () async {
                final url = await notifier.createInvoice(plan.id, 'PAYME');
                if (url != null && context.mounted) {
                  Navigator.pop(context);
                  await launchUrl(Uri.parse(url),
                      mode: LaunchMode.externalApplication);
                }
              },
            ),
          ],
          if (state is AsyncError)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                "Xatolik yuz berdi. Qaytadan urinib ko'ring.",
                style: const TextStyle(color: AppColors.error, fontSize: 12),
              ),
            ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _PaymentButton extends StatelessWidget {
  const _PaymentButton(
      {required this.label, required this.color, required this.onTap});
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        child: Text(label),
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.border.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(child: CircularProgressIndicator()),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: const Row(
        children: [
          Icon(Icons.error_outline, color: AppColors.error, size: 20),
          SizedBox(width: 8),
          Text("Ma'lumotni yuklab bo'lmadi",
              style: TextStyle(color: AppColors.error)),
        ],
      ),
    );
  }
}
