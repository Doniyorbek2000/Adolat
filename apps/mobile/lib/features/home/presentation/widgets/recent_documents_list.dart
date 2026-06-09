import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/dashboard_model.dart';

class RecentDocumentsList extends StatelessWidget {
  final List<RecentDocumentModel> documents;

  const RecentDocumentsList({super.key, required this.documents});

  @override
  Widget build(BuildContext context) {
    if (documents.isEmpty) {
      return _EmptyState(icon: Icons.description_outlined, label: 'Hali hujjat yo\'q');
    }
    return Column(
      children: documents.map((doc) => _DocumentTile(doc: doc)).toList(),
    );
  }
}

class _DocumentTile extends StatelessWidget {
  final RecentDocumentModel doc;
  const _DocumentTile({required this.doc});

  IconData get _icon =>
      doc.type == 'analysis' ? Icons.document_scanner_outlined : Icons.article_outlined;

  Color get _color => doc.type == 'analysis' ? AppColors.warningAmber : AppColors.success;

  String get _typeLabel => doc.type == 'analysis' ? 'Tahlil' : 'Yaratilgan';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(_icon, color: _color, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  doc.title,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: _color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        _typeLabel,
                        style: TextStyle(
                          color: _color,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _statusLabel(doc.status),
                      style: Theme.of(context)
                          .textTheme
                          .labelSmall
                          ?.copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right, color: AppColors.textSecondary, size: 16),
        ],
      ),
    );
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'DONE':
      case 'COMPLETED':
        return 'Tayyor';
      case 'PENDING':
        return 'Kutilmoqda';
      case 'PROCESSING':
        return 'Qayta ishlanmoqda';
      case 'FAILED':
        return 'Xatolik';
      default:
        return status;
    }
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String label;
  const _EmptyState({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      alignment: Alignment.center,
      child: Column(
        children: [
          Icon(icon, size: 40, color: AppColors.textSecondary.withValues(alpha: 0.5)),
          const SizedBox(height: 8),
          Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        ],
      ),
    );
  }
}
