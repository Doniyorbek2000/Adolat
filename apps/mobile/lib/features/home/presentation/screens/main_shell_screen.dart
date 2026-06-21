import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/providers/auth_state.dart';
import '../../../chat/presentation/screens/chat_list_screen.dart';
import '../../../documents/presentation/screens/documents_screen.dart';
import '../../../profile/presentation/screens/profile_screen.dart';
import '../../../subscription/presentation/screens/subscription_screen.dart';
import 'home_screen.dart';

class MainShellScreen extends ConsumerStatefulWidget {
  const MainShellScreen({super.key});

  @override
  ConsumerState<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends ConsumerState<MainShellScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authStateProvider, (_, next) {
      if (next.status == AuthStatus.unauthenticated) {
        context.goNamed(RouteNames.login);
      }
    });

    final authState = ref.watch(authStateProvider);
    if (authState.user == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final bodies = <Widget>[
      const HomeScreen(),
      const ChatListScreen(),
      const DocumentsScreen(),
      const SubscriptionScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: bodies),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) => setState(() => _selectedIndex = i),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home),
            label: LocaleKeys.home.tr(),
          ),
          NavigationDestination(
            icon: const Icon(Icons.chat_bubble_outline),
            selectedIcon: const Icon(Icons.chat_bubble),
            label: LocaleKeys.chat.tr(),
          ),
          NavigationDestination(
            icon: const Icon(Icons.description_outlined),
            selectedIcon: const Icon(Icons.description),
            label: LocaleKeys.documents.tr(),
          ),
          NavigationDestination(
            icon: const Icon(Icons.star_outline),
            selectedIcon: const Icon(Icons.star),
            label: LocaleKeys.subscription.tr(),
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person),
            label: LocaleKeys.profile.tr(),
          ),
        ],
      ),
    );
  }
}

