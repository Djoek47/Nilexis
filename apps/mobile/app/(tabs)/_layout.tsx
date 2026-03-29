import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { usePushRegistration } from "@/hooks/usePushRegistration";

export default function TabsLayout() {
  const { session, loading } = useAuth();
  usePushRegistration(session?.access_token);

  if (!loading && !session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#1a5c2e" }}>
      <Tabs.Screen name="index" options={{ title: "Plants" }} />
      <Tabs.Screen name="stations" options={{ title: "Stations" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
    </Tabs>
  );
}
