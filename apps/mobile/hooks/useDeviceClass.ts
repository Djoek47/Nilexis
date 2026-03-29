import { useEffect, useState } from "react";
import { Dimensions, ScaledSize } from "react-native";

export type DeviceClass = "phone" | "tablet";

function classify(d: ScaledSize): DeviceClass {
  const short = Math.min(d.width, d.height);
  const long = Math.max(d.width, d.height);
  if (short >= 600 || long >= 900) return "tablet";
  return "phone";
}

/**
 * Phone vs tablet / foldable opened wide — drives management vs photo-first layouts.
 */
export function useDeviceClass(): DeviceClass {
  const [cls, setCls] = useState<DeviceClass>(() =>
    classify(Dimensions.get("window"))
  );

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setCls(classify(window));
    });
    return () => sub.remove();
  }, []);

  return cls;
}
