import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/dashboard_model.dart';

class SubscriptionCard extends StatelessWidget {
  final SubscriptionSummaryModel subscription;
  final VoidCallback? onUpgrade;

  const SubscriptionCard({super.key, required this.subscription, this.onUpgrade});

  bool get _isFree => subscription.planCode == 'FREE' || subscription.status == 'NONE';

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: _isFree
              ? [AppColors.primary, AppColors.secondary]
              : [const Color(0xFF0F4C75), const Color(0xFF1B262C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subscription.planName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _statusLabel,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.75),
                        ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.workspace_premium, color: Colors.white, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      subscription.planCode,
                      style: const TextStyle(
                          color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (!_isFree && subscription.daysLeft > 0) ...[
            const SizedBox(height: 12),
            Text(
              '${subscription.daysLeft} kun qoldi',
              style: TextStyle(
                color: subscription.daysLeft <= 3
                    ? Colors.orangeAccent
                    : Colors.white.withValues(alpha: 0.9),
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
          if (_isFree) ...[
            const SizedBox(height: 12),
            GestureDetector(
              onTap: onUpgrade,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.arrow_upward, color: AppColors.primary, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      'Obuna olish',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
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

  String get _statusLabel {
    if (subscription.status == 'ACTIVE') return 'Faol obuna';
    if (subscription.status == 'NONE') return 'Obuna yo\'q';
    return subscription.status.toLowerCase();
  }
}
