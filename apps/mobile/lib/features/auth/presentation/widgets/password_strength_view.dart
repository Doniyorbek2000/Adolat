import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/validators.dart';

class PasswordStrengthView extends StatelessWidget {
  final String password;

  const PasswordStrengthView({super.key, required this.password});

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();

    final strength = Validators.checkPasswordStrength(password);
    final (label, color, fill) = switch (strength) {
      PasswordStrength.weak => ('Zaif', AppColors.error, 0.33),
      PasswordStrength.medium => ('O\'rtacha', AppColors.warningAmber, 0.66),
      PasswordStrength.strong => ('Kuchli', AppColors.success, 1.0),
    };

    final checks = [
      (password.length >= 8, 'Kamida 8 belgi'),
      (password.contains(RegExp(r'[A-Z]')), 'Katta harf'),
      (password.contains(RegExp(r'[a-z]')), 'Kichik harf'),
      (password.contains(RegExp(r'\d')), 'Raqam'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: fill,
                  backgroundColor: AppColors.border,
                  valueColor: AlwaysStoppedAnimation(color),
                  minHeight: 6,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 12,
          runSpacing: 4,
          children: checks.map((c) {
            final (met, text) = c;
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  met ? Icons.check_circle : Icons.radio_button_unchecked,
                  size: 14,
                  color: met ? AppColors.success : AppColors.textSecondary,
                ),
                const SizedBox(width: 4),
                Text(text, style: TextStyle(fontSize: 12, color: met ? AppColors.success : AppColors.textSecondary)),
              ],
            );
          }).toList(),
        ),
      ],
    );
  }
}
