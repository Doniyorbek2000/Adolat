class VoiceSessionModel {
  final String id;
  final int durationSeconds;
  final String? transcript;
  final String? responseText;
  final DateTime createdAt;

  const VoiceSessionModel({
    required this.id,
    required this.durationSeconds,
    this.transcript,
    this.responseText,
    required this.createdAt,
  });

  factory VoiceSessionModel.fromJson(Map<String, dynamic> json) {
    return VoiceSessionModel(
      id: json['id'] as String,
      durationSeconds: json['durationSeconds'] as int? ?? 0,
      transcript: json['transcript'] as String?,
      responseText: json['responseText'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  String get durationFormatted {
    final m = durationSeconds ~/ 60;
    final s = durationSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
}
