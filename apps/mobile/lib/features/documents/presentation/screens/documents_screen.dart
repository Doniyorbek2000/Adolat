import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_loader.dart';
import '../../data/models/document_analysis_model.dart';
import '../../data/models/generated_document_model.dart';
import '../providers/documents_provider.dart';

class DocumentsScreen extends ConsumerStatefulWidget {
  const DocumentsScreen({super.key});

  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends ConsumerState<DocumentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    Future.microtask(() => ref.read(documentsProvider.notifier).loadAll());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hujjatlar'),
        automaticallyImplyLeading: false,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Tahlil'),
            Tab(text: 'Yaratilgan'),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.add),
            onSelected: (value) {
              if (value == 'analyze') {
                context.goNamed(RouteNames.documentAnalysis);
              } else if (value == 'generate') {
                context.goNamed(RouteNames.documentGenerator);
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'analyze',
                child: Row(children: [
                  Icon(Icons.document_scanner_outlined, size: 18),
                  SizedBox(width: 8),
                  Text('Hujjat tahlil qilish'),
                ]),
              ),
              const PopupMenuItem(
                value: 'generate',
                child: Row(children: [
                  Icon(Icons.article_outlined, size: 18),
                  SizedBox(width: 8),
                  Text('Hujjat yaratish'),
                ]),
              ),
            ],
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _DocumentAnalysisListTab(),
          _GeneratedDocumentsListTab(),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Analysis Tab
// ─────────────────────────────────────────────

class _DocumentAnalysisListTab extends ConsumerWidget {
  const _DocumentAnalysisListTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(documentsProvider);

    if (state.isLoading && state.analyses.isEmpty) {
      return const Center(child: AppLoader());
    }

    if (state.analyses.isEmpty) {
      return _EmptyState(
        icon: Icons.document_scanner_outlined,
        title: 'Tahlil qilingan hujjatlar yo\'q',
        subtitle: 'Hujjatni yuklang va AI tahlil qilsin',
        actionLabel: 'Hujjat tahlil qilish',
        onAction: () => context.goNamed(RouteNames.documentAnalysis),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(documentsProvider.notifier).loadAll(),
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: state.analyses.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, indent: 16, endIndent: 16),
        itemBuilder: (context, index) {
          final analysis = state.analyses[index];
          return _AnalysisTile(analysis: analysis);
        },
      ),
    );
  }
}

class _AnalysisTile extends StatelessWidget {
  final DocumentAnalysisModel analysis;

  const _AnalysisTile({required this.analysis});

  Color get _statusColor {
    switch (analysis.status) {
      case 'COMPLETED':
        return AppColors.success;
      case 'FAILED':
        return AppColors.error;
      case 'PROCESSING':
        return AppColors.warningAmber;
      default:
        return AppColors.textSecondary;
    }
  }

  String get _statusLabel {
    switch (analysis.status) {
      case 'COMPLETED':
        return 'Tahlil tugadi';
      case 'FAILED':
        return 'Xatolik';
      case 'PROCESSING':
        return 'Tahlil qilinmoqda';
      default:
        return 'Kutilmoqda';
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr =
        DateFormat('dd.MM.yyyy').format(analysis.createdAt.toLocal());
    return ListTile(
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.warningAmber.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(Icons.document_scanner_outlined,
            color: AppColors.warningAmber),
      ),
      title: Text(
        analysis.summary?.isNotEmpty == true
            ? analysis.summary!
            : 'Hujjat tahlili',
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style:
            const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
      ),
      subtitle: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: _statusColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '$_statusLabel • $dateStr',
            style: TextStyle(
                fontSize: 12, color: AppColors.textSecondary),
          ),
        ],
      ),
      onTap: analysis.isCompleted
          ? () => _showAnalysisResult(context, analysis)
          : null,
    );
  }

  void _showAnalysisResult(
      BuildContext context, DocumentAnalysisModel analysis) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, controller) => _AnalysisResultSheet(
            analysis: analysis, scrollController: controller),
      ),
    );
  }
}

class _AnalysisResultSheet extends StatelessWidget {
  final DocumentAnalysisModel analysis;
  final ScrollController scrollController;

  const _AnalysisResultSheet({
    required this.analysis,
    required this.scrollController,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 8),
        Container(
          width: 36,
          height: 4,
          decoration: BoxDecoration(
            color: AppColors.border,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(height: 12),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            'Tahlil natijalari',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              if (analysis.summary?.isNotEmpty == true) ...[
                _SectionTitle(title: 'Xulosa'),
                const SizedBox(height: 8),
                Text(analysis.summary!,
                    style: const TextStyle(height: 1.5, fontSize: 14)),
                const SizedBox(height: 16),
              ],
              if (analysis.keyPoints.isNotEmpty) ...[
                _SectionTitle(
                    title: 'Asosiy nuqtalar',
                    icon: Icons.checklist_outlined,
                    color: AppColors.success),
                const SizedBox(height: 8),
                ...analysis.keyPoints.map((p) => _BulletItem(text: p,
                    color: AppColors.success)),
                const SizedBox(height: 16),
              ],
              if (analysis.risks.isNotEmpty) ...[
                _SectionTitle(
                    title: 'Risklar',
                    icon: Icons.warning_amber_outlined,
                    color: AppColors.warningAmber),
                const SizedBox(height: 8),
                ...analysis.risks.map(
                    (r) => _BulletItem(text: r, color: AppColors.warningAmber)),
                const SizedBox(height: 16),
              ],
              if (analysis.recommendations.isNotEmpty) ...[
                _SectionTitle(
                    title: 'Tavsiyalar',
                    icon: Icons.lightbulb_outlined,
                    color: AppColors.secondary),
                const SizedBox(height: 8),
                ...analysis.recommendations.map(
                    (r) => _BulletItem(text: r, color: AppColors.secondary)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final IconData? icon;
  final Color? color;

  const _SectionTitle({required this.title, this.icon, this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 16, color: color ?? AppColors.primary),
          const SizedBox(width: 6),
        ],
        Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: color ?? AppColors.primary,
          ),
        ),
      ],
    );
  }
}

class _BulletItem extends StatelessWidget {
  final String text;
  final Color color;

  const _BulletItem({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: const TextStyle(fontSize: 13, height: 1.4)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Generated Documents Tab
// ─────────────────────────────────────────────

class _GeneratedDocumentsListTab extends ConsumerWidget {
  const _GeneratedDocumentsListTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(documentsProvider);

    if (state.isLoading && state.generatedDocs.isEmpty) {
      return const Center(child: AppLoader());
    }

    if (state.generatedDocs.isEmpty) {
      return _EmptyState(
        icon: Icons.article_outlined,
        title: 'Hujjatlar yo\'q',
        subtitle: 'Ariza, shikoyat yoki boshqa hujjat yarating',
        actionLabel: 'Hujjat yaratish',
        onAction: () => context.goNamed(RouteNames.documentGenerator),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(documentsProvider.notifier).loadAll(),
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: state.generatedDocs.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, indent: 16, endIndent: 16),
        itemBuilder: (context, index) {
          final doc = state.generatedDocs[index];
          return _GeneratedDocTile(doc: doc);
        },
      ),
    );
  }
}

class _GeneratedDocTile extends ConsumerWidget {
  final GeneratedDocumentModel doc;

  const _GeneratedDocTile({required this.doc});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dateStr =
        DateFormat('dd.MM.yyyy').format(doc.createdAt.toLocal());
    return ListTile(
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.success.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(Icons.article_outlined, color: AppColors.success),
      ),
      title: Text(
        doc.documentTypeLabel,
        style:
            const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
      ),
      subtitle: Text(
        dateStr,
        style: const TextStyle(
            fontSize: 12, color: AppColors.textSecondary),
      ),
      trailing: doc.isCompleted
          ? const Icon(Icons.check_circle_outline,
              color: AppColors.success, size: 18)
          : doc.isFailed
              ? const Icon(Icons.error_outline,
                  color: AppColors.error, size: 18)
              : const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2)),
      onTap: doc.content?.isNotEmpty == true
          ? () => _showContent(context, ref, doc)
          : null,
    );
  }

  void _showContent(
      BuildContext context, WidgetRef ref, GeneratedDocumentModel doc) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, controller) => _GeneratedDocContentSheet(
          doc: doc,
          scrollController: controller,
          parentContext: context,
          ref: ref,
        ),
      ),
    );
  }
}

class _GeneratedDocContentSheet extends StatefulWidget {
  final GeneratedDocumentModel doc;
  final ScrollController scrollController;
  final BuildContext parentContext;
  final WidgetRef ref;

  const _GeneratedDocContentSheet({
    required this.doc,
    required this.scrollController,
    required this.parentContext,
    required this.ref,
  });

  @override
  State<_GeneratedDocContentSheet> createState() =>
      _GeneratedDocContentSheetState();
}

class _GeneratedDocContentSheetState
    extends State<_GeneratedDocContentSheet> {
  bool _isExportingPdf = false;
  bool _isExportingDocx = false;

  Future<void> _exportPdf() async {
    setState(() => _isExportingPdf = true);
    try {
      final dataSource =
          widget.ref.read(documentsRemoteDataSourceProvider);
      final filePath = await dataSource.exportPdf(widget.doc.id);
      if (!mounted) return;
      Navigator.pop(context);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(filePath, mimeType: 'application/pdf')],
          title: '${widget.doc.documentTypeLabel}.pdf',
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(widget.parentContext).showSnackBar(
        SnackBar(
          content: Text('PDF eksport xatoligi: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isExportingPdf = false);
    }
  }

  Future<void> _exportDocx() async {
    setState(() => _isExportingDocx = true);
    try {
      final dataSource =
          widget.ref.read(documentsRemoteDataSourceProvider);
      final filePath = await dataSource.exportDocx(widget.doc.id);
      if (!mounted) return;
      Navigator.pop(context);
      await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile(
              filePath,
              mimeType:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ),
          ],
          title: '${widget.doc.documentTypeLabel}.docx',
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(widget.parentContext).showSnackBar(
        SnackBar(
          content: Text('DOCX eksport xatoligi: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isExportingDocx = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 8),
        Container(
          width: 36,
          height: 4,
          decoration: BoxDecoration(
            color: AppColors.border,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            widget.doc.documentTypeLabel,
            style: const TextStyle(
                fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            controller: widget.scrollController,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Text(
              widget.doc.content ?? '',
              style: const TextStyle(fontSize: 13, height: 1.6),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isExportingPdf ? null : _exportPdf,
                  icon: _isExportingPdf
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.picture_as_pdf_outlined),
                  label: Text(_isExportingPdf ? 'Yuklanmoqda...' : 'PDF'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isExportingDocx ? null : _exportDocx,
                  icon: _isExportingDocx
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.description_outlined),
                  label: Text(_isExportingDocx ? 'Yuklanmoqda...' : 'DOCX'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────
// Shared empty state
// ─────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onAction;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onAction,
  });

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
              child: Icon(icon, size: 40, color: AppColors.primary),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.add),
              label: Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }
}
