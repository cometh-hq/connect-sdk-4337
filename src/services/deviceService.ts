import Bowser from 'bowser'

import { DeviceData } from '../wallet/types'

const getDeviceData = (): DeviceData => {
  const result = Bowser.getParser(window.navigator.userAgent) as any

  const browser = result.parsedResult.browser.name
  const os = result.parsedResult.os.name
  const platform = result.parsedResult.platform.type

  return { browser, os, platform }
}

export default {
  getDeviceData
}
