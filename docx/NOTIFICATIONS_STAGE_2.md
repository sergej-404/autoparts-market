# AXION X — Stage 2: in-site notification preferences

## What changed

- Added `NotificationPreference` (site/orders/messages) with defaults enabled.
- Added authenticated `GET/PATCH /api/profile/notifications`.
- Loaded preferences from PostgreSQL on `/profile/settings`; switches save immediately and roll back on API failure.
- Removed the old browser-only notification preference keys and the obsolete explanatory text.
- Applied preferences to system/admin notices, order lifecycle events, chat messages, and order-thread messages.
- The unread chat/message badge is hidden when message notifications are disabled; message read state is not changed.
- Existing notifications remain in the notification center; disabling a preference affects new notifications only.

## Database deployment

Run from the project root after configuring `DATABASE_URL`:

```bash
npx prisma migrate deploy
npx prisma generate
```

Then run the project checks:

```bash
npm run type-check
npm run lint
npm run build
```

## Scope

Notifications are delivered to the existing in-site `/notifications` center. This change does not add email, SMS, or browser push delivery.
