import { useEffect } from 'react';

export const useNotificationsWithOneSignal = (userId?: string) => {
  useEffect(() => {
    console.log("Ancien système de notification OneSignal bypassé.");
  }, [userId]);

  return { unreadCount: 0 };
};
