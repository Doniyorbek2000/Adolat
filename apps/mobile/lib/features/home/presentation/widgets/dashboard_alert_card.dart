import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/dashboard_model.dart';

class DashboardAlertCard extends StatelessWidget {
  final DashboardAlertModel alert;

  const DashboardAlertCard({super.key, required this.alert});

  Color get _color {
    switch (alert.type) {
      case 'LIMIT':
        return AppColors.error;
      case 'UPGRADE':
        return AppColors.secondary;
      default:
        return AppColors.warningAmber;
    }
  }

  IconData get _icon {
    switch (alert.type) {
      case 'LIMIT':
        return Icons.block_outlined;
      case 'UPGRADE':
        return Icons.rocket_launch_outlined;
      default:
        return Icons.info_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _color;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(_icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.title,
                  style: Theme.of(context)
                      .textTheme
                      .labelLarge
                      ?.copyWith(color: color, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  alert.message,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: color.withValues(alpha: 0.85)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
