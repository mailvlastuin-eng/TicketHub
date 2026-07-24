export interface ParsedAgent {
  os: string;
  browser: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
}

export function parseUserAgent(ua: string): ParsedAgent {
  const lowercaseUa = ua.toLowerCase();
  
  // 1. Determine Device Type
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown' = 'Desktop';
  if (lowercaseUa.includes('ipad') || (lowercaseUa.includes('android') && !lowercaseUa.includes('mobile'))) {
    deviceType = 'Tablet';
  } else if (lowercaseUa.includes('mobile') || lowercaseUa.includes('iphone') || lowercaseUa.includes('ipod')) {
    deviceType = 'Mobile';
  }

  // 2. Determine OS
  let os = 'Unknown OS';
  if (lowercaseUa.includes('windows')) {
    os = 'Windows';
  } else if (lowercaseUa.includes('macintosh') || lowercaseUa.includes('mac os x')) {
    os = 'macOS';
  } else if (lowercaseUa.includes('iphone') || lowercaseUa.includes('ipad') || lowercaseUa.includes('ipod')) {
    os = 'iOS';
  } else if (lowercaseUa.includes('android')) {
    os = 'Android';
  } else if (lowercaseUa.includes('linux')) {
    os = 'Linux';
  }

  // 3. Determine Browser
  let browser = 'Unknown Browser';
  if (lowercaseUa.includes('edg/')) {
    browser = 'Edge';
  } else if (lowercaseUa.includes('opr/') || lowercaseUa.includes('opera')) {
    browser = 'Opera';
  } else if (lowercaseUa.includes('chrome') || lowercaseUa.includes('crios')) {
    // Chrome on iOS uses "CriOS"
    browser = 'Chrome';
  } else if (lowercaseUa.includes('firefox') || lowercaseUa.includes('fxios')) {
    // Firefox on iOS uses "FxAn" or "FxIOS"
    browser = 'Firefox';
  } else if (lowercaseUa.includes('safari') && !lowercaseUa.includes('chrome') && !lowercaseUa.includes('chromium')) {
    browser = 'Safari';
  }

  return { os, browser, deviceType };
}

export function getDeviceString(ua: string): string {
  if (!ua) return 'Unknown Device';
  const { os, browser, deviceType } = parseUserAgent(ua);
  if (os === 'Unknown OS' && browser === 'Unknown Browser') {
    return 'Unknown Device';
  }
  return `${browser} on ${os} (${deviceType})`;
}
