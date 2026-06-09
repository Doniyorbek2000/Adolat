class SupportTicketModel {
  final String id;
  final String subject;
  final String? category;
  final String status; // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  final String priority; // LOW, NORMAL, HIGH, URGENT
  final DateTime createdAt;

  const SupportTicketModel({
    required this.id,
    required this.subject,
    this.category,
    required this.status,
    required this.priority,
    required this.createdAt,
  });

  factory SupportTicketModel.fromJson(Map<String, dynamic> json) {
    return SupportTicketModel(
      id: json['id'] as String,
      subject: json['subject'] as String? ?? '',
      category: json['category'] as String?,
      status: json['status'] as String? ?? 'OPEN',
      priority: json['priority'] as String? ?? 'NORMAL',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'subject': subject,
        'category': category,
        'status': status,
        'priority': priority,
        'createdAt': createdAt.toIso8601String(),
      };
}

class SupportMessageModel {
  final String id;
  final String content;
  final bool isAdmin; // true if from admin (senderAdminId != null)
  final DateTime createdAt;

  const SupportMessageModel({
    required this.id,
    required this.content,
    required this.isAdmin,
    required this.createdAt,
  });

  factory SupportMessageModel.fromJson(Map<String, dynamic> json) {
    return SupportMessageModel(
      id: json['id'] as String,
      content: json['content'] as String? ?? '',
      isAdmin: json['senderAdminId'] != null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'content': content,
        'isAdmin': isAdmin,
        'createdAt': createdAt.toIso8601String(),
      };
}
