# NGINX Hardening Runbook (Production)

This repository does not contain NGINX configuration. Apply these steps on the production host that terminates TLS for `www.carzzi.com` and `api.carzzi.com`.

## 1. Upgrade NGINX

```bash
sudo apt update
sudo apt install --only-upgrade nginx
nginx -v
```

Target: latest stable NGINX release supported by your OS.

## 2. Hide version banner

In `/etc/nginx/nginx.conf` (http block):

```nginx
server_tokens off;
```

Reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 3. Security headers (reverse proxy)

Add to the `server` block serving the application:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

## 4. TLS

- Enforce HTTPS redirects for all HTTP traffic.
- Use modern cipher suites (TLS 1.2+).
- Keep certificates renewed (Let's Encrypt / ACM).

## 5. SSH (host level)

- Set `Banner none` in `/etc/ssh/sshd_config` if banner disclosure is a concern.
- Disable weak MAC algorithms; prefer `hmac-sha256` and stronger ciphers.
- Restrict SSH access by IP where possible.

## 6. Verification

```bash
curl -I https://www.carzzi.com
```

Confirm:

- No `Server: nginx/x.y.z` version in response (or version hidden).
- HSTS and other security headers present.
- Wappalyzer / SSL scan shows updated NGINX after upgrade.

## 7. Patch cadence

- Subscribe to NGINX security advisories.
- Schedule monthly patch reviews for NGINX, OpenSSH, and OS packages.
