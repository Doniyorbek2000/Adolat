import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

class UsageCard extends StatelessWidget {
  final String label;
  final int used;
  final int limit;
  final IconData icon;
  final Color? color;

  const UsageCard({
    super.key,
    required this.label,
    required this.used,
    required this.limit,
    required this.icon,
    this.color,
  });

  double get _progress => limit > 0 ? (used / limit).clamp(0.0, 1.0) : 0.0;

  Color get _effectiveColor => color ?? AppColors.secondary;

  Color get _progressColor {
    if (_progress >= 1.0) return AppColors.error;
    if (_progress >= 0.8) return AppColors.warningAmber;
    return _effectiveColor;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: _effectiveColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: _effectiveColor),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$used',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              Text(
                '/ $limit',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _progress,
              backgroundColor: _progressColor.withValues(alpha: 0.15),
              valueColor: AlwaysStoppedAnimation<Color>(_progressColor),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }
}
