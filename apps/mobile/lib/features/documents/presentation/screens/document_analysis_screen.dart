import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../providers/documents_provider.dart';

class DocumentAnalysisScreen extends ConsumerStatefulWidget {
  const DocumentAnalysisScreen({super.key});

  @override
  ConsumerState<DocumentAnalysisScreen> createState() =>
      _DocumentAnalysisScreenState();
}

class _DocumentAnalysisScreenState
    extends ConsumerState<DocumentAnalysisScreen> {
  String _language = 'UZ';
  String? _selectedFileName;
  String? _selectedFileId;
  bool _isUploading = false;

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'txt'],
    );
    if (result == null || result.files.isEmpty) return;

    final file = result.files.first;
    if (file.path == null) return;

    setState(() {
      _selectedFileName = file.name;
      _isUploading = true;
    });

    try {
      final ds = ref.read(documentsRemoteDataSourceProvider);
      final fileId = await ds.uploadFile(file.path!, file.name);
      setState(() {
        _selectedFileId = fileId;
        _isUploading = false;
      });
    } catch (_) {
      setState(() => _isUploading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Faylni yuklashda xatolik')),
        );
      }
    }
  }

  Future<void> _startAnalysis() async {
    if (_selectedFileId == null) return;
    await ref
        .read(documentsProvider.notifier)
        .startAnalysis(_selectedFileId!, _language);

    if (mounted) {
      final state = ref.read(documentsProvider);
      if (state.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(state.errorMessage!)),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tahlil boshlandi')),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(documentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Hujjat tahlil qilish')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Hujjatni yuklang va AI tahlil qilsin',
              style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 24),

            InkWell(
              onTap: _isUploading ? null : _pickFile,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: _selectedFileId != null
                        ? AppColors.success
                        : AppColors.border,
                    width: 1.5,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  color: _selectedFileId != null
                      ? AppColors.success.withValues(alpha: 0.05)
                      : null,
                ),
                child: Column(
                  children: [
                    if (_isUploading)
                      const CircularProgressIndicator()
                    else if (_selectedFileId != null)
                      const Icon(Icons.check_circle,
                          size: 48, color: AppColors.success)
                    else
                      Icon(Icons.cloud_upload_outlined,
                          size: 48, color: AppColors.primary.withValues(alpha: 0.6)),
                    const SizedBox(height: 12),
                    Text(
                      _selectedFileName ?? 'Faylni tanlang',
                      style: TextStyle(
                        fontWeight: FontWeight.w500,
                        color: _selectedFileId != null
                            ? AppColors.success
                            : AppColors.textSecondary,
                      ),
                    ),
                    if (_selectedFileId == null)
                      const Padding(
                        padding: EdgeInsets.only(top: 4),
                        child: Text(
                          'PDF, DOC, DOCX, TXT',
                          style: TextStyle(
                              fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            Row(
              children: [
                const Text('Til:', style: TextStyle(fontWeight: FontWeight.w500)),
                const SizedBox(width: 12),
                ChoiceChip(
                  label: const Text('UZ'),
                  selected: _language == 'UZ',
                  onSelected: (_) => setState(() => _language = 'UZ'),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('RU'),
                  selected: _language == 'RU',
                  onSelected: (_) => setState(() => _language = 'RU'),
                ),
              ],
            ),

            const Spacer(),

            ElevatedButton(
              onPressed: _selectedFileId != null && !state.isActionLoading
                  ? _startAnalysis
                  : null,
              child: state.isActionLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Tahlilni boshlash'),
            ),
          ],
        ),
      ),
    );
  }
}
