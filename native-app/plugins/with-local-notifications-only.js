const { withEntitlementsPlist, withInfoPlist } = require("expo/config-plugins");

/**
 * expo-notifications adds the remote-push entitlement automatically. Nomadic
 * Paws only schedules reminders on the device, so keep the native module while
 * removing capabilities that would require an Apple Push-enabled profile.
 */
module.exports = function withLocalNotificationsOnly(config) {
  config = withEntitlementsPlist(config, (modConfig) => {
    delete modConfig.modResults["aps-environment"];
    return modConfig;
  });

  return withInfoPlist(config, (modConfig) => {
    const modes = modConfig.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      const localOnlyModes = modes.filter((mode) => mode !== "remote-notification");
      if (localOnlyModes.length > 0) {
        modConfig.modResults.UIBackgroundModes = localOnlyModes;
      } else {
        delete modConfig.modResults.UIBackgroundModes;
      }
    }
    return modConfig;
  });
};
