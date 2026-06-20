import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../providers/documents_provider.dart';

class DocumentGeneratorScreen extends ConsumerStatefulWidget {
  const DocumentGeneratorScreen({super.key});

  @override
  ConsumerState<DocumentGeneratorScreen> createState() =>
      _DocumentGeneratorScreenState();
}

class _DocumentGeneratorScreenState
    extends ConsumerState<DocumentGeneratorScreen> {
  String? _selectedType;
  String _language = 'UZ';
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};

  static const _documentTypes = [
    ('ARIZA', 'Ariza'),
    ('SHIKOYAT', 'Shikoyat'),
    ('DAVO_ARIZASI', "Da'vo arizasi"),
    ('MUROJAAT_XATI', 'Murojaat xati'),
    ('TUSHUNTIRISH_XATI', 'Tushuntirish xati'),
    ('HOKIMLIKKA_MUROJAAT', 'Hokimlikka murojaat'),
  ];

  static const _fieldsByType = <String, List<(String, String)>>{
    'ARIZA': [
      ('recipient', 'Kimga (tashkilot/shaxs)'),
      ('subject', 'Mavzu'),
      ('body', 'Asosiy mazmun'),
      ('senderName', 'Ariza beruvchi'),
    ],
    'SHIKOYAT': [
      ('recipient', 'Kimga (tashkilot)'),
      ('subject', 'Shikoyat mavzusi'),
      ('body', 'Shikoyat mazmuni'),
      ('senderName', 'Shikoyat beruvchi'),
    ],
    'DAVO_ARIZASI': [
      ('court', 'Sud nomi'),
      ('plaintiff', "Da'vogar"),
      ('defendant', 'Javobgar'),
      ('subject', "Da'vo mavzusi"),
      ('body', "Da'vo asoslari"),
      ('claimAmount', "Da'vo summasi (ixtiyoriy)"),
    ],
    'MUROJAAT_XATI': [
      ('recipient', 'Kimga'),
      ('subject', 'Mavzu'),
      ('body', 'Xat mazmuni'),
      ('senderName', 'Murojaat qiluvchi'),
    ],
    'TUSHUNTIRISH_XATI': [
      ('recipient', 'Kimga'),
      ('subject', 'Mavzu'),
      ('body', 'Tushuntirish mazmuni'),
      ('senderName', 'Tushuntirish beruvchi'),
    ],
    'HOKIMLIKKA_MUROJAAT': [
      ('recipient', 'Hokimlik nomi'),
      ('subject', 'Murojaat mavzusi'),
      ('body', 'Murojaat mazmuni'),
      ('senderName', 'Murojaat qiluvchi'),
    ],
  };

  List<(String, String)> get _currentFields =>
      _fieldsByType[_selectedType] ?? [];

  TextEditingController _getController(String key) {
    return _controllers.putIfAbsent(key, () => TextEditingController());
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _generate() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedType == null) return;

    final answers = <String, String>{};
    for (final (key, _) in _currentFields) {
      final text = _getController(key).text.trim();
      if (text.isNotEmpty) answers[key] = text;
    }

    final doc = await ref
        .read(documentsProvider.notifier)
        .generateDocument(_selectedType!, answers, _language);

    if (mounted) {
      if (doc != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Hujjat yaratilmoqda...')),
        );
        Navigator.pop(context);
      } else {
        final error = ref.read(documentsProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error ?? 'Xatolik yuz berdi')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(documentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Hujjat yaratish')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'Hujjat turini tanlang va kerakli ma\'lumotlarni kiriting',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),

            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _documentTypes.map((t) {
                final (code, label) = t;
                final selected = _selectedType == code;
                return ChoiceChip(
                  label: Text(label),
                  selected: selected,
                  onSelected: (_) {
                    setState(() {
                      _selectedType = code;
                      _controllers.clear();
                    });
                  },
                );
              }).toList(),
            ),

            if (_selectedType != null) ...[
              const SizedBox(height: 24),
              ..._currentFields.map((field) {
                final (key, label) = field;
                final isMultiline = key == 'body';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: TextFormField(
                    controller: _getController(key),
                    maxLines: isMultiline ? 5 : 1,
                    decoration: InputDecoration(
                      labelText: label,
                      border: const OutlineInputBorder(),
                      alignLabelWithHint: isMultiline,
                    ),
                    validator: key == 'claimAmount'
                        ? null
                        : (v) => v == null || v.trim().isEmpty
                            ? 'Majburiy maydon'
                            : null,
                  ),
                );
              }),

              const SizedBox(height: 8),
              Row(
                children: [
                  const Text('Til:',
                      style: TextStyle(fontWeight: FontWeight.w500)),
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

              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: state.isActionLoading ? null : _generate,
                child: state.isActionLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Hujjatni yaratish'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
