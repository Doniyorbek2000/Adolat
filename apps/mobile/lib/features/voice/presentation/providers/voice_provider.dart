import 'dart:io';

import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../../../../core/network/network_exceptions.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/voice_remote_datasource.dart';
import '../../data/models/voice_session_model.dart';

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

class VoiceState extends Equatable {
  final List<VoiceSessionModel> sessions;
  final VoiceSessionModel? currentSession;
  final bool isRecording;
  final bool isProcessing;
  final String? transcript;
  final String? answer;
  final String? error;

  const VoiceState({
    this.sessions = const [],
    this.currentSession,
    this.isRecording = false,
    this.isProcessing = false,
    this.transcript,
    this.answer,
    this.error,
  });

  VoiceState copyWith({
    List<VoiceSessionModel>? sessions,
    VoiceSessionModel? currentSession,
    bool? isRecording,
    bool? isProcessing,
    String? transcript,
    String? answer,
    String? error,
    bool clearSession = false,
    bool clearTranscript = false,
    bool clearAnswer = false,
    bool clearError = false,
  }) {
    return VoiceState(
      sessions: sessions ?? this.sessions,
      currentSession: clearSession ? null : (currentSession ?? this.currentSession),
      isRecording: isRecording ?? this.isRecording,
      isProcessing: isProcessing ?? this.isProcessing,
      transcript: clearTranscript ? null : (transcript ?? this.transcript),
      answer: clearAnswer ? null : (answer ?? this.answer),
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [
        sessions,
        currentSession,
        isRecording,
        isProcessing,
        transcript,
        answer,
        error,
      ];
}

// ─────────────────────────────────────────────
// DataSource Provider
// ─────────────────────────────────────────────

final voiceRemoteDataSourceProvider = Provider<VoiceRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider).dio;
  return VoiceRemoteDataSource(dio);
});

// ─────────────────────────────────────────────
// StateNotifierProvider
// ─────────────────────────────────────────────

final voiceProvider = StateNotifierProvider<VoiceNotifier, VoiceState>(
  (ref) => VoiceNotifier(ref.watch(voiceRemoteDataSourceProvider)),
);

class VoiceNotifier extends StateNotifier<VoiceState> {
  final VoiceRemoteDataSource _dataSource;
  final AudioRecorder _recorder = AudioRecorder();
  String? _currentRecordingPath;

  VoiceNotifier(this._dataSource) : super(const VoiceState());

  /// Request microphone permission and start recording to a temp file.
  Future<bool> startRecording() async {
    state = state.copyWith(clearError: true);

    // Check microphone permission
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      state = state.copyWith(
        error: 'Mikrofon ruxsati berilmadi. Iltimos, sozlamalardan ruxsat bering.',
      );
      return false;
    }

    // Check if recorder is available
    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) {
      state = state.copyWith(
        error: 'Mikrofon mavjud emas yoki ruxsat berilmadi.',
      );
      return false;
    }

    try {
      final tempDir = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      _currentRecordingPath = '${tempDir.path}/voice_$timestamp.m4a';

      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          sampleRate: 44100,
          bitRate: 128000,
        ),
        path: _currentRecordingPath!,
      );

      state = state.copyWith(
        isRecording: true,
        clearTranscript: true,
        clearAnswer: true,
        clearSession: true,
      );
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Ovoz yozishni boshlashda xatolik: $e');
      return false;
    }
  }

  /// Stop recording and return the file path.
  Future<String?> stopRecording() async {
    try {
      final path = await _recorder.stop();
      state = state.copyWith(isRecording: false);
      return path ?? _currentRecordingPath;
    } catch (e) {
      state = state.copyWith(
        isRecording: false,
        error: 'Ovoz yozishni to\'xtatishda xatolik: $e',
      );
      return null;
    }
  }

  /// Upload the recorded audio file to the backend and get transcript + answer.
  Future<void> submitAudio(String filePath) async {
    state = state.copyWith(isProcessing: true, clearError: true);
    try {
      final session = await _dataSource.createSession(filePath);
      state = state.copyWith(
        isProcessing: false,
        currentSession: session,
        transcript: session.transcript,
        answer: session.responseText,
      );

      // Clean up the temp file
      try {
        final file = File(filePath);
        if (await file.exists()) {
          await file.delete();
        }
      } catch (_) {
        // Ignore cleanup errors
      }
    } on AppException catch (e) {
      state = state.copyWith(isProcessing: false, error: e.message);
    } catch (e) {
      state = state.copyWith(
        isProcessing: false,
        error: 'Xatolik yuz berdi',
      );
    }
  }

  /// Load all previous voice sessions from the backend.
  Future<void> loadSessions() async {
    try {
      final sessions = await _dataSource.getSessions();
      state = state.copyWith(sessions: sessions);
    } on AppException catch (e) {
      state = state.copyWith(error: e.message);
    } catch (_) {
      state = state.copyWith(error: 'Sessiyalarni yuklashda xatolik');
    }
  }

  /// Reset to idle state.
  void reset() {
    state = const VoiceState();
  }

  @override
  void dispose() {
    _recorder.dispose();
    super.dispose();
  }
}
