/**
 * Extends app.json: inject EAS project id for Expo Push (optional via .env).
 * @param {import('expo/config').ExpoConfig} config — merged contents of app.json
 */
module.exports = ({ config }) => {
  const extra = config.extra ?? {};
  const eas = extra.eas ?? {};
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || eas.projectId;

  return {
    ...config,
    extra: {
      ...extra,
      eas: {
        ...eas,
        ...(projectId ? { projectId } : {}),
      },
    },
  };
};
