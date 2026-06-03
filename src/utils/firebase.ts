export async function requestPushPermission(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission === "granted") {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }

  // TODO: Remplacer cette valeur de retour par un jeton FCM réel via Firebase Messaging.
  return "FCM_TOKEN_PLACEHOLDER";
}
