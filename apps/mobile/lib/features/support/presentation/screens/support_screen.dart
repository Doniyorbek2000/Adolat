import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/models/support_ticket_model.dart';
import '../providers/support_provider.dart';

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(supportListProvider.notifier).loadTickets(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(supportListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(LocaleKeys.support.tr()),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              onPressed: () => context.goNamed(RouteNames.createTicket),
              icon: const Icon(Icons.add, size: 18),
              label: Text(LocaleKeys.newTicket.tr()),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.secondary,
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(supportListProvider.notifier).loadTickets(),
        child: _buildBody(state),
      ),
    );
  }

  Widget _buildBody(SupportListState state) {
    if (state.isLoading && state.tickets.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.errorMessage != null && state.tickets.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text(state.errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () =>
                    ref.read(supportListProvider.notifier).loadTickets(),
                child: Text(LocaleKeys.retry.tr()),
              ),
            ],
          ),
        ),
      );
    }

    if (state.tickets.isEmpty) {
      return _EmptyTickets(
        onNewTicket: () => context.goNamed(RouteNames.createTicket),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: state.tickets.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final ticket = state.tickets[index];
        return _TicketCard(
          ticket: ticket,
          onTap: () => context.pushNamed(
            RouteNames.ticketDetail,
            extra: ticket,
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
class _EmptyTickets extends StatelessWidget {
  final VoidCallback onNewTicket;
  const _EmptyTickets({required this.onNewTicket});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.support_agent_outlined,
              size: 72,
              color: AppColors.textSecondary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              LocaleKeys.noTickets.tr(),
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onNewTicket,
              icon: const Icon(Icons.add),
              label: Text(LocaleKeys.newTicket.tr()),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Ticket card
// ---------------------------------------------------------------------------
class _TicketCard extends StatelessWidget {
  final SupportTicketModel ticket;
  final VoidCallback onTap;

  const _TicketCard({required this.ticket, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      color: AppColors.surfaceLight,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      ticket.subject,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _StatusBadge(status: ticket.status),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  if (ticket.category != null) ...[
                    Icon(Icons.label_outline,
                        size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      ticket.category!,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Icon(Icons.access_time,
                      size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(ticket.createdAt),
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}.${dt.year}';
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (String label, Color color) = switch (status) {
      'OPEN' => ("Ochiq", AppColors.secondary),
      'IN_PROGRESS' => ("Jarayonda", AppColors.warningAmber),
      'RESOLVED' => ("Yechildi", AppColors.success),
      'CLOSED' => ("Yopildi", AppColors.textSecondary),
      _ => (status, AppColors.textSecondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
