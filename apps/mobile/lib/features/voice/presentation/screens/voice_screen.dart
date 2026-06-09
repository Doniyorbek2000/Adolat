import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

enum _VoiceState { idle, recording, processing, answerReady }

class VoiceScreen extends StatefulWidget {
  const VoiceScreen({super.key});

  @override
  State<VoiceScreen> createState() => _VoiceScreenState();
}

class _VoiceScreenState extends State<VoiceScreen>
    with SingleTickerProviderStateMixin {
  _VoiceState _voiceState = _VoiceState.idle;
  String? _transcript;
  String? _answer;
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

  void _startRecording() {
    // Actual recording requires the `record` package. Show informational dialog.
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Ovoz yozish"),
        content: const Text(
          "Ovoz yozish funksiyasi uchun qo'shimcha o'rnatish kerak.\n\n"
          "Hozircha demo rejimida ishlash uchun \"Demo\" tugmasini bosing.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Yopish'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _startDemoRecording();
            },
            child: const Text('Demo'),
          ),
        ],
      ),
    );
  }

  void _startDemoRecording() {
    setState(() {
      _voiceState = _VoiceState.recording;
      _recordSeconds = 0;
      _transcript = null;
      _answer = null;
    });
    _pulseController.repeat(reverse: true);
    _recordTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() => _recordSeconds++);
      if (_recordSeconds >= 10) {
        _stopRecording();
      }
    });
  }

  void _stopRecording() {
    _recordTimer?.cancel();
    _pulseController.stop();
    _pulseController.reset();
    setState(() => _voiceState = _VoiceState.processing);

    // Simulate transcription + AI answer
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      setState(() {
        _transcript =
            "Mehnat shartnomasini buzgan ish beruvchidan qanday qilib kompensatsiya talab qilish mumkin?";
        _voiceState = _VoiceState.processing;
      });
      Future.delayed(const Duration(seconds: 2), () {
        if (!mounted) return;
        setState(() {
          _answer =
              "O'zbekiston Respublikasi Mehnat Kodeksining 100-moddasiga ko'ra, ish beruvchi tomonidan mehnat shartnomasi shartlari buzilganda, xodim kompensatsiya talab qilish huquqiga ega.\n\n"
              "Buning uchun quyidagi qadamlarni bajaring:\n"
              "1. Ish beruvchiga yozma murojaat yuboring\n"
              "2. Sud orqali da'vo bildiring\n"
              "3. Mehnat inspeksiyasiga shikoyat qiling";
          _voiceState = _VoiceState.answerReady;
        });
      });
    });
  }

  void _reset() {
    _recordTimer?.cancel();
    _pulseController.stop();
    _pulseController.reset();
    setState(() {
      _voiceState = _VoiceState.idle;
      _transcript = null;
      _answer = null;
      _recordSeconds = 0;
    });
  }

  void _sendToChat() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Suhbatga yuborildi"),
        backgroundColor: AppColors.success,
      ),
    );
  }

  String get _recordFormatted {
    final m = _recordSeconds ~/ 60;
    final s = _recordSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ovozli yordam'),
        automaticallyImplyLeading: false,
        actions: [
          if (_voiceState != _VoiceState.idle)
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
            _buildMicSection(),
            const SizedBox(height: 32),
            if (_transcript != null) _buildTranscriptCard(),
            if (_voiceState == _VoiceState.processing &&
                _transcript == null)
              _buildProcessingCard('Ovoz tahlil qilinmoqda...'),
            if (_voiceState == _VoiceState.processing &&
                _transcript != null)
              _buildProcessingCard('AI javob tayyorlamoqda...'),
            if (_answer != null) ...[
              const SizedBox(height: 16),
              _buildAnswerCard(),
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

  Widget _buildMicSection() {
    final isRecording = _voiceState == _VoiceState.recording;
    final isProcessing = _voiceState == _VoiceState.processing;

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
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.warningAmber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: AppColors.warningAmber.withValues(alpha: 0.4)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.info_outline,
                        size: 14, color: AppColors.warningAmber),
                    SizedBox(width: 6),
                    Text(
                      "Qo'shimcha o'rnatish kerak",
                      style: TextStyle(
                          fontSize: 12, color: AppColors.warningAmber),
                    ),
                  ],
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildTranscriptCard() {
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
            _transcript!,
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

  Widget _buildAnswerCard() {
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
            _answer!,
            style: const TextStyle(fontSize: 14, height: 1.5),
          ),
        ],
      ),
    );
  }
}
