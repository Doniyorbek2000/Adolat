class Validators {
  static bool isValidEmail(String email) =>
      RegExp(r'^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$').hasMatch(email);

  static bool isValidPhoneUz(String phone) =>
      RegExp(r'^\+998\d{9}$').hasMatch(phone);

  static String? validateRequired(String? value, {String? fieldName}) {
    if (value == null || value.trim().isEmpty) {
      return '${fieldName ?? 'Maydon'} kiritilishi shart';
    }
    return null;
  }

  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) return 'Parol kiritilishi shart';
    if (value.length < 8) return 'Parol kamida 8 belgidan iborat bo\'lishi kerak';
    if (!value.contains(RegExp(r'[A-Z]'))) return 'Parolda kamida 1 ta katta harf bo\'lishi kerak';
    if (!value.contains(RegExp(r'[a-z]'))) return 'Parolda kamida 1 ta kichik harf bo\'lishi kerak';
    if (!value.contains(RegExp(r'\d'))) return 'Parolda kamida 1 ta raqam bo\'lishi kerak';
    return null;
  }

  static String? validateConfirmPassword(String? value, String password) {
    if (value == null || value.isEmpty) return 'Parolni tasdiqlang';
    if (value != password) return 'Parollar mos kelmadi';
    return null;
  }

  static PasswordStrength checkPasswordStrength(String password) {
    int score = 0;
    if (password.length >= 8) score++;
    if (password.contains(RegExp(r'[A-Z]'))) score++;
    if (password.contains(RegExp(r'[a-z]'))) score++;
    if (password.contains(RegExp(r'\d'))) score++;
    if (password.contains(RegExp(r'[!@#\$%^&*]'))) score++;

    if (score <= 2) return PasswordStrength.weak;
    if (score <= 3) return PasswordStrength.medium;
    return PasswordStrength.strong;
  }
}

enum PasswordStrength { weak, medium, strong }
