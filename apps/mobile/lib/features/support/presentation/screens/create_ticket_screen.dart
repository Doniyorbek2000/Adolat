import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/support_provider.dart';

class CreateTicketScreen extends ConsumerStatefulWidget {
  const CreateTicketScreen({super.key});

  @override
  ConsumerState<CreateTicketScreen> createState() =>
      _CreateTicketScreenState();
}

class _CreateTicketScreenState extends ConsumerState<CreateTicketScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();

  static const _categories = [
    'Umumiy',
    "To'lov",
    'Texnik muammo',
    'Obuna',
    'Boshqa',
  ];

  String? _selectedCategory;

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final ticket = await ref.read(supportListProvider.notifier).createTicket(
          _subjectController.text.trim(),
          _selectedCategory,
          _messageController.text.trim(),
        );

    if (!mounted) return;

    if (ticket != null) {
      // Navigate to the created ticket detail
      context.goNamed(
        RouteNames.ticketDetail,
        pathParameters: {'id': ticket.id},
        extra: ticket,
      );
    } else {
      final errorMessage =
          ref.read(supportListProvider).errorMessage ?? 'Xatolik yuz berdi';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(supportListProvider).isLoading;

    return Scaffold(
      appBar: AppBar(
        title: Text(LocaleKeys.newTicket.tr()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Subject
              TextFormField(
                controller: _subjectController,
                decoration: InputDecoration(
                  labelText: 'Mavzu',
                  hintText: 'Muammoingizni qisqacha yozing',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                textInputAction: TextInputAction.next,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Mavzuni kiriting';
                  }
                  if (v.trim().length < 5) {
                    return 'Mavzu kamida 5 ta belgi bo\'lishi kerak';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Category dropdown
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: InputDecoration(
                  labelText: 'Kategoriya',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                hint: const Text('Kategoriyani tanlang'),
                items: _categories
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedCategory = v),
              ),
              const SizedBox(height: 16),

              // Message textarea
              TextFormField(
                controller: _messageController,
                decoration: InputDecoration(
                  labelText: 'Xabar',
                  hintText: 'Muammoingizni batafsil yozing...',
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                minLines: 5,
                maxLines: 10,
                textInputAction: TextInputAction.newline,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Xabarni kiriting';
                  }
                  if (v.trim().length < 10) {
                    return 'Xabar kamida 10 ta belgi bo\'lishi kerak';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 28),

              // Submit button
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Yuborish',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
