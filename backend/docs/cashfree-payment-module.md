## Cashfree Payment Module (Production Setup)

### Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/carzzi
FRONTEND_URL=http://localhost:8080

CASHFREE_ENV=sandbox
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
PAYMENT_MAX_RETRY_COUNT=3
```

### APIs

- `POST /api/payments/create-order` - Create order and Cashfree payment session
- `POST /api/payments/verify` - Verify payment from order ID
- `GET /api/payments/status/:id` - Fetch payment status
- `POST /api/payments/retry` - Retry failed/pending payment
- `POST /api/payments/refund` - Refund paid payment (admin)
- `GET /api/payments/history` - User payment history
- `GET /api/payments/orders` - User order tracking
- `GET /api/payments/all` - Admin payment monitoring
- `POST /api/payments/webhook` - Cashfree webhook receiver

### Webhook Headers

- `x-webhook-signature`
- `x-webhook-timestamp`
- content-type: `application/json`

### Supported Status Handling

- `SUCCESS` -> `paid`
- `FAILED` -> `failed`
- `PENDING` -> `pending`
- `USER_DROPPED` -> `user_dropped`
- expired (local) -> `expired`

### Deployment Notes

- Keep `CASHFREE_ENV=production` for live mode.
- Configure HTTPS at load balancer / reverse proxy.
- Keep webhook endpoint publicly reachable and IP-restricted if possible.
- Persist logs from `backend/logs/` for webhook/payment audits.

### Testing

- Use Cashfree sandbox credentials.
- Simulate user dropped/failed payment in Cashfree test instruments.
- Call `POST /api/payments/verify` after checkout close/return for final sync.
