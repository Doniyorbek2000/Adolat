import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/payment_provider.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  final String planId;
  final String planName;
  final double price;
  final List<String> features;

  const PaymentScreen({
    super.key,
    required this.planId,
    required this.planName,
    this.price = 0,
    this.features = const [],
  });

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String _selectedProvider = 'CLICK';
  final _promoController = TextEditingController();
  bool _promoExpanded = false;

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  Future<void> _startPayment() async {
    await ref
        .read(paymentProvider.notifier)
        .createInvoice(widget.planId, _selectedProvider);

    if (!mounted) return;

    final state = ref.read(paymentProvider);
    if (state.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(state.errorMessage!),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    if (state.paymentUrl != null) {
      _openPaymentUrl(state.paymentUrl!);
    }
  }

  void _openPaymentUrl(String url) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(LocaleKeys.startPayment.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(LocaleKeys.paymentSuccess.tr()),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.backgroundLight,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: SelectableText(
                url,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textSecondary),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _applyPromo() async {
    final code = _promoController.text.trim();
    if (code.isEmpty) return;
    await ref
        .read(paymentProvider.notifier)
        .applyPromo(code, widget.planId);

    if (!mounted) return;

    final state = ref.read(paymentProvider);
    if (state.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(state.errorMessage!),
          backgroundColor: AppColors.error,
        ),
      );
    } else if (state.promoApplied) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Promo kod muvaffaqiyatli qo\'llandi!'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(paymentProvider);
    final effectivePrice = state.discountedAmount ?? widget.price;

    return Scaffold(
      appBar: AppBar(
        title: Text(LocaleKeys.payment.tr()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Plan summary card
            _PlanSummaryCard(
              planName: widget.planName,
              price: effectivePrice,
              originalPrice:
                  state.promoApplied ? widget.price : null,
              features: widget.features,
            ),
            const SizedBox(height: 24),

            // Payment method selection
            Text(
              LocaleKeys.selectPaymentMethod.tr(),
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            _PaymentProviderButton(
              provider: 'CLICK',
              selected: _selectedProvider == 'CLICK',
              onTap: () =>
                  setState(() => _selectedProvider = 'CLICK'),
            ),
            const SizedBox(height: 8),
            _PaymentProviderButton(
              provider: 'PAYME',
              selected: _selectedProvider == 'PAYME',
              onTap: () =>
                  setState(() => _selectedProvider = 'PAYME'),
            ),
            const SizedBox(height: 24),

            // Promo code section
            InkWell(
              onTap: () =>
                  setState(() => _promoExpanded = !_promoExpanded),
              borderRadius: BorderRadius.circular(8),
              child: Row(
                children: [
                  Icon(
                    Icons.local_offer_outlined,
                    size: 18,
                    color: AppColors.secondary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    LocaleKeys.promoCode.tr(),
                    style: const TextStyle(
                      color: AppColors.secondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    _promoExpanded
                        ? Icons.expand_less
                        : Icons.expand_more,
                    color: AppColors.textSecondary,
                  ),
                ],
              ),
            ),
            if (_promoExpanded) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _promoController,
                      decoration: InputDecoration(
                        hintText: 'PROMO123',
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      textCapitalization: TextCapitalization.characters,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: state.isLoading ? null : _applyPromo,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    child: Text(LocaleKeys.applyPromo.tr()),
                  ),
                ],
              ),
              if (state.promoApplied)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle,
                          size: 16, color: AppColors.success),
                      const SizedBox(width: 6),
                      Text(
                        'Promo kod qo\'llandi',
                        style: const TextStyle(
                            color: AppColors.success, fontSize: 13),
                      ),
                    ],
                  ),
                ),
            ],
            const SizedBox(height: 32),

            // Start payment button
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: state.isLoading ? null : _startPayment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: state.isLoading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: Colors.white),
                      )
                    : Text(
                        LocaleKeys.startPayment.tr(),
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700),
                      ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Plan summary card
// ---------------------------------------------------------------------------
class _PlanSummaryCard extends StatelessWidget {
  final String planName;
  final double price;
  final double? originalPrice;
  final List<String> features;

  const _PlanSummaryCard({
    required this.planName,
    required this.price,
    this.originalPrice,
    required this.features,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
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
          Row(
            children: [
              const Icon(Icons.star_rounded, color: Colors.amber, size: 22),
              const SizedBox(width: 8),
              Text(
                planName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _formatPrice(price),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(width: 6),
              const Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Text(
                  'UZS / oy',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ),
              if (originalPrice != null) ...[
                const SizedBox(width: 10),
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    _formatPrice(originalPrice!),
                    style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 14,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (features.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(color: Colors.white24),
            const SizedBox(height: 8),
            ...features.map(
              (f) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline,
                        size: 16, color: Colors.white70),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        f,
                        style: const TextStyle(
                            color: Colors.white, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatPrice(double amount) {
    // Format with thousands separator
    final formatted = amount.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]} ',
        );
    return formatted;
  }
}

// ---------------------------------------------------------------------------
// Payment provider button
// ---------------------------------------------------------------------------
class _PaymentProviderButton extends StatelessWidget {
  final String provider;
  final bool selected;
  final VoidCallback onTap;

  const _PaymentProviderButton({
    required this.provider,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isClick = provider == 'CLICK';
    final providerColor = isClick
        ? const Color(0xFF0099CC)
        : const Color(0xFF00AAEA);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected
              ? providerColor.withValues(alpha: 0.08)
              : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? providerColor : AppColors.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: providerColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  isClick ? 'CL' : 'PM',
                  style: TextStyle(
                    color: providerColor,
                    fontWeight: FontWeight.w900,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isClick ? 'Click' : 'Payme',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: providerColor,
                    ),
                  ),
                  Text(
                    isClick
                        ? 'Click orqali to\'lash'
                        : 'Payme orqali to\'lash',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            if (selected)
              Icon(Icons.check_circle_rounded,
                  color: providerColor, size: 22),
          ],
        ),
      ),
    );
  }
}
