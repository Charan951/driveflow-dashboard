// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:carzzi/pages/login_page.dart';
import 'package:carzzi/pages/register_page.dart';
import 'package:carzzi/pages/forgot_password_page.dart';
import 'package:carzzi/pages/reset_password_page.dart';
import 'package:carzzi/state/auth_provider.dart';

void main() {
  testWidgets('Login page renders and can navigate to register', (
    tester,
  ) async {
    // Set viewport size to ensure elements are visible without being clipped offscreen
    tester.view.physicalSize = const Size(1080, 2200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final auth = AuthProvider();
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: auth,
        child: MaterialApp(
          initialRoute: '/login',
          routes: {
            '/login': (_) => const LoginPage(),
            '/register': (_) => const RegisterPage(),
          },
        ),
      ),
    );

    expect(find.byKey(const Key('login_title')), findsOneWidget);
    expect(find.byKey(const Key('login_to_register')), findsOneWidget);

    final signupButton = find.byKey(const Key('login_to_register'));
    await tester.ensureVisible(signupButton);
    await tester.tap(signupButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));

    expect(find.byKey(const Key('register_title')), findsOneWidget);
    
    final loginButton = find.byKey(const Key('register_to_login'));
    await tester.ensureVisible(loginButton);
    await tester.tap(loginButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));

    expect(find.byKey(const Key('login_title')), findsOneWidget);
  });

  testWidgets('Login page forgot password navigation flow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final auth = AuthProvider();
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: auth,
        child: MaterialApp(
          initialRoute: '/login',
          routes: {
            '/login': (_) => const LoginPage(),
            '/forgot-password': (_) => const ForgotPasswordPage(),
            '/reset-password': (_) => const ResetPasswordPage(),
          },
        ),
      ),
    );

    // Verify Forgot Password button exists on LoginPage
    final forgotButton = find.byKey(const Key('forgot_password_button'));
    expect(forgotButton, findsOneWidget);

    // Tap Forgot Password button
    await tester.ensureVisible(forgotButton);
    await tester.tap(forgotButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));

    // Verify we navigated to ForgotPasswordPage
    expect(find.byKey(const Key('forgot_password_title')), findsOneWidget);

    // Verify "Have a reset token?" button exists
    final tokenButton = find.byKey(const Key('enter_token_button'));
    expect(tokenButton, findsOneWidget);

    // Tap it to go to ResetPasswordPage
    await tester.ensureVisible(tokenButton);
    await tester.tap(tokenButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));

    // Verify we are on ResetPasswordPage
    expect(find.byKey(const Key('reset_password_title')), findsOneWidget);
  });
}
