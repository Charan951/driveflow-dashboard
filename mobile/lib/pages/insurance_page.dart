import 'package:flutter/material.dart';

import '../widgets/customer_drawer.dart';

class InsurancePage extends StatefulWidget {
  const InsurancePage({super.key});

  @override
  State<InsurancePage> createState() => _InsurancePageState();
}

class _InsurancePageState extends State<InsurancePage>
    with SingleTickerProviderStateMixin {
  Color get _backgroundStart => const Color(0xFF020617);
  Color get _backgroundEnd => const Color(0xFF020617);
  Color get _accentPurple => const Color(0xFF7C3AED);
  Color get _accentBlue => const Color(0xFF22D3EE);
  late final AnimationController _glowController;
  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final routeName = ModalRoute.of(context)?.settings.name;
    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
      drawer: CustomerDrawer(currentRouteName: routeName),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 0,
        title: Row(
          children: [
            Builder(
              builder: (context) => Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    colors: [_accentPurple, _accentBlue],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: _accentBlue.withValues(alpha: 0.4),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: IconButton(
                  icon: const Icon(Icons.menu),
                  color: Colors.white,
                  tooltip: 'Menu',
                  onPressed: () => Scaffold.of(context).openDrawer(),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Insurance',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: isDark ? Colors.white : const Color(0xFF0F172A),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          if (isDark)
            Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0, -1.2),
                  radius: 1.4,
                  colors: [
                    _accentPurple.withValues(alpha: 0.14),
                    _accentBlue.withValues(alpha: 0.06),
                    _backgroundStart,
                  ],
                ),
              ),
            )
          else
            Container(color: Colors.white),
          if (isDark)
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black.withValues(alpha: 0.9), _backgroundEnd],
                ),
              ),
            ),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    RepaintBoundary(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.06)
                              : const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.08)
                                : const Color(0xFFE5E7EB),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: isDark
                                  ? Colors.black.withValues(alpha: 0.45)
                                  : Colors.black.withValues(alpha: 0.06),
                              blurRadius: 24,
                              offset: const Offset(0, 16),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                AnimatedBuilder(
                                  animation: _glowController,
                                  builder: (context, child) {
                                    final t = _glowController.value;
                                    return Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(16),
                                        gradient: RadialGradient(
                                          center: Alignment(0, -0.2 + 0.2 * t),
                                          colors: [
                                            _accentPurple.withValues(
                                              alpha: 0.85,
                                            ),
                                            _accentPurple.withValues(
                                              alpha: 0.25,
                                            ),
                                          ],
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: _accentPurple.withValues(
                                              alpha: 0.30 + 0.10 * t,
                                            ),
                                            blurRadius: 18,
                                            spreadRadius: 1.2,
                                          ),
                                        ],
                                      ),
                                      child: child,
                                    );
                                  },
                                  child: const Icon(
                                    Icons.shield_outlined,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'Insurance services',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w900,
                                          color: isDark
                                              ? Colors.white
                                              : const Color(0xFF0F172A),
                                        ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Manage your policy details and renewals here.',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    color: isDark
                                        ? Colors.white.withValues(alpha: 0.8)
                                        : Colors.black54,
                                  ),
                            ),
                            const SizedBox(height: 14),
                            FilledButton(
                              onPressed: () =>
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Insurance feature will be added here',
                                      ),
                                    ),
                                  ),
                              child: Text(
                                'View Plans',
                                style: Theme.of(context).textTheme.labelLarge
                                    ?.copyWith(
                                      color: isDark ? Colors.white : null,
                                    ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
