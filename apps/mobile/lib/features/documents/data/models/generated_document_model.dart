class GeneratedDocumentModel {
  final String id;
  final String documentType;
  final String status;
  final String? content;
  final DateTime createdAt;

  const GeneratedDocumentModel({
    required this.id,
    required this.documentType,
    required this.status,
    this.content,
    required this.createdAt,
  });

  bool get isCompleted => status == 'COMPLETED';
  bool get isFailed => status == 'FAILED';

  String get documentTypeLabel {
    const labels = {
      'ARIZA': 'Ariza',
      'SHIKOYAT': 'Shikoyat',
      'DAVO_ARIZASI': "Da'vo arizasi",
      'MUROJAAT_XATI': 'Murojaat xati',
      'TUSHUNTIRISH_XATI': 'Tushuntirish xati',
      'HOKIMLIKKA_MUROJAAT': 'Hokimlikka murojaat',
    };
    return labels[documentType] ?? documentType;
  }

  factory GeneratedDocumentModel.fromJson(Map<String, dynamic> json) {
    return GeneratedDocumentModel(
      id: json['id'] as String,
      documentType: json['documentType'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      content: json['content'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
