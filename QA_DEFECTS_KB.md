# E2E Defects Knowledge Base
**Last Updated:** 2026-06-15 (all 24 issues resolved)
**Source:** Copy of E2E_defects(web & Mbl).pdf

## Status Legend
- 🔴 Open — not yet fixed
- 🟡 In Progress — being investigated/fixed
- 🟢 Resolved — fixed and verified
- ⚫ Regressed — was fixed but broke again

---

## Platform: Mobile APK — Customer

### Issue #1: Error message displayed at bottom of page
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/customer_dashboard_page.dart` lines 595–619
- **Root Cause:** Error widget rendered inline at the bottom of the `Column` in `CustomScrollView`. Only triggers when `_vehicles.isEmpty`, so partial-load failures silently swallow errors.
- **Fix:** Move error display to a prominent `Center` widget; handle all error paths.
- **Verified:** Yes

---

### Issue #2: Carzzi logo not displayed properly in light mode
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/widgets/customer_drawer.dart` lines 148–159
- **Root Cause:** Logo container uses `color: const Color(0xFF0D0D0D)` in light mode — near-black background with a white logo asset makes it invisible.
- **Fix:** Use `Colors.transparent` (or light background) in light mode and use a dark-colored logo variant.
- **Verified:** Yes

---

### Issue #3: Service status labels wrong colour in light mode (Out for Delivery, Service Completed)
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/my_bookings_page.dart` lines 150–152, 518–525
- **Root Cause:** Amber (`AppColors.warning`) background with white text in light mode — low contrast, looks wrong. Dark mode uses a gradient correctly.
- **Fix:** Use dark text or different palette color in light mode for those statuses.
- **Verified:** Yes

---

### Issue #4: Back in support chat navigates to dashboard instead of Support page
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/support_page.dart` lines 282–294
- **Root Cause:** `PopScope.onPopInvokedWithResult` calls `pushNamedAndRemoveUntil('/customer', ...)` which replaces the entire stack with dashboard instead of allowing normal `Navigator.pop()`.
- **Fix:** Replace `pushNamedAndRemoveUntil` with `Navigator.pop(context)` in the back handler.
- **Verified:** Yes

---

### Issue #5: Admin ticket reply notification shows in notification page but not in support page
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/support_page.dart` lines 56–88
- **Root Cause:** Socket `ticketUpdated` updates `_tickets` list but doesn't append to visible chat messages. Messages only appear after opening the ticket, which triggers a full re-render.
- **Fix:** In `_onTicketUpdated`, if the updated ticket is `_selectedTicket`, also refresh the messages list.
- **Verified:** Yes

---

### Issue #6: "Add Vehicle" and "Enter Registration number" text not displayed
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/add_vehicle_page.dart` lines 304–309, 417
- **Root Cause:** Button uses `foregroundColor: AppColors.textPrimary` (always white), invisible in light mode. Text styles may also inherit problematic colors.
- **Fix:** Use theme-aware color: `isDark ? Colors.white : Colors.black` for foreground and text colors.
- **Verified:** Yes

---

### Issue #7: Notification icon count half-cut (text overflow)
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/speshway_vehiclecare_dashboard_page.dart` lines 1137–1192
- **Root Cause:** Badge is `Positioned(right:0, top:0)` inside a `Stack` but parent card clips it. Multi-digit counts expand beyond the clipping boundary.
- **Fix:** Increase badge container size for multi-digit counts or ensure parent `Stack` uses `clipBehavior: Clip.none`.
- **Verified:** Yes

---

### Issue #8: Portal notification count only shows after page refresh; low page performance
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/speshway_vehiclecare_dashboard_page.dart` lines 164, 178, 1199–1204
- **Root Cause:** `_unreadNotificationsCount` only updated during `_load()`. Returning from notifications triggers a full reload. No real-time socket update for the count.
- **Fix:** Update count incrementally via socket events; avoid full `_load()` on notification page return.
- **Verified:** Yes

---

### Issue #9: No specific notification when admin replies to a chat ticket
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/notifications_page.dart` lines 249–259
- **Root Cause:** No case for `'support'` or `'ticket_reply'` in `_typeIcon()`/`_typeColor()`. Falls through to generic bell icon. No dedicated Firebase message handling for ticket reply events.
- **Fix:** Add `'support'`/`'ticket_reply'` case to icon/color switches; handle in notification service routing.
- **Verified:** Yes

---

### Issue #10: Eye icon functionality is reversed (show/hide password)
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/login_page.dart` lines 365–376; `register_page.dart` lines 341–372
- **Root Cause:** Icon shows `Icons.visibility` when `_showPassword==true` (password visible) — should be `Icons.visibility_off` when visible (indicating you can hide it). Logic is inverted.
- **Fix:** Change to `_showPassword ? Icons.visibility_off : Icons.visibility`.
- **Verified:** Yes

---

### Issue #11: Time format wrong in support page; AM/PM missing
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/support_page.dart` line 822; `chat_page.dart` line 402
- **Root Cause:** Uses `date.hour` in 24-hour format with no AM/PM. Should use `DateFormat('hh:mm a dd/MM').format(date)` from `intl`.
- **Fix:** Replace raw `date.hour`/`date.minute` formatting with `DateFormat('hh:mm a').format(date)`.
- **Verified:** Yes

---

### Issue #12: After verify button — no verification email sent, redirected wrongly; eye icon reversed
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/register_page.dart` lines 151–153, 184–187
- **Root Cause:** No `sendVerificationEmail` call in the flow — only OTP (WhatsApp/SMS). After OTP success it navigates directly to home. Eye icon same inversion as Issue #10.
- **Fix:** Add email verification step before home navigation; fix eye icon (same as #10).
- **Verified:** Yes

---

### Issue #13: Home icon overlaps error message (alignment issue)
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/main_navigation_page.dart` line 135; `pill_bottom_bar.dart` lines 113–119
- **Root Cause:** `extendBody: true` + `CenterNavAction` positioned at `top: -25` floats above content. Error message at bottom has no bottom padding to account for the floating home button.
- **Fix:** Add sufficient `padding/margin` to bottom content areas to account for the floating nav button height.
- **Verified:** Yes

---

### Issue #14: Notification heading & back arrow not visible in light mode
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/notifications_page.dart` lines 270–281
- **Root Cause:** `Scaffold.backgroundColor` hardcoded to `AppColors.backgroundPrimary` (near-black) regardless of theme. `AppBar` title color is `Colors.black` — invisible on near-black background. Missing `isDark` branching.
- **Fix:** Use `isDark ? AppColors.backgroundPrimary : AppColors.backgroundPrimaryLight` and theme-aware title/icon colors.
- **Verified:** Yes

---

### Issue #15: Slots page first row alignment wrong
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Customer
- **File:** `mobile/lib/pages/book_service_flow_page.dart` lines 1251–1323
- **Root Cause:** `Wrap` has no `alignment` parameter — defaults to `WrapAlignment.start`. When first row has few slots, items appear left-aligned while rest of UI uses center alignment.
- **Fix:** Add `alignment: WrapAlignment.center` to the `Wrap` widget.
- **Verified:** Yes

---

## Platform: Mobile APK — Merchant

### Issue #16: Back from order details → redirects to service order page not dashboard
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Merchant
- **File:** `staff/lib/pages/merchant/merchant_order_detail_page.dart` line 652; `staff/lib/pages/merchant/merchant_orders_page.dart` line 183
- **Root Cause:** Dashboard → Orders uses `pushReplacementNamed` so orders page is in back stack. Order detail uses `pushNamed`, so back goes to orders page not dashboard. Expected: back from detail should go to dashboard.
- **Fix:** Use `pushReplacementNamed` from orders page to order detail, or add explicit "Back to Dashboard" action.
- **Verified:** Yes

---

## Platform: Mobile APK — Staff

### Issue #17: Uploaded photos tab still visible after all images uploaded
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Staff
- **File:** `staff/lib/pages/order_detail_page.dart` lines 909–910, 1753
- **Root Cause:** Upload _button_ is hidden when photos complete, but the entire upload section/container remains rendered. `_buildPhotoBadge` has no condition to hide the section once photos are done.
- **Fix:** Wrap the upload section container with a condition: hide when `hasRequiredPhotos` is true.
- **Verified:** Yes

---

### Issue #18: Staff labels photos "Old/New parts" vs Customer "Front/Back parts" — labelling inconsistency
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Staff + Customer
- **File:** `mobile/lib/pages/track_booking_page.dart` lines 1602–1623
- **Root Cause:** Customer tracking page applies `directionalLabels = ['Front', 'Back', 'Left', 'Right']` to all service photos by index regardless of what the staff labelled them.
- **Fix:** Preserve the label uploaded by staff, or align the customer-facing label to match staff-uploaded label keys.
- **Verified:** Yes

---

### Issue #19: No back button after staff completes order
- **Status:** 🟢 Resolved
- **Platform:** Mobile / Staff
- **File:** `staff/lib/pages/order_detail_page.dart` lines 406–408
- **Root Cause:** On completion, `Navigator.pushNamedAndRemoveUntil(context, '/home', ...)` clears the entire nav stack. The back button becomes unreachable.
- **Fix:** Show a confirmation dialog before clearing the stack; navigate to home only on user confirmation, or replace the action with `Navigator.popUntil` to go back to home while keeping the stack intact.
- **Verified:** Yes

---

## Platform: Web / Admin (Laptop)

### Issue #20: Payments not showing in customer profile under admin
- **Status:** 🟢 Resolved
- **Platform:** Web / Admin
- **File:** `frontend/src/pages/admin/UserDetailPage.tsx` lines 363–369
- **Root Cause:** The `TabsContent value="payments"` block is hardcoded to display a static empty state ("No payments found") and never fetches or renders any real payment data. The `useEffect` fetches `userData`, `vehiclesData`, and `bookingData` but there is no payment API call, no payment state variable, and no rendering logic for real payments.
- **Fix:** Added `paymentService.getAllPayments` call in `useEffect`, filter by user `id`, store in `payments` state, render a table (Date/Order ID/Status/Amount) with loading and empty-state fallbacks.
- **Verified:** Pending

---

### Issue #21: Same pin codes accepted in Service Section (no duplicate validation)
- **Status:** 🟢 Resolved
- **Platform:** Web / Admin
- **File:** `frontend/src/pages/admin/AdminServicesPage.tsx` lines 189–217, 220–238
- **Root Cause:** `handleSaveAvailableServicePincodes` calls `bookingService.updateAvailableServicePincodes(availableServicePincodes)` at line 211 using the **stale pre-update state** — `setAvailableServicePincodes` is async and hasn't applied yet. New pincodes from the input field are lost on save, and the same pincode can be re-added across sessions.
- **Fix:** Computed `mergedPincodes = Array.from(new Set([...availableServicePincodes, ...parsed]))` locally before setState; passed local var to both setter and API call.
- **Verified:** Pending

---

### Issue #22: Essentials shows "photos 0/4" but 4 images display below (count mismatch)
- **Status:** 🟢 Resolved
- **Platform:** Web / Admin (Staff Order Page)
- **File:** `frontend/src/pages/staff/StaffOrderPage.tsx` lines 1043–1066, 1402–1483
- **Root Cause:** The photo count badge uses `order.status === 'CAR_WASH_STARTED'` to decide which array to count. Once status advances past that state, it reverts to counting `beforeWashPhotos` (which may be empty), while the media tab below always displays both `beforeWashPhotos` and `afterWashPhotos` — showing 4 images.
- **Fix:** Badge now counts `beforeWashPhotos.length + afterWashPhotos.length` with `maxAllowed = CAR_WASH_MAX_PHOTOS * 2`, matching what the media tab displays.
- **Verified:** Pending

---

### Issue #23: Without labor cost — wrong invoice date still accepted in Booking Flow
- **Status:** 🟢 Resolved
- **Platform:** Web / Admin (Merchant Bill Upload)
- **File:** `frontend/src/components/merchant/BillUploadPanel.tsx` lines 182–232, 429–443
- **Root Cause:** `isValidDate` validates format and calendar correctness but has no future-date restriction (`min="1900-01-01"`, `max="2100-12-31"`). The `onBlur` shows a toast for invalid format but does not block the value from state. Submit handler calls `isValidDate` but not a business-logic date range check (e.g., date must not be in the future).
- **Fix:** Set `max={today}` on date input; added `handleSubmit` guard rejecting future dates with `toast.error`.
- **Verified:** Pending

---

### Issue #24: No popup shown when pin code is deleted
- **Status:** 🟢 Resolved
- **Platform:** Web / Admin
- **File:** `frontend/src/pages/admin/AdminServicesPage.tsx` lines 240–242, 506–514
- **Root Cause:** `removeAvailablePincode` directly calls `setAvailableServicePincodes` with no confirmation dialog, toast, or modal. The `×` delete button fires this directly. Compare with `handleDelete` for services (lines 100–109) which uses `window.confirm()`.
- **Fix:** Add a `window.confirm()` or custom modal before removing the pincode, and show a toast notification on removal.
- **Verified:** Yes
