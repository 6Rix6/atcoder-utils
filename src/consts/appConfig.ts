export const APP_CONFIG = {
  appName: "atcoder-utils",
  appDisplayName: "AtCoder Utils",
} as const;

export const COMMANDS = {
  run: `${APP_CONFIG.appName}.run`,
  runMultiple: `${APP_CONFIG.appName}.runMultiple`,
  runAtCoderProblem: `${APP_CONFIG.appName}.runAtCoderProblem`,
  runAtCoderContest: `${APP_CONFIG.appName}.runAtCoderContest`,
  setCookie: `${APP_CONFIG.appName}.setCookie`,
  refreshContest: `${APP_CONFIG.appName}.refreshContest`,
  openContest: `${APP_CONFIG.appName}.openContest`,
} as const;

export const SETTINGS = {
  atCoderLanguage: "atCoderLanguage",
};
