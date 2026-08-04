import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../core/app_colors.dart';

/// Generic in-app browser used for legal documents (Terms & Conditions,
/// Privacy Policy, ...). Pass the page [title] and the [url] to load.
class LegalWebViewPage extends StatefulWidget {
  const LegalWebViewPage({super.key, required this.title, required this.url});

  final String title;
  final String url;

  @override
  State<LegalWebViewPage> createState() => _LegalWebViewPageState();
}

class _LegalWebViewPageState extends State<LegalWebViewPage> {
  late final WebViewController _controller;
  bool _isLoading = true;

  // Hides the site's own header/nav bar (logo + hamburger menu) since the
  // in-app screen already shows a title in its own AppBar. Only matches
  // exact class/id tokens (not substrings) so page content headings like
  // "Privacy Policy" are never affected.
  //
  // carzzi.com is a client-rendered SPA: the header doesn't exist in the DOM
  // until its JS bundle mounts, well after onPageFinished fires. So instead
  // of a one-shot scan, this installs a MutationObserver as early as
  // possible (onPageStarted) that hides matching elements the instant
  // they're inserted, however late that happens.
  static const _hideSiteHeaderJs = r'''
    (function() {
      if (window.__carzziHeaderHiderInstalled) return;
      window.__carzziHeaderHiderInstalled = true;

      var tokens = ['header', 'navbar', 'nav', 'site-header', 'top-nav', 'topbar'];

      function isTarget(el) {
        if (!el || el.nodeType !== 1) return false;
        var tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (tag === 'header' || tag === 'nav') return true;
        var classes = (el.className && el.className.split) ? el.className.split(/\s+/) : [];
        if (classes.some(function(c) { return tokens.indexOf(c.toLowerCase()) !== -1; })) return true;
        var id = el.id || '';
        return tokens.indexOf(id.toLowerCase()) !== -1;
      }

      function collapseTopSpacing() {
        document.documentElement.style.setProperty('margin-top', '0', 'important');
        if (document.body) {
          document.body.style.setProperty('margin-top', '0', 'important');
          document.body.style.setProperty('padding-top', '0', 'important');
        }
      }

      function scan(root) {
        if (!root || !root.querySelectorAll) return;
        if (isTarget(root)) {
          root.style.setProperty('display', 'none', 'important');
        }
        root.querySelectorAll('header, nav, [class], [id]').forEach(function(el) {
          if (isTarget(el)) el.style.setProperty('display', 'none', 'important');
        });
        collapseTopSpacing();
      }

      function start() {
        scan(document.documentElement);
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(m) {
            m.addedNodes.forEach(function(node) {
              scan(node);
            });
          });
        });
        observer.observe(document.documentElement || document.body, {
          childList: true,
          subtree: true,
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
    })();
  ''';

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.backgroundPrimary)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) async {
            if (mounted) setState(() => _isLoading = true);
            // Arm the observer before the SPA's JS bundle mounts the header.
            await _controller.runJavaScript(_hideSiteHeaderJs);
          },
          onPageFinished: (_) async {
            // Safety net in case onPageStarted ran before the document
            // existed on this platform.
            await _controller.runJavaScript(_hideSiteHeaderJs);
            if (mounted) setState(() => _isLoading = false);
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(widget.title),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(
                  AppColors.cinematicOrange,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
