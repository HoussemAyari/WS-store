export type NotificationEvent =
  | { type: "nouvelle_commande"; titre: string; detail: string }
  | { type: "nouveau_message"; titre: string; detail: string }
  | { type: "nouvel_article"; titre: string; detail: string }
  | { type: "changement_statut"; titre: string; detail: string };

export interface NotificationChannel {
  envoyer(event: NotificationEvent): Promise<void>;
}

export class EmailNotificationChannel implements NotificationChannel {
  async envoyer(event: NotificationEvent): Promise<void> {
    if (!process.env.NOTIFICATION_FROM || !process.env.NOTIFICATION_TO_ADMIN) return;
    console.log("[notification.email]", event.type, event.titre, event.detail);
  }
}

export function createNotificationChannel(): NotificationChannel {
  if (process.env.NOTIFICATION_CHANNEL === "email") return new EmailNotificationChannel();
  return new EmailNotificationChannel();
}
