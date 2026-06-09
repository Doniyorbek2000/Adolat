import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

class FollowUpActions extends StatelessWidget {
  final Function(String) onAction;

  const FollowUpActions({super.key, required this.onAction});

  static const List<_ActionItem> _actions = [
    _ActionItem(label: 'Soddaroq tushuntir', icon: Icons.lightbulb_outline),
    _ActionItem(label: 'Qisqa xulosa', icon: Icons.summarize_outlined),
    _ActionItem(label: 'Rus tilida', icon: Icons.translate_outlined),
    _ActionItem(label: "O'zbek tilida", icon: Icons.language_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Wrap(
        spacing: 8,
        runSpacing: 6,
        children: _actions
            .map(
              (action) => ActionChip(
                avatar: Icon(action.icon, size: 14, color: AppColors.secondary),
                label: Text(
                  action.label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                backgroundColor: AppColors.secondary.withValues(alpha: 0.08),
                side: BorderSide(
                    color: AppColors.secondary.withValues(alpha: 0.3)),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                onPressed: () => onAction(action.label),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _ActionItem {
  final String label;
  final IconData icon;
  const _ActionItem({required this.label, required this.icon});
}
