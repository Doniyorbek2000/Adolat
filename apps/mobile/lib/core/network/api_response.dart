class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final String? timestamp;

  const ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.timestamp,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) {
    return ApiResponse<T>(
      success: json['success'] as bool? ?? false,
      data: json['data'] != null ? fromJsonT(json['data']) : null,
      message: json['message'] as String?,
      timestamp: json['timestamp'] as String?,
    );
  }
}
