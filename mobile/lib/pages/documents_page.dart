import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_colors.dart';
import '../widgets/customer_drawer.dart';
import '../services/document_service.dart';
import '../services/vehicle_service.dart';
import '../models/vehicle.dart';

class DocumentsPage extends StatefulWidget {
  const DocumentsPage({super.key});

  @override
  State<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends State<DocumentsPage> {
  final _documentService = DocumentService();
  final _vehicleService = VehicleService();

  bool _loading = true;
  String? _error;
  List<DocumentData> _documents = [];
  List<Vehicle> _vehicles = [];
  String? _selectedVehicleId;
  String _selectedType = 'all';

  final List<Map<String, String>> _documentTypes = [
    {'id': 'all', 'label': 'All'},
    {'id': 'rc', 'label': 'Registration'},
    {'id': 'insurance', 'label': 'Insurance'},
    {'id': 'puc', 'label': 'PUC'},
    {'id': 'invoice', 'label': 'Invoices'},
    {'id': 'warranty', 'label': 'Warranty'},
  ];

  Color get _accentPurple => AppColors.primaryBlue;
  Color get _accentBlue => AppColors.primaryBlueSoft;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _documentService.getAllDocuments(),
        _vehicleService.listMyVehicles(),
      ]);

      if (mounted) {
        setState(() {
          _documents = results[0] as List<DocumentData>;
          _vehicles = results[1] as List<Vehicle>;
          if (_vehicles.isNotEmpty) {
            _selectedVehicleId = _vehicles[0].id;
          }
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final routeName = ModalRoute.of(context)?.settings.name;

    final filteredDocs = _documents.where((doc) {
      final matchesVehicle = _selectedVehicleId != null
          ? doc.vehicleId == _selectedVehicleId
          : true;
      final matchesType =
          _selectedType == 'all' ||
          doc.type.toLowerCase().contains(_selectedType.toLowerCase());
      return matchesVehicle && matchesType;
    }).toList();

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
                margin: const EdgeInsets.only(left: 16),
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
              'Documents',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: isDark ? Colors.white : const Color(0xFF0F172A),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.upload_file),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Upload feature coming soon!')),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          if (isDark)
            Container(color: Colors.black)
          else
            Container(color: Colors.white),
          SafeArea(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Error: $_error'),
                        const SizedBox(height: 16),
                        Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                AppColors.primaryBlue,
                                AppColors.primaryBlueDark,
                              ],
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: ElevatedButton(
                            onPressed: _fetchData,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              foregroundColor: AppColors.textPrimary,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text('Retry'),
                          ),
                        ),
                      ],
                    ),
                  )
                : Column(
                    children: [
                      if (_vehicles.isNotEmpty)
                        Container(
                          height: 60,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _vehicles.length,
                            itemBuilder: (context, index) {
                              final v = _vehicles[index];
                              final selected = _selectedVehicleId == v.id;
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Text('${v.make} ${v.model}'),
                                  selected: selected,
                                  onSelected: (val) {
                                    if (val) {
                                      setState(() => _selectedVehicleId = v.id);
                                    }
                                  },
                                ),
                              );
                            },
                          ),
                        ),
                      Container(
                        height: 50,
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _documentTypes.length,
                          itemBuilder: (context, index) {
                            final type = _documentTypes[index];
                            final selected = _selectedType == type['id'];
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(type['label']!),
                                selected: selected,
                                onSelected: (val) {
                                  if (val) {
                                    setState(() => _selectedType = type['id']!);
                                  }
                                },
                              ),
                            );
                          },
                        ),
                      ),
                      Expanded(
                        child: filteredDocs.isEmpty
                            ? _buildEmptyState(isDark)
                            : ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: filteredDocs.length,
                                itemBuilder: (context, index) {
                                  final doc = filteredDocs[index];
                                  return _buildDocumentCard(doc, isDark);
                                },
                              ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.folder_open,
            size: 64,
            color: isDark ? Colors.white24 : Colors.black12,
          ),
          const SizedBox(height: 16),
          Text(
            'No documents found',
            style: TextStyle(color: isDark ? Colors.white : Colors.black54),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentCard(DocumentData doc, bool isDark) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: _accentPurple.withAlpha(40),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(Icons.description, color: _accentPurple),
        ),
        title: Text(doc.name, style: Theme.of(context).textTheme.titleMedium),
        subtitle: Text(
          '${doc.type.toUpperCase()} • ${doc.date.split('T')[0]}',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.download, size: 20),
              onPressed: () async {
                final url = Uri.parse(doc.url);
                if (await canLaunchUrl(url)) {
                  await launchUrl(url);
                } else if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Could not open document URL'),
                    ),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
