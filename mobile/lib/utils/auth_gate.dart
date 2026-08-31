import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/notification_service.dart';
import '../state/auth_provider.dart';
import '../state/navigation_provider.dart';
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

/// After a successful login/signup: navigate to the home screen first, then
/// ask for location/notification permissions — never before, so the OS
/// permission dialogs appear over the home screen instead of stacking on
/// top of the login/register screen mid-transition.
Future<void> completeAuthNavigation(
  BuildContext context,
  String homeRoute,
) async {
  // MainNavigationPage/CarzziDashboard is a single long-lived instance; if
  // it already mounted while browsing as a guest, logging in updates it in
  // place rather than remounting it, so it needs an explicit nudge to
  // refetch now that we're authenticated.
  context.read<NavigationProvider>().requestDashboardRefresh();
  if (Navigator.of(context).canPop()) {
    Navigator.of(context).pop(true);
  } else {
    Navigator.of(context).pushReplacementNamed(homeRoute);
  }
  // Neither call needs a BuildContext, so it's safe to fire these after the
  // navigation above even though this screen's context may unmount shortly.
  await LocationHelper.requestPermissionAfterLogin();
  await NotificationService().requestPermissions();
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
