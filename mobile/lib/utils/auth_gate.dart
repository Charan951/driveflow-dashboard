import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_provider.dart';
import 'location_helper.dart';

/// Returns true if the user is already signed in, or signs in from the
/// login screen that this helper opens.
Future<bool> ensureLoggedIn(BuildContext context) async {
  final auth = context.read<AuthProvider>();
  if (auth.isAuthenticated) return true;
  await Navigator.of(context).pushNamed('/login');
  if (!context.mounted) return false;
  return context.read<AuthProvider>().isAuthenticated;
}

/// After a successful login/signup: ask for location, then pop back into the
/// current session when login was pushed on top of the app, otherwise go home.
Future<void> completeAuthNavigation(
  BuildContext context,
  String homeRoute,
) async {
  await LocationHelper.requestPermissionAfterLogin();
  if (!context.mounted) return;
  if (Navigator.of(context).canPop()) {
    Navigator.of(context).pop(true);
    return;
  }
  Navigator.of(context).pushReplacementNamed(homeRoute);
}

/// Leave login/register without creating an account and return to the app.
void leaveAuthScreens(BuildContext context) {
  if (Navigator.of(context).canPop()) {
    Navigator.of(context).pop(false);
    return;
  }
  Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
}

/// Leave login/register without creating an account.
void browseAsGuest(BuildContext context) => leaveAuthScreens(context);

/// Used when a stored session expires. Catalog remains usable without
/// forcing a login wall (App Store Guideline 5.1.1(v)).
Future<void> handleUnauthorized(BuildContext context) async {
  final auth = context.read<AuthProvider>();
  if (auth.isAuthenticated) {
    await auth.logout();
  }
  if (!context.mounted) return;
  Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
}
