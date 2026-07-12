import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../../../../core/localization/locale_keys.dart';

/// Ovozli yordamchi hozircha "tez kunda". Backend tayyor bo'lganda `/voice`
/// route'ini `VoiceScreen`ga qaytarish kifoya (app_routes.dart).
class VoiceComingSoonScreen extends StatelessWidget {
  const VoiceComingSoonScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(LocaleKeys.voiceAssistant.tr())),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.mic_none_rounded, size: 48, color: theme.colorScheme.primary),
              ),
              const SizedBox(height: 24),
              Text(
                LocaleKeys.comingSoon.tr(),
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(
                LocaleKeys.voiceComingSoonDesc.tr(),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
