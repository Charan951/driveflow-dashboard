import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/review_service.dart';
import '../../widgets/merchant/merchant_nav.dart';

class MerchantFeedbackPage extends StatefulWidget {
  const MerchantFeedbackPage({super.key});

  @override
  State<MerchantFeedbackPage> createState() => _MerchantFeedbackPageState();
}

class _MerchantFeedbackPageState extends State<MerchantFeedbackPage> {
  final ReviewService _service = ReviewService();
  final AuthService _authService = AuthService();
  List<Review> _reviews = [];
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
      if (user != null) {
        final data = await _service.getMerchantReviews(user.id);
        if (mounted) {
          setState(() {
            _reviews = data;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load feedback')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MerchantScaffold(
      title: 'Customer Feedback',
      body: RefreshIndicator(
        onRefresh: _load,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _reviews.isEmpty
                ? const Center(child: Text('No feedback yet'))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _reviews.length,
                    itemBuilder: (context, index) {
                      final review = _reviews[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: Colors.grey[200]!),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: List.generate(
                                      5,
                                      (i) => Icon(
                                        i < review.rating
                                            ? Icons.star
                                            : Icons.star_border,
                                        color: Colors.amber,
                                        size: 20,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    review.createdAt?.split('T')[0] ?? '',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[500],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                review.comment,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Colors.black87,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'By: ${review.userId ?? 'Customer'}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[700],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
