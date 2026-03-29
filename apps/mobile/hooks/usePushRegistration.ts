import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { registerPushToken } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushRegistration(accessToken: string | null | undefined) {
  const registered = useRef(false);

  useEffect(() => {
    if (!accessToken || registered.current) return;
    if (!Device.isDevice) return;

    let cancelled = false;

    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== "granted" || cancelled) return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

      const tokenRes = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const token = tokenRes.data;
      if (!token || cancelled) return;

      try {
        await registerPushToken(accessToken, token, Device.osName ?? undefined);
        registered.current = true;
      } catch (e) {
        console.warn("Push register failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);
}
