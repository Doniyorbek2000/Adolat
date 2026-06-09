import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_loader.dart';
import '../../data/models/chat_thread_model.dart';
import '../providers/chat_provider.dart';
import '../providers/chat_state.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/chat_input.dart';
import '../widgets/follow_up_actions.dart';

class ChatThreadScreen extends ConsumerStatefulWidget {
  final String threadId;
  final ChatThreadModel? initialThread;

  const ChatThreadScreen({
    super.key,
    required this.threadId,
    this.initialThread,
  });

  @override
  ConsumerState<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends ConsumerState<ChatThreadScreen> {
  final ScrollController _scrollController = ScrollController();
  String _language = 'UZ';

  @override
  void initState() {
    super.initState();
    final notifier = ref.read(chatThreadProvider(widget.threadId).notifier);
    if (widget.initialThread != null) {
      notifier.setThread(widget.initialThread!);
    }
    Future.microtask(() => notifier.loadMessages());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage(String text) {
    ref
        .read(chatThreadProvider(widget.threadId).notifier)
        .sendMessage(text, _language);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatThreadProvider(widget.threadId));

    // Scroll to bottom when new message arrives
    ref.listen<ChatThreadState>(chatThreadProvider(widget.threadId),
        (prev, next) {
      if ((prev?.messages.length ?? 0) < next.messages.length) {
        _scrollToBottom();
      }
    });

    final title = state.thread?.displayTitle ??
        widget.initialThread?.displayTitle ??
        'Suhbat';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          // Language toggle
          PopupMenuButton<String>(
            icon: Row(children: [
              const Icon(Icons.language_outlined, size: 18),
              const SizedBox(width: 4),
              Text(_language,
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600)),
            ]),
            onSelected: (lang) => setState(() => _language = lang),
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'UZ', child: Text("O'zbek tili")),
              const PopupMenuItem(value: 'RU', child: Text('Rus tili')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(child: _buildMessageList(state)),
          if (state.isSending) _TypingIndicator(),
          ChatInput(
            onSend: _sendMessage,
            isLoading: state.isSending,
          ),
        ],
      ),
    );
  }

  Widget _buildMessageList(ChatThreadState state) {
    if (state.isLoading && state.messages.isEmpty) {
      return const Center(child: AppLoader(text: 'Yuklanmoqda...'));
    }

    if (state.hasError && state.messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline,
                size: 48, color: AppColors.textSecondary),
            const SizedBox(height: 12),
            Text(state.errorMessage ?? 'Xatolik yuz berdi',
                style:
                    const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => ref
                  .read(chatThreadProvider(widget.threadId).notifier)
                  .loadMessages(),
              icon: const Icon(Icons.refresh),
              label: const Text('Qayta urinish'),
            ),
          ],
        ),
      );
    }

    if (state.messages.isEmpty) {
      return const _EmptyThreadHint();
    }

    final messages = state.messages;
    final lastMsg =
        messages.isNotEmpty ? messages.last : null;
    final showFollowUp =
        lastMsg != null && lastMsg.isAssistant && !state.isSending;

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.only(top: 12, bottom: 8),
      itemCount: messages.length + (showFollowUp ? 1 : 0),
      itemBuilder: (context, index) {
        if (showFollowUp && index == messages.length) {
          return FollowUpActions(onAction: _sendMessage);
        }
        return ChatBubble(message: messages[index]);
      },
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      alignment: Alignment.centerLeft,
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Text('AI',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark
                  ? AppColors.cardDark
                  : AppColors.surfaceLight,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const _DotsAnimation(),
          ),
        ],
      ),
    );
  }
}

class _DotsAnimation extends StatefulWidget {
  const _DotsAnimation();

  @override
  State<_DotsAnimation> createState() => _DotsAnimationState();
}

class _DotsAnimationState extends State<_DotsAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = _controller.value;
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final opacity = ((t * 3 - i) % 1).clamp(0.2, 1.0);
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Opacity(
                opacity: opacity.toDouble(),
                child: const CircleAvatar(
                    radius: 4, backgroundColor: AppColors.textSecondary),
              ),
            );
          }),
        );
      },
    );
  }
}

class _EmptyThreadHint extends StatelessWidget {
  const _EmptyThreadHint();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.chat_bubble_outline,
                  size: 36, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text(
              'Savolingizni yozing',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            const Text(
              'Huquqiy masalangiz bo\'yicha savol bering,\nAdolat AI yordam beradi.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: AppColors.textSecondary, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}
