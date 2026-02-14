import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_provider.dart';
import '../widgets/customer_drawer.dart';

class DocumentsPage extends StatefulWidget {
  const DocumentsPage({super.key});

  @override
  State<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends State<DocumentsPage> {
  Future<bool> _ensureAuthenticated() async {
    final auth = context.read<AuthProvider>();
    final navigator = Navigator.of(context);
    if (auth.isAuthenticated) return true;
    await auth.loadMe();
    if (!mounted) return false;
    if (!auth.isAuthenticated) {
      navigator.pushNamedAndRemoveUntil('/login', (route) => false);
      return false;
    }
    return true;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _ensureAuthenticated();
    });
  }

  @override
  Widget build(BuildContext context) {
    final routeName = ModalRoute.of(context)?.settings.name;
    return Scaffold(
      backgroundColor: Colors.white,
      drawer: CustomerDrawer(currentRouteName: routeName),
      appBar: AppBar(
        title: const Text('Documents'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your documents',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Upload and manage service-related documents here.',
                        style: TextStyle(color: Colors.black54),
                      ),
                      const SizedBox(height: 14),
                      const _DocTile(
                        icon: Icons.receipt_long_outlined,
                        title: 'Invoices',
                        subtitle: 'Coming soon',
                      ),
                      const SizedBox(height: 10),
                      const _DocTile(
                        icon: Icons.description_outlined,
                        title: 'Service Reports',
                        subtitle: 'Coming soon',
                      ),
                      const SizedBox(height: 10),
                      const _DocTile(
                        icon: Icons.assignment_outlined,
                        title: 'Job Cards',
                        subtitle: 'Coming soon',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DocTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _DocTile({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF4F46E5)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(color: Colors.black54)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
