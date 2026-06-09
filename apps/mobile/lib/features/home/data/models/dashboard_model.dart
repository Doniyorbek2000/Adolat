class UsageStatModel {
  final int used;
  final int limit;
  final int remaining;

  const UsageStatModel({
    required this.used,
    required this.limit,
    required this.remaining,
  });

  factory UsageStatModel.fromJson(Map<String, dynamic> json) {
    return UsageStatModel(
      used: json['used'] as int? ?? 0,
      limit: json['limit'] as int? ?? 0,
      remaining: json['remaining'] as int? ?? 0,
    );
  }
}

class VoiceStatModel {
  final int usedSeconds;
  final int limitSeconds;
  final int remainingSeconds;
  final int remainingMinutes;

  const VoiceStatModel({
    required this.usedSeconds,
    required this.limitSeconds,
    required this.remainingSeconds,
    required this.remainingMinutes,
  });

  factory VoiceStatModel.fromJson(Map<String, dynamic> json) {
    return VoiceStatModel(
      usedSeconds: json['usedSeconds'] as int? ?? 0,
      limitSeconds: json['limitSeconds'] as int? ?? 0,
      remainingSeconds: json['remainingSeconds'] as int? ?? 0,
      remainingMinutes: json['remainingMinutes'] as int? ?? 0,
    );
  }
}

class DashboardUsageModel {
  final UsageStatModel questions;
  final UsageStatModel documentAnalyses;
  final UsageStatModel generatedDocuments;
  final VoiceStatModel voice;

  const DashboardUsageModel({
    required this.questions,
    required this.documentAnalyses,
    required this.generatedDocuments,
    required this.voice,
  });

  factory DashboardUsageModel.fromJson(Map<String, dynamic> json) {
    return DashboardUsageModel(
      questions: UsageStatModel.fromJson(json['questions'] as Map<String, dynamic>),
      documentAnalyses: UsageStatModel.fromJson(json['documentAnalyses'] as Map<String, dynamic>),
      generatedDocuments: UsageStatModel.fromJson(json['generatedDocuments'] as Map<String, dynamic>),
      voice: VoiceStatModel.fromJson(json['voice'] as Map<String, dynamic>),
    );
  }
}

class SubscriptionSummaryModel {
  final String planCode;
  final String planName;
  final String status;
  final DateTime? currentPeriodEnd;
  final int daysLeft;

  const SubscriptionSummaryModel({
    required this.planCode,
    required this.planName,
    required this.status,
    this.currentPeriodEnd,
    required this.daysLeft,
  });

  factory SubscriptionSummaryModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionSummaryModel(
      planCode: json['planCode'] as String? ?? '',
      planName: json['planName'] as String? ?? '',
      status: json['status'] as String? ?? '',
      currentPeriodEnd: json['currentPeriodEnd'] != null
          ? DateTime.parse(json['currentPeriodEnd'] as String)
          : null,
      daysLeft: json['daysLeft'] as int? ?? 0,
    );
  }
}

class RecentChatModel {
  final String id;
  final String? title;
  final String? lastMessage;
  final DateTime updatedAt;

  const RecentChatModel({
    required this.id,
    this.title,
    this.lastMessage,
    required this.updatedAt,
  });

  factory RecentChatModel.fromJson(Map<String, dynamic> json) {
    return RecentChatModel(
      id: json['id'] as String,
      title: json['title'] as String?,
      lastMessage: json['lastMessage'] as String?,
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}

class RecentDocumentModel {
  final String id;
  final String title;
  final String type;
  final String status;
  final DateTime createdAt;

  const RecentDocumentModel({
    required this.id,
    required this.title,
    required this.type,
    required this.status,
    required this.createdAt,
  });

  factory RecentDocumentModel.fromJson(Map<String, dynamic> json) {
    return RecentDocumentModel(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      type: json['type'] as String? ?? '',
      status: json['status'] as String? ?? '',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class DashboardAlertModel {
  final String type;
  final String title;
  final String message;

  const DashboardAlertModel({
    required this.type,
    required this.title,
    required this.message,
  });

  factory DashboardAlertModel.fromJson(Map<String, dynamic> json) {
    return DashboardAlertModel(
      type: json['type'] as String? ?? '',
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
    );
  }
}

class DashboardUserModel {
  final String id;
  final String firstName;
  final String lastName;
  final String language;

  const DashboardUserModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.language,
  });

  String get displayName => '$firstName $lastName'.trim();

  factory DashboardUserModel.fromJson(Map<String, dynamic> json) {
    return DashboardUserModel(
      id: json['id'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      language: json['language'] as String? ?? 'UZ',
    );
  }
}

class DashboardModel {
  final DashboardUserModel user;
  final SubscriptionSummaryModel subscription;
  final DashboardUsageModel usage;
  final List<RecentChatModel> recentChats;
  final List<RecentDocumentModel> recentDocuments;
  final List<DashboardAlertModel> alerts;

  const DashboardModel({
    required this.user,
    required this.subscription,
    required this.usage,
    required this.recentChats,
    required this.recentDocuments,
    required this.alerts,
  });

  factory DashboardModel.fromJson(Map<String, dynamic> json) {
    return DashboardModel(
      user: DashboardUserModel.fromJson(json['user'] as Map<String, dynamic>),
      subscription: SubscriptionSummaryModel.fromJson(
        json['subscription'] as Map<String, dynamic>,
      ),
      usage: DashboardUsageModel.fromJson(json['usage'] as Map<String, dynamic>),
      recentChats: (json['recentChats'] as List<dynamic>?)
              ?.map((e) => RecentChatModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      recentDocuments: (json['recentDocuments'] as List<dynamic>?)
              ?.map((e) => RecentDocumentModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      alerts: (json['alerts'] as List<dynamic>?)
              ?.map((e) => DashboardAlertModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
