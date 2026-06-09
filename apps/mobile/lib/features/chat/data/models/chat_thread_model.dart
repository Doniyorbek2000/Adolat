class ChatThreadModel {
  final String id;
  final String? title;
  final String language;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ChatThreadModel({
    required this.id,
    this.title,
    required this.language,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ChatThreadModel.fromJson(Map<String, dynamic> json) {
    return ChatThreadModel(
      id: json['id'] as String,
      title: json['title'] as String?,
      language: json['language'] as String? ?? 'UZ',
      status: json['status'] as String? ?? 'ACTIVE',
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  String get displayTitle => title?.isNotEmpty == true ? title! : 'Yangi suhbat';
}
