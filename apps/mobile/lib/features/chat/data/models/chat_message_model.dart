class CitationModel {
  final String sourceName;
  final String documentTitle;
  final String? articleRef;
  final String? documentUrl;
  final String? publishedAt;

  const CitationModel({
    required this.sourceName,
    required this.documentTitle,
    this.articleRef,
    this.documentUrl,
    this.publishedAt,
  });

  factory CitationModel.fromJson(Map<String, dynamic> json) {
    // Citation Engine shakli (law/source/article/date/link) va eski shaklni
    // (sourceName/documentTitle/...) ikkalasini ham qo'llab-quvvatlaydi.
    return CitationModel(
      sourceName: (json['source'] ?? json['sourceName'] ?? '') as String,
      documentTitle: (json['law'] ?? json['documentTitle'] ?? '') as String,
      articleRef: (json['article'] ?? json['articleRef']) as String?,
      documentUrl: (json['link'] ?? json['documentUrl']) as String?,
      publishedAt: (json['date'] ?? json['publishedAt']) as String?,
    );
  }
}

class ChatMessageModel {
  final String id;
  final String threadId;
  final String role; // 'USER' | 'ASSISTANT'
  final String content;
  final List<CitationModel> citations;
  final DateTime createdAt;

  const ChatMessageModel({
    required this.id,
    required this.threadId,
    required this.role,
    required this.content,
    required this.citations,
    required this.createdAt,
  });

  bool get isUser => role == 'USER';
  bool get isAssistant => role == 'ASSISTANT';

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: json['id'] as String,
      threadId: json['threadId'] as String? ?? '',
      role: json['role'] as String? ?? 'USER',
      content: json['content'] as String? ?? '',
      citations: (json['citations'] as List<dynamic>?)
              ?.map((e) => CitationModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
