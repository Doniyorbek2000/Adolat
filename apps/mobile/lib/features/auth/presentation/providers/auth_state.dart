import 'package:equatable/equatable.dart';

import '../../domain/entities/auth_user.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, needsVerification, error }

class AuthState extends Equatable {
  final AuthStatus status;
  final AuthUser? user;
  final String? errorMessage;
  final String? verificationTarget;
  final String? verificationType;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
    this.verificationTarget,
    this.verificationType,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    String? errorMessage,
    String? verificationTarget,
    String? verificationType,
    bool clearUser = false,
    bool clearError = false,
    bool clearVerification = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      verificationTarget: clearVerification ? null : (verificationTarget ?? this.verificationTarget),
      verificationType: clearVerification ? null : (verificationType ?? this.verificationType),
    );
  }

  @override
  List<Object?> get props => [status, user, errorMessage, verificationTarget, verificationType];
}
