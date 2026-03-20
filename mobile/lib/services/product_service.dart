import '../core/api_client.dart';

class Product {
  final String id;
  final String name;
  final String description;
  final num price;
  final String category;
  final int stock;
  final String? image;
  final String? merchant;

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.stock,
    this.image,
    this.merchant,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: (json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      price: json['price'] is num ? (json['price'] as num) : 0,
      category: (json['category'] ?? '').toString(),
      stock: json['stock'] is num ? (json['stock'] as num).toInt() : 0,
      image: json['image']?.toString(),
      merchant: json['merchant']?.toString(),
    );
  }
}

class ProductService {
  final ApiClient _api = ApiClient();

  Future<List<Product>> getAllProducts() async {
    final res = await _api.getAny('/products/all');
    final items = <Product>[];
    if (res is List) {
      for (final e in res) {
        if (e is Map<String, dynamic>) {
          items.add(Product.fromJson(e));
        } else if (e is Map) {
          items.add(Product.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }
    return items;
  }
}
