import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/voice_provider.dart';

class VoiceScreen extends ConsumerStatefulWidget {
  const VoiceScreen({super.key});

  @override
  ConsumerState<VoiceScreen> createState() => _VoiceScreenState();
}

class _VoiceScreenState extends ConsumerState<VoiceScreen>
    with SingleTickerProviderStateMixin {
  int _recordSeconds = 0;
  Timer? _recordTimer;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.18).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _recordTimer?.cancel();
    super.dispose();
  }

  Future<void> _startRecording() async {
    final notifier = ref.read(voiceProvider.notifier);
    final started = await notifier.startRecording();
    if (!started) {
      if (mounted) {
        final error = ref.read(voiceProvider).error;
        if (error != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(error),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
      return;
    }

    setState(() => _recordSeconds = 0);
    _pulseController.repeat(reverse: true);
    _recordTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() => _recordSeconds++);
      if (_recordSeconds >= 120) {
        _stopRecording();
      }
    });
  }

  Future<void> _stopRecording() async {
    _recordTimer?.cancel();
    _pulseController.stop();
    _pulseController.reset();

    final notifier = ref.read(voiceProvider.notifier);
    final filePath = await notifier.stopRecording();
    if (filePath != null) {
      await notifier.submitAudio(filePath);
    }
  }

  void _reset() {
    _recordTimer?.cancel();
    _pulseController.stop();
    _pulseController.reset();
    setState(() => _recordSeconds = 0);
    ref.read(voiceProvider.notifier).reset();
  }

  void _sendToChat() {
    final voiceState = ref.read(voiceProvider);
    final transcript = voiceState.transcript;
    if (transcript == null || transcript.isEmpty) return;

    context.pushNamed(
      RouteNames.chatThread,
      pathParameters: {'threadId': 'new'},
      extra: transcript,
    );
  }

  String get _recordFormatted {
    final m = _recordSeconds ~/ 60;
    final s = _recordSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final voiceState = ref.watch(voiceProvider);
    final isRecording = voiceState.isRecording;
    final isProcessing = voiceState.isProcessing;
    final transcript = voiceState.transcript;
    final answer = voiceState.answer;
    final isIdle = !isRecording && !isProcessing && transcript == null && answer == null;

    // Show error snackbar
    ref.listen<VoiceState>(voiceProvider, (prev, next) {
      if (next.error != null && next.error != prev?.error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: AppColors.error,
          ),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ovozli yordam'),
        automaticallyImplyLeading: false,
        actions: [
          if (!isIdle)
            IconButton(
              icon: const Icon(Icons.refresh_outlined),
              onPressed: _reset,
              tooltip: 'Qayta boshlash',
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 16),
            _buildMicSection(isRecording, isProcessing),
            const SizedBox(height: 32),
            if (transcript != null) _buildTranscriptCard(transcript),
            if (isProcessing && transcript == null)
              _buildProcessingCard('Ovoz tahlil qilinmoqda...'),
            if (isProcessing && transcript != null)
              _buildProcessingCard('AI javob tayyorlamoqda...'),
            if (answer != null) ...[
              const SizedBox(height: 16),
              _buildAnswerCard(answer),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _sendToChat,
                  icon: const Icon(Icons.chat_bubble_outline),
                  label: const Text('Chatga yuborish'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMicSection(bool isRecording, bool isProcessing) {
    return Column(
      children: [
        ScaleTransition(
          scale: isRecording ? _pulseAnim : const AlwaysStoppedAnimation(1.0),
          child: GestureDetector(
            onTap: isProcessing
                ? null
                : isRecording
                    ? _stopRecording
                    : _startRecording,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isRecording
                    ? AppColors.error
                    : isProcessing
                        ? AppColors.textSecondary
                        : AppColors.primary,
                boxShadow: [
                  BoxShadow(
                    color: (isRecording ? AppColors.error : AppColors.primary)
                        .withValues(alpha: 0.4),
                    blurRadius: 20,
                    spreadRadius: 4,
                  ),
                ],
              ),
              child: Icon(
                isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                color: Colors.white,
                size: 46,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (isRecording)
          Column(
            children: [
              Text(
                'Gapiring...',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.error,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                _recordFormatted,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          )
        else if (isProcessing)
          const Text(
            'Qayta ishlash...',
            style: TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500),
          )
        else
          Column(
            children: [
              Text(
                'Savolingizni ayting',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Mikrofon tugmasini bosib, gapiring',
                style: TextStyle(
                    color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildTranscriptCard(String transcript) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.secondary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: AppColors.secondary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.person_outline,
                  size: 16, color: AppColors.secondary),
              SizedBox(width: 6),
              Text(
                'Sizning savolingiz',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.secondary),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            transcript,
            style: const TextStyle(fontSize: 14, height: 1.45),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingCard(String message) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2)),
          const SizedBox(width: 12),
          Text(message,
              style: const TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildAnswerCard(String answer) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? AppColors.cardDark
            : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              CircleAvatar(
                radius: 12,
                backgroundColor: AppColors.primary,
                child: Text('AI',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w700)),
              ),
              SizedBox(width: 8),
              Text(
                'Adolat AI javobi',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            answer,
            style: const TextStyle(fontSize: 14, height: 1.5),
          ),
        ],
      ),
    );
  }
}
