import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/chat_message_model.dart';

class CitationBlock extends StatelessWidget {
  final List<CitationModel> citations;

  const CitationBlock({super.key, required this.citations});

  @override
  Widget build(BuildContext context) {
    if (citations.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(8),
      ),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
          dense: true,
          leading: const Icon(Icons.menu_book_outlined,
              size: 16, color: AppColors.secondary),
          title: Text(
            'Manbalar (${citations.length})',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.secondary,
            ),
          ),
          children: citations
              .asMap()
              .entries
              .map((entry) => _CitationTile(
                    index: entry.key + 1,
                    citation: entry.value,
                  ))
              .toList(),
        ),
      ),
    );
  }
}

class _CitationTile extends StatelessWidget {
  final int index;
  final CitationModel citation;

  const _CitationTile({required this.index, required this.citation});

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.backgroundLight,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: const BoxDecoration(
                  color: AppColors.secondary,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    '$index',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  citation.sourceName,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            citation.documentTitle,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
          ),
          if (citation.articleRef != null && citation.articleRef!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              citation.articleRef!,
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
          if (citation.documentUrl != null &&
              citation.documentUrl!.isNotEmpty) ...[
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () => _openUrl(citation.documentUrl!),
              child: const Text(
                'Manbaga o\'tish',
                style: TextStyle(
                  fontSize: 11,
                  color: AppColors.accent,
                  decoration: TextDecoration.underline,
                  decorationColor: AppColors.accent,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
