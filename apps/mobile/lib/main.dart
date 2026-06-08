import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/localization/supported_locales.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  runApp(
    ProviderScope(
      child: EasyLocalization(
        supportedLocales: AppSupportedLocales.locales,
        path: 'assets/translations',
        fallbackLocale: AppSupportedLocales.fallback,
        child: const AdolatAiApp(),
      ),
    ),
  );
}
