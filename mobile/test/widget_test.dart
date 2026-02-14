// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:app/pages/login_page.dart';
import 'package:app/pages/register_page.dart';
import 'package:app/state/auth_provider.dart';

void main() {
  testWidgets('Login page renders and can navigate to register', (
    tester,
  ) async {
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

    await tester.tap(find.byKey(const Key('login_to_register')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));

    expect(find.byKey(const Key('register_title')), findsOneWidget);
    expect(find.byKey(const Key('register_to_login')), findsOneWidget);
  });
}
