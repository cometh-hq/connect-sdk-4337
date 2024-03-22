import * as Bowser from "bowser";

import type { DeviceData } from "../types";

export const getDeviceData = (): DeviceData => {
  const result: any = Bowser.getParser(window.navigator.userAgent);

  const browser = result.parsedResult.browser.name;
  const os = result.parsedResult.os.name;
  const platform = result.parsedResult.platform.type;

  return { browser, os, platform };
};
