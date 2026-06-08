"use client";

import { useEffect, useState } from "react";
import { requestPushPermission } from "../utils/firebase";

export default function PushNotificationManager() {
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    console.log("Demande de token en cours...");

    try {
      const pushToken = await requestPushPermission();
      if (pushToken) {
        console.log("Token FCM reçu :", pushToken);
        setToken(pushToken);
      } else {
        console.log("Aucun token FCM reçu.");
      }
    } catch (error) {
      console.error("Erreur lors de la génération :", error);
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleRequestPermission}
        disabled={isRequesting}
        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)] text-white font-bold py-3 px-6 rounded-lg w-full mt-4"
      >
        {isRequesting ? "Activation en cours..." : "Générer le Token de Test"}
      </button>

      {token && (
        <textarea
          readOnly
          value={token}
          className="w-full mt-4 p-2 text-xs bg-zinc-900 text-green-400 border border-zinc-700 rounded h-24 break-all"
        />
      )}
    </div>
  );
}
