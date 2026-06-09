class DocumentAnalysisModel {
  final String id;
  final String status; // PENDING | PROCESSING | COMPLETED | FAILED
  final Map<String, dynamic>? result;
  final String? summary;
  final DateTime createdAt;

  const DocumentAnalysisModel({
    required this.id,
    required this.status,
    this.result,
    this.summary,
    required this.createdAt,
  });

  bool get isPending => status == 'PENDING';
  bool get isProcessing => status == 'PROCESSING';
  bool get isCompleted => status == 'COMPLETED';
  bool get isFailed => status == 'FAILED';

  List<String> get keyPoints {
    final raw = result?['keyPoints'];
    if (raw is List) return raw.cast<String>();
    return [];
  }

  List<String> get risks {
    final raw = result?['risks'];
    if (raw is List) return raw.cast<String>();
    return [];
  }

  List<String> get recommendations {
    final raw = result?['recommendations'];
    if (raw is List) return raw.cast<String>();
    return [];
  }

  factory DocumentAnalysisModel.fromJson(Map<String, dynamic> json) {
    return DocumentAnalysisModel(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'PENDING',
      result: json['result'] as Map<String, dynamic>?,
      summary: json['summary'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
