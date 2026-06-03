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
    try {
      const pushToken = await requestPushPermission();
      if (pushToken) {
        setToken(pushToken);
      }
    } catch (error) {
      console.error("Push permission request failed:", error);
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
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            d="M12 4.5c-2.485 0-4.5 2.015-4.5 4.5v3c0 .843-.337 1.653-.937 2.25L5 15.75h14l-1.563-1.5A3.005 3.005 0 0 1 16.5 12v-3c0-2.485-2.015-4.5-4.5-4.5Zm0 16.5c1.242 0 2.308-.675 2.84-1.688H9.16A3.49 3.49 0 0 0 12 21Z"
            fill="currentColor"
          />
        </svg>
        {isRequesting ? "Activation en cours..." : "Activer notifications"}
      </button>

      {token && (
        <code className="block break-all rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-400">
          {token}
        </code>
      )}
    </div>
  );
}
