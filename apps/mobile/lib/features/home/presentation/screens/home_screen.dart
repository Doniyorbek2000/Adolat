import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_loader.dart';
import '../../data/models/dashboard_model.dart';
import '../providers/dashboard_provider.dart';
import '../providers/dashboard_state.dart';
import '../widgets/dashboard_alert_card.dart';
import '../widgets/quick_action_grid.dart';
import '../widgets/recent_chats_list.dart';
import '../widgets/recent_documents_list.dart';
import '../widgets/section_header.dart';
import '../widgets/subscription_card.dart';
import '../widgets/usage_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(dashboardProvider.notifier).loadDashboard());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dashboardProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).brightness == Brightness.dark
          ? AppColors.backgroundDark
          : AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text(
          'Adolat AI',
          style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary),
        ),
        automaticallyImplyLeading: false,
        actions: [
          if (state.isLoaded)
            IconButton(
              icon: const Icon(Icons.notifications_none_outlined),
              onPressed: () {},
            ),
        ],
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(DashboardState state) {
    if (state.isLoading && state.data == null) {
      return const Center(child: AppLoader());
    }

    if (state.hasError && state.data == null) {
      return _ErrorView(
        message: state.errorMessage ?? 'Xatolik yuz berdi',
        onRetry: () => ref.read(dashboardProvider.notifier).loadDashboard(),
      );
    }

    final data = state.data;
    if (data == null) return const SizedBox.shrink();

    return RefreshIndicator(
      onRefresh: () => ref.read(dashboardProvider.notifier).refreshDashboard(),
      color: AppColors.primary,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _GreetingSection(user: data.user),
                const SizedBox(height: 16),
                if (data.alerts.isNotEmpty) ...[
                  ...data.alerts.map((a) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: DashboardAlertCard(alert: a),
                      )),
                  const SizedBox(height: 8),
                ],
                SubscriptionCard(subscription: data.subscription),
                const SizedBox(height: 24),
                SectionHeader(title: 'Foydalanish'),
                const SizedBox(height: 12),
                _UsageGrid(usage: data.usage),
                const SizedBox(height: 24),
                SectionHeader(title: 'Tezkor harakatlar'),
                const SizedBox(height: 12),
                QuickActionGrid(actions: _buildQuickActions()),
                const SizedBox(height: 24),
                if (data.recentChats.isNotEmpty) ...[
                  SectionHeader(title: 'Oxirgi chatlar', actionLabel: 'Hammasi'),
                  const SizedBox(height: 12),
                  RecentChatsList(chats: data.recentChats),
                  const SizedBox(height: 24),
                ],
                if (data.recentDocuments.isNotEmpty) ...[
                  SectionHeader(title: 'Oxirgi hujjatlar', actionLabel: 'Hammasi'),
                  const SizedBox(height: 12),
                  RecentDocumentsList(documents: data.recentDocuments),
                ],
              ]),
            ),
          ),
        ],
      ),
    );
  }

  List<QuickAction> _buildQuickActions() {
    return [
      QuickAction(
        label: 'Savol\nbering',
        icon: Icons.chat_bubble_outline,
        color: AppColors.secondary,
        onTap: () {},
      ),
      QuickAction(
        label: 'Hujjat\ntahlil',
        icon: Icons.document_scanner_outlined,
        color: AppColors.warningAmber,
        onTap: () {},
      ),
      QuickAction(
        label: 'Ariza\nyaratish',
        icon: Icons.article_outlined,
        color: AppColors.success,
        onTap: () {},
      ),
      QuickAction(
        label: 'Ovozli\nyordam',
        icon: Icons.mic_none_outlined,
        color: AppColors.error,
        onTap: () {},
      ),
    ];
  }
}

class _GreetingSection extends StatelessWidget {
  final DashboardUserModel user;
  const _GreetingSection({required this.user});

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Xayrli tong';
    if (hour < 18) return 'Xayrli kun';
    return 'Xayrli oqshom';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$_greeting, ${user.displayName.isNotEmpty ? user.displayName : 'Foydalanuvchi'}!',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          'Adolat AI huquqiy yordamchingiz',
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _UsageGrid extends StatelessWidget {
  final DashboardUsageModel usage;
  const _UsageGrid({required this.usage});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.55,
      children: [
        UsageCard(
          label: 'Savollar',
          used: usage.questions.used,
          limit: usage.questions.limit,
          icon: Icons.help_outline,
          color: AppColors.secondary,
        ),
        UsageCard(
          label: 'Hujjat tahlil',
          used: usage.documentAnalyses.used,
          limit: usage.documentAnalyses.limit,
          icon: Icons.document_scanner_outlined,
          color: AppColors.warningAmber,
        ),
        UsageCard(
          label: 'Yaratilgan',
          used: usage.generatedDocuments.used,
          limit: usage.generatedDocuments.limit,
          icon: Icons.article_outlined,
          color: AppColors.success,
        ),
        UsageCard(
          label: 'Ovoz (min)',
          used: usage.voice.remainingMinutes == 0
              ? usage.voice.limitSeconds ~/ 60
              : (usage.voice.limitSeconds - usage.voice.remainingSeconds) ~/ 60,
          limit: usage.voice.limitSeconds ~/ 60,
          icon: Icons.mic_none_outlined,
          color: AppColors.error,
        ),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_outlined, size: 56, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            Text(
              message,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Qayta urinish'),
            ),
          ],
        ),
      ),
    );
  }
}
