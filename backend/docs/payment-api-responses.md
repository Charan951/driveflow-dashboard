# Payment API Responses

## Create Order Response

### Success (201)
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "order_NJsXi8aqocvn6j",
    "amount": 50000,
    "currency": "INR",
    "paymentId": "64f8b2c3e4b0a1b2c3d4e5f6",
    "key": "rzp_test_RQ739na1YxOpy5",
    "tempBookingData": {
      "user": "64f8b2c3e4b0a1b2c3d4e5f7",
      "vehicleId": "64f8b2c3e4b0a1b2c3d4e5f8",
      "serviceIds": ["64f8b2c3e4b0a1b2c3d4e5f9"],
      "date": "2024-03-21T10:00:00.000Z",
      "totalAmount": 500,
      "requiresPaymentService": true
    },
    "isTemporaryBooking": true
  }
}
```

### Error (400)
```json
{
  "success": false,
  "message": "Booking not found",
  "code": "BOOKING_NOT_FOUND"
}
```

## Verify Payment Response

### Success (200)
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "payment": {
      "_id": "64f8b2c3e4b0a1b2c3d4e5f6",
      "userId": "64f8b2c3e4b0a1b2c3d4e5f7",
      "bookingId": "64f8b2c3e4b0a1b2c3d4e5f8",
      "orderId": "order_temp_1234567890_abc123def",
      "amount": 500,
      "currency": "INR",
      "status": "paid",
      "razorpayOrderId": "order_NJsXi8aqocvn6j",
      "razorpayPaymentId": "pay_NJsXi8aqocvn6k",
      "razorpaySignature": "signature_hash_here",
      "createdAt": "2024-03-20T10:00:00.000Z",
      "updatedAt": "2024-03-20T10:05:00.000Z"
    },
    "booking": {
      "_id": "64f8b2c3e4b0a1b2c3d4e5f8",
      "orderNumber": 1001,
      "user": "64f8b2c3e4b0a1b2c3d4e5f7",
      "paymentStatus": "paid",
      "paymentId": "pay_NJsXi8aqocvn6k",
      "totalAmount": 500,
      "platformFee": 50,
      "merchantEarnings": 450
    },
    "paymentId": "pay_NJsXi8aqocvn6k",
    "status": "paid"
  }
}
```

### Error (400)
```json
{
  "success": false,
  "message": "Invalid payment signature",
  "code": "INVALID_SIGNATURE"
}
```

## Payment Status Response

### Success (200)
```json
{
  "success": true,
  "data": {
    "_id": "64f8b2c3e4b0a1b2c3d4e5f6",
    "userId": {
      "_id": "64f8b2c3e4b0a1b2c3d4e5f7",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210"
    },
    "bookingId": {
      "_id": "64f8b2c3e4b0a1b2c3d4e5f8",
      "orderNumber": 1001,
      "services": ["Car Wash"],
      "totalAmount": 500
    },
    "orderId": "order_temp_1234567890_abc123def",
    "paymentId": "pay_NJsXi8aqocvn6k",
    "amount": 500,
    "currency": "INR",
    "status": "paid",
    "razorpayOrderId": "order_NJsXi8aqocvn6j",
    "razorpayPaymentId": "pay_NJsXi8aqocvn6k",
    "razorpaySignature": "signature_hash_here",
    "createdAt": "2024-03-20T10:00:00.000Z",
    "updatedAt": "2024-03-20T10:05:00.000Z"
  }
}
```

## Payment History Response

### Success (200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8b2c3e4b0a1b2c3d4e5f6",
      "userId": "64f8b2c3e4b0a1b2c3d4e5f7",
      "bookingId": "64f8b2c3e4b0a1b2c3d4e5f8",
      "orderId": "order_temp_1234567890_abc123def",
      "amount": 500,
      "currency": "INR",
      "status": "paid",
      "razorpayPaymentId": "pay_NJsXi8aqocvn6k",
      "createdAt": "2024-03-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

## All Payments (Admin) Response

### Success (200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8b2c3e4b0a1b2c3d4e5f6",
      "userId": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919876543210"
      },
      "bookingId": "64f8b2c3e4b0a1b2c3d4e5f8",
      "amount": 500,
      "status": "paid",
      "razorpayPaymentId": "pay_NJsXi8aqocvn6k",
      "createdAt": "2024-03-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  },
  "stats": {
    "totalAmount": 50000,
    "totalPaid": 45000,
    "totalRefunded": 1000,
    "count": 100
  }
}
```

## Webhook Response

### Success (200)
```json
{
  "success": true
}
```

### Error (400)
```json
{
  "success": false,
  "message": "Invalid webhook signature",
  "code": "INVALID_WEBHOOK_SIGNATURE"
}
```

## Refund Response

### Success (200)
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refund": {
      "id": "rfnd_NJsXi8aqocvn6l",
      "amount": 50000,
      "currency": "INR",
      "payment_id": "pay_NJsXi8aqocvn6k",
      "status": "processed",
      "created_at": 1679472000
    },
    "payment": {
      "_id": "64f8b2c3e4b0a1b2c3d4e5f6",
      "status": "refunded",
      "refundId": "rfnd_NJsXi8aqocvn6l",
      "refundAmount": 500
    }
  }
}
```

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

## Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `BOOKING_NOT_FOUND`: Booking not found
- `PAYMENT_NOT_FOUND`: Payment record not found
- `INVALID_SIGNATURE`: Payment signature verification failed
- `PAYMENT_ALREADY_COMPLETED`: Payment already processed
- `UNAUTHORIZED`: User not authorized for this action
- `RAZORPAY_ERROR`: Razorpay gateway error
- `INVALID_WEBHOOK_SIGNATURE`: Webhook signature verification failed
- `SERVER_ERROR`: Internal server error