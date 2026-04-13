const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    // Declare the custom protocol so macOS knows this app handles mtd-app:// URLs.
    // Without this in Info.plist, setAsDefaultProtocolClient() silently fails and
    // macOS never routes the OAuth redirect here.
    extendInfo: {
      CFBundleURLTypes: [{
        CFBundleURLSchemes: ['mtd-app'],
        CFBundleURLName: 'com.electron.duncs-mtd-app',
        CFBundleTypeRole: 'Viewer',
      }],
    },
    // Ad-hoc signing (identity: '-') gives the app a unique code identity so
    // macOS allows safeStorage / Keychain access without a paid Developer ID.
    osxSign: {
      identity: '-',
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
