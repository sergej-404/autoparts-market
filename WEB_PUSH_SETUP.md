# AXION X — Web Push setup

Web Push sends browser/OS notifications even when the AXION X tab is closed. It requires HTTPS in production (localhost is allowed for development), a registered service worker, browser permission, and VAPID keys.

## 1. Generate VAPID keys

Run once from the project root:

```bash
npm run push:keys
```

Copy the three generated values into the deployment environment and local `.env.local`:

```env
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:real-admin-contact@example.com"
```

Use a real monitored contact address for `VAPID_SUBJECT`. Keep `VAPID_PRIVATE_KEY` secret; never commit it to Git or expose it to the browser. The public key is intentionally returned by `/api/push/vapid-public-key`.

Keep the same VAPID key pair across deployments. Replacing the pair invalidates existing browser subscriptions; users would need to subscribe again.

## 2. Apply the database migration

```bash
npx prisma migrate deploy
npx prisma generate
```

This adds `push_subscription`, which stores one subscription per browser/device endpoint. Existing users and notifications are not modified.

## 3. Deploy over HTTPS

The root service worker is `public/sw.js`; the PWA manifest is `public/manifest.webmanifest`. Deploy both with the app. The browser registers the service worker when a signed-in user enables Push in `/profile/settings`.

## 4. User activation

Each browser/device must opt in separately. In `/profile/settings`, click **Включить на устройстве** and grant the browser permission. The three existing notification category switches continue to control whether Push is sent for site, order, and message events.

On iPhone/iPad, Web Push is supported from iOS/iPadOS 16.4 for a web app added to the Home Screen and launched from there. Other browsers/platforms must support the Push API and Service Workers.

## 5. Delivery behavior

- Admin site broadcasts use the `site` preference.
- Order creation, status changes, and cancellation use `orders`.
- Chat and order-thread messages use `messages`.
- Push is dispatched only after the corresponding in-site notification has been committed.
- Push failures are logged and do not roll back orders or messages. Expired subscriptions (HTTP 404/410) are removed automatically.
- The notification click opens `/notifications`.

Push delivery is best-effort synchronous from the event API. If a deployment platform terminates requests aggressively or you need durable retries for temporary push-service outages, add a persistent outbox and scheduled worker as a separate reliability enhancement.
