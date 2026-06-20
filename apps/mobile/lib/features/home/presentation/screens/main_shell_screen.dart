import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/providers/auth_state.dart';
import '../../../chat/presentation/screens/chat_list_screen.dart';
import '../../../documents/presentation/screens/documents_screen.dart';
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
      _ProfileTab(user: authState.user!),
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

class _ProfileTab extends ConsumerWidget {
  final dynamic user;
  const _ProfileTab({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profil'), automaticallyImplyLeading: false),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.primary,
              child: Text(
                user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : 'U',
                style: const TextStyle(
                    color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              user.fullName,
              style:
                  Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          if (user.phone != null)
            Center(child: Text(user.phone!, style: TextStyle(color: AppColors.textSecondary))),
          if (user.email != null)
            Center(child: Text(user.email!, style: TextStyle(color: AppColors.textSecondary))),
          const SizedBox(height: 32),
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.error),
            title: Text(LocaleKeys.logout.tr(),
                style: const TextStyle(color: AppColors.error)),
            onTap: () async {
              await ref.read(authStateProvider.notifier).logout();
            },
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            tileColor: AppColors.error.withValues(alpha: 0.05),
          ),
        ],
      ),
    );
  }
}
