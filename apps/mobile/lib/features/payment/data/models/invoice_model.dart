class InvoiceModel {
  final String id;
  final double amount;
  final String currency;
  final String status;
  final String? paymentUrl;
  final DateTime createdAt;

  const InvoiceModel({
    required this.id,
    required this.amount,
    required this.currency,
    required this.status,
    this.paymentUrl,
    required this.createdAt,
  });

  factory InvoiceModel.fromJson(Map<String, dynamic> json) {
    return InvoiceModel(
      id: json['id'] as String,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'UZS',
      status: json['status'] as String? ?? 'PENDING',
      paymentUrl: json['paymentUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'amount': amount,
        'currency': currency,
        'status': status,
        'paymentUrl': paymentUrl,
        'createdAt': createdAt.toIso8601String(),
      };
}
