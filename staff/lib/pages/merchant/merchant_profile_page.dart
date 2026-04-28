import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../models/user.dart';
import '../../widgets/merchant/merchant_nav.dart';
import '../../state/theme_provider.dart';
import '../../core/app_colors.dart';

class MerchantProfilePage extends StatefulWidget {
  const MerchantProfilePage({super.key});

  @override
  State<MerchantProfilePage> createState() => _MerchantProfilePageState();
}

class _MerchantProfilePageState extends State<MerchantProfilePage> {
  final AuthService _authService = AuthService();
  StaffUser? _user;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) setState(() => _isLoading = true);
    try {
      final user = await _authService.getCurrentUser(forceRefresh: true);
      if (mounted) {
        setState(() {
          _user = user;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.mode == ThemeMode.dark;

    return MerchantScaffold(
      title: 'Merchant Profile',
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _user == null
          ? const Center(child: Text('User not found'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: isDark
                        ? AppColors.primaryPurple.withValues(alpha: 0.1)
                        : Colors.deepPurple.withValues(alpha: 0.1),
                    child: Icon(
                      Icons.store,
                      size: 50,
                      color: isDark
                          ? AppColors.primaryPurple
                          : Colors.deepPurple,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _user!.name,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  Text(
                    _user!.email,
                    style: TextStyle(
                      fontSize: 16,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 32),
                  _buildProfileItem(
                    icon: Icons.badge,
                    label: 'Role',
                    value: _user!.role.toUpperCase(),
                    isDark: isDark,
                  ),
                  if (_user!.phone != null)
                    _buildProfileItem(
                      icon: Icons.phone,
                      label: 'Phone',
                      value: _user!.phone!,
                      isDark: isDark,
                    ),
                  if (_user!.location?.address != null)
                    _buildProfileItem(
                      icon: Icons.location_on,
                      label: 'Address',
                      value: _user!.location!.address!,
                      isDark: isDark,
                    ),
                  const SizedBox(height: 16),
                  // Theme Toggle
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.backgroundSecondary
                          : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark
                            ? AppColors.borderColor
                            : Colors.grey[200]!,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isDark
                              ? Icons.light_mode_rounded
                              : Icons.dark_mode_rounded,
                          color: isDark
                              ? AppColors.primaryPurple
                              : Colors.deepPurple,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Appearance',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark
                                      ? Colors.grey[400]
                                      : Colors.grey[600],
                                ),
                              ),
                              Text(
                                isDark ? 'Dark Mode' : 'Light Mode',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white : Colors.black,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: isDark,
                          onChanged: (v) {
                            themeProvider.toggleTheme();
                          },
                          activeColor: isDark
                              ? AppColors.primaryPurple
                              : Colors.deepPurple,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: () async {
                      await _authService.logout();
                      if (!mounted) return;
                      if (context.mounted) {
                        Navigator.pushNamedAndRemoveUntil(
                          context,
                          '/login',
                          (route) => false,
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 50),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Logout'),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildProfileItem({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.grey[50],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderColor : Colors.grey[200]!,
        ),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: isDark ? AppColors.primaryPurple : Colors.deepPurple,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
