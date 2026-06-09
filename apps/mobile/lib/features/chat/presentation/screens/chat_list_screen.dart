import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_loader.dart';
import '../../data/models/chat_thread_model.dart';
import '../providers/chat_provider.dart';
import '../providers/chat_state.dart';

class ChatListScreen extends ConsumerStatefulWidget {
  const ChatListScreen({super.key});

  @override
  ConsumerState<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends ConsumerState<ChatListScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(chatListProvider.notifier).loadThreads());
  }

  Future<void> _createThread() async {
    final thread = await ref
        .read(chatListProvider.notifier)
        .createThread(null, 'UZ');
    if (thread != null && mounted) {
      ref.read(chatThreadProvider(thread.id).notifier).setThread(thread);
      context.goNamed(
        RouteNames.chatThread,
        pathParameters: {'threadId': thread.id},
        extra: thread,
      );
    }
  }

  Future<void> _deleteThread(String threadId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Suhbatni o\'chirish'),
        content: const Text(
            'Siz bu suhbatni o\'chirmoqchimisiz? Bu amalni qaytarib bo\'lmaydi.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Bekor qilish')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('O\'chirish',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      ref.read(chatListProvider.notifier).deleteThread(threadId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chatlar'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Yangi chat',
            onPressed: _createThread,
          ),
        ],
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(ChatListState state) {
    if (state.isLoading && state.threads.isEmpty) {
      return const Center(child: AppLoader());
    }

    if (state.hasError && state.threads.isEmpty) {
      return _ErrorView(
        message: state.errorMessage ?? 'Xatolik yuz berdi',
        onRetry: () => ref.read(chatListProvider.notifier).loadThreads(),
      );
    }

    if (state.threads.isEmpty) {
      return _EmptyState(onNew: _createThread);
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(chatListProvider.notifier).loadThreads(),
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: state.threads.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, indent: 16, endIndent: 16),
        itemBuilder: (context, index) {
          final thread = state.threads[index];
          return _ThreadTile(
            thread: thread,
            onTap: () {
              ref
                  .read(chatThreadProvider(thread.id).notifier)
                  .setThread(thread);
              context.goNamed(
                RouteNames.chatThread,
                pathParameters: {'threadId': thread.id},
                extra: thread,
              );
            },
            onDelete: () => _deleteThread(thread.id),
          );
        },
      ),
    );
  }
}

class _ThreadTile extends StatelessWidget {
  final ChatThreadModel thread;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _ThreadTile({
    required this.thread,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('dd.MM.yyyy').format(thread.updatedAt.toLocal());

    return ListTile(
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(Icons.chat_bubble_outline,
            color: AppColors.primary, size: 22),
      ),
      title: Text(
        thread.displayTitle,
        style:
            const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        dateStr,
        style: const TextStyle(
            fontSize: 12, color: AppColors.textSecondary),
      ),
      trailing: PopupMenuButton<String>(
        icon: const Icon(Icons.more_vert,
            size: 18, color: AppColors.textSecondary),
        onSelected: (value) {
          if (value == 'delete') onDelete();
        },
        itemBuilder: (_) => [
          const PopupMenuItem(
            value: 'delete',
            child: Row(children: [
              Icon(Icons.delete_outline, color: AppColors.error, size: 18),
              SizedBox(width: 8),
              Text("O'chirish",
                  style: TextStyle(color: AppColors.error)),
            ]),
          ),
        ],
      ),
      onTap: onTap,
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onNew;

  const _EmptyState({required this.onNew});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.chat_bubble_outline,
                  size: 40, color: AppColors.primary),
            ),
            const SizedBox(height: 20),
            Text(
              'Hali chatlar yo\'q',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Huquqiy savollaringizga javob olish uchun yangi suhbat boshlang',
              textAlign: TextAlign.center,
              style:
                  TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onNew,
              icon: const Icon(Icons.add),
              label: const Text('Yangi savol boshlang'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                    horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
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
            const Icon(Icons.wifi_off_outlined,
                size: 56, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary)),
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
