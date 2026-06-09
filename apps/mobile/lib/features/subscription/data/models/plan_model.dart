class PlanModel {
  final String id;
  final String code;
  final String name;
  final String? description;
  final int priceUzs;
  final int questionsLimit;
  final int analysesLimit;
  final int documentsLimit;
  final int voiceMinutesLimit;
  final bool isPopular;

  const PlanModel({
    required this.id,
    required this.code,
    required this.name,
    this.description,
    required this.priceUzs,
    required this.questionsLimit,
    required this.analysesLimit,
    required this.documentsLimit,
    required this.voiceMinutesLimit,
    this.isPopular = false,
  });

  factory PlanModel.fromJson(Map<String, dynamic> json) => PlanModel(
        id: json['id'] as String,
        code: json['code'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        priceUzs: (json['priceUzs'] as num?)?.toInt() ?? 0,
        questionsLimit: (json['questionsLimit'] as num?)?.toInt() ?? 0,
        analysesLimit: (json['analysesLimit'] as num?)?.toInt() ?? 0,
        documentsLimit: (json['documentsLimit'] as num?)?.toInt() ?? 0,
        voiceMinutesLimit: (json['voiceMinutesLimit'] as num?)?.toInt() ?? 0,
        isPopular: json['isPopular'] as bool? ?? false,
      );
}
