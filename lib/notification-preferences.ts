import type { NotificationType, Prisma } from "@prisma/client";

type NotificationChannel = "site" | "orders" | "messages";

type CreateNotificationInput = {
  channel: NotificationChannel;
  toUserId: string;
  type: NotificationType;
  title: string;
  text: string;
  fromUserId?: string | null;
  eventKey?: string;
};

/** Creates an in-site notification only when its recipient enabled that category. */
export async function createNotificationIfEnabled(
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput,
): Promise<boolean> {
  const preference = await tx.notificationPreference.findUnique({
    where: { userId: input.toUserId },
    select: { site: true, orders: true, messages: true },
  });

  // Users without a preference row retain the legacy default: all notifications enabled.
  if (preference && !preference[input.channel]) return false;

  const result = await tx.notification.createMany({
    data: [{
      type: input.type,
      fromUserId: input.fromUserId ?? null,
      toUserId: input.toUserId,
      title: input.title,
      text: input.text,
      eventKey: input.eventKey,
    }],
    skipDuplicates: true,
  });
  return result.count > 0;
}
