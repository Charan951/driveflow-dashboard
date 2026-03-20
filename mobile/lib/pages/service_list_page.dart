import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/env.dart';
import '../state/navigation_provider.dart';
import '../services/catalog_service.dart';
import '../models/service.dart';
import '../state/auth_provider.dart';
import '../widgets/customer_drawer.dart';

String? _resolveImageUrl(String? raw) {
  if (raw == null) return null;
  final s = raw.trim();
  if (s.isEmpty) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return '${Env.baseUrl}$s';
  return '${Env.baseUrl}/$s';
}

class ServiceListPage extends StatefulWidget {
  const ServiceListPage({super.key});
  @override
  State<ServiceListPage> createState() => _ServiceListPageState();
}

class _ServiceListPageState extends State<ServiceListPage> {
  final _catalogService = CatalogService();
  late Future<List<ServiceItem>> _future;
  String? _title;
  String? _filterKey;

  @override
  void initState() {
    super.initState();
    _future = _catalogService.listServices();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final nav = context.watch<NavigationProvider>();
    final args = nav.arguments;

    if (args is ServiceItem) {
      Future.microtask(() async {
        try {
          final services = await _future;
          if (!mounted) return;
          await _openBookServiceFlow(initialService: args, services: services);
          nav.clearArguments();
        } catch (_) {}
      });
    } else if (args is Map) {
      final nextTitle = args['title']?.toString();
      final nextFilter = args['filter']?.toString();
      if (nextTitle != null && nextTitle.isNotEmpty) {
        setState(() => _title = nextTitle);
      }
      if (nextFilter != null && nextFilter.isNotEmpty) {
        setState(() => _filterKey = nextFilter);
      }
      final openBookHint = args['openBookHint'] == true;
      if (openBookHint) {
        Future.microtask(() {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Select a service to book')),
          );
          nav.clearArguments();
        });
      }
    }
  }

  List<ServiceItem> _applyFilter(List<ServiceItem> services) {
    final key = _filterKey;
    if (key == null || key.isEmpty) return services;
    final needle = key.toLowerCase();

    bool matches(ServiceItem s) {
      final name = s.name.toLowerCase();
      final category = s.category?.toLowerCase() ?? '';

      if (needle == 'car_wash') {
        return category == 'car wash' ||
            category == 'wash' ||
            name.contains('wash') ||
            name.contains('polish') ||
            name.contains('detail');
      }
      if (needle == 'tires_battery') {
        return category == 'tyres' ||
            category == 'battery' ||
            category == 'tyre & battery' ||
            name.contains('tire') ||
            name.contains('tyre') ||
            name.contains('battery');
      }
      return name.contains(needle) || category.contains(needle);
    }

    return services.where(matches).toList();
  }

  void _showServiceDetails(ServiceItem service, List<ServiceItem> allServices) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final textColor = isDark ? Colors.white : Colors.black87;
        final subTextColor = isDark ? Colors.white : Colors.black54;
        final imageUrl = _resolveImageUrl(service.image);

        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          builder: (context, scrollController) => Container(
            decoration: BoxDecoration(
              color: isDark ? Colors.black : Colors.white,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(28),
              ),
              border: isDark ? Border.all(color: Colors.grey.shade900) : null,
            ),
            padding: const EdgeInsets.all(24),
            child: ListView(
              controller: scrollController,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 5,
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white24 : Colors.grey[300],
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                if (imageUrl != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: CachedNetworkImage(
                      imageUrl: imageUrl,
                      height: 200,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => const Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      errorWidget: (context, url, error) => Container(
                        height: 200,
                        width: double.infinity,
                        color: isDark ? Colors.white10 : Colors.grey[100],
                        child: const Icon(Icons.broken_image, size: 40),
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                Text(
                  service.name,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 8),
                if (service.category != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF4F46E5).withAlpha(25),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      service.category!,
                      style: const TextStyle(
                        color: Color(0xFF4F46E5),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                Text(
                  service.description ?? 'No description available.',
                  style: TextStyle(color: subTextColor, fontSize: 16),
                ),
                const SizedBox(height: 24),
                if (service.features.isNotEmpty) ...[
                  Text(
                    "What's Included",
                    style: TextStyle(
                      color: textColor,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...service.features.map(
                    (f) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle,
                            color: Colors.green,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(f, style: TextStyle(color: textColor)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Service Price',
                          style: TextStyle(color: subTextColor, fontSize: 12),
                        ),
                        Text(
                          '₹${service.price}',
                          style: TextStyle(
                            color: const Color(0xFF4F46E5),
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    if (service.duration != null)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Duration',
                            style: TextStyle(color: subTextColor, fontSize: 12),
                          ),
                          Text(
                            '${service.duration} mins',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                const SizedBox(height: 32),
                FilledButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _openBookServiceFlow(
                      initialService: service,
                      services: allServices,
                    );
                  },
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Book Now',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openBookServiceFlow({
    required ServiceItem initialService,
    required List<ServiceItem> services,
  }) async {
    final messenger = ScaffoldMessenger.of(context);
    final auth = context.read<AuthProvider>();

    try {
      if (!auth.isAuthenticated) {
        await auth.loadMe();
      }
      if (!mounted) return;
      if (!auth.isAuthenticated) {
        messenger.showSnackBar(
          const SnackBar(content: Text('Please login to book a service')),
        );
        await Navigator.pushNamed(context, '/login');
        return;
      }

      // Set the initial service in NavigationProvider
      context.read<NavigationProvider>().setArguments(initialService);

      // Navigate to the standalone BookServiceFlowPage
      Navigator.pushNamed(context, '/book', arguments: initialService.category);
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black87;
    final subTextColor = isDark ? Colors.white70 : Colors.black54;

    return Scaffold(
      extendBody: true,
      drawer: const CustomerDrawer(currentRouteName: '/services'),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _buildAppBar(context, textColor, subTextColor),
            Expanded(
              child: FutureBuilder<List<ServiceItem>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    );
                  }
                  if (snapshot.hasError) {
                    return Center(
                      child: Text(
                        'Error: ${snapshot.error}',
                        style: const TextStyle(color: Colors.white70),
                      ),
                    );
                  }

                  final allServices = snapshot.data ?? [];
                  final services = _applyFilter(allServices);

                  if (services.isEmpty) {
                    return const Center(
                      child: Text(
                        'No services found.',
                        style: TextStyle(color: Colors.white70),
                      ),
                    );
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
                    itemCount: services.length,
                    itemBuilder: (context, index) {
                      final s = services[index];
                      return _ServiceCard(
                        service: s,
                        onTap: () => _showServiceDetails(s, allServices),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar(
    BuildContext context,
    Color textColor,
    Color subTextColor,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Builder(
                builder: (context) => IconButton(
                  icon: Icon(
                    Icons.menu,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                  onPressed: () => Scaffold.of(context).openDrawer(),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _title ?? 'Explore Services',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Quality care for your vehicle',
                      style: TextStyle(
                        color: isDark
                            ? Colors.white.withAlpha(153)
                            : Colors.black.withAlpha(153),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: isDark ? Colors.black : Colors.black.withAlpha(20),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark
                    ? Colors.grey.shade900
                    : Colors.black.withAlpha(25),
              ),
            ),
            child: TextField(
              onChanged: (v) => setState(() => _filterKey = v),
              decoration: InputDecoration(
                hintText: 'Search services...',
                hintStyle: TextStyle(
                  color: isDark
                      ? Colors.white.withAlpha(102)
                      : Colors.black.withAlpha(102),
                ),
                border: InputBorder.none,
                icon: Icon(
                  Icons.search,
                  color: isDark ? Colors.white54 : Colors.black54,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final ServiceItem service;
  final VoidCallback onTap;

  const _ServiceCard({required this.service, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final imageUrl = _resolveImageUrl(service.image);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? Colors.black : Colors.black.withAlpha(12),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? Colors.grey.shade900 : Colors.black.withAlpha(20),
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: isDark
                      ? Colors.white.withAlpha(25)
                      : Colors.black.withAlpha(25),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: imageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: imageUrl,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => const Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                          errorWidget: (context, url, error) => const Icon(
                            Icons.broken_image,
                            size: 24,
                            color: Colors.white24,
                          ),
                        )
                      : Icon(
                          Icons.build,
                          color: isDark ? Colors.white38 : Colors.black38,
                        ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      service.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      service.description ?? 'Quality vehicle service',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: isDark
                            ? Colors.white.withAlpha(127)
                            : Colors.black.withAlpha(127),
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '₹${service.price}',
                          style: const TextStyle(
                            color: Color(0xFF3B82F6),
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward_ios,
                          size: 14,
                          color: isDark ? Colors.white38 : Colors.black38,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
