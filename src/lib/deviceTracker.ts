/**
 * Device & Session Tracking Utility
 * Detects device hardware profile, browser, OS, and session activity for Super Admin Remote Control.
 */

import { DeviceSessionInfo } from '../types';

export function getDeviceDetails(): DeviceSessionInfo {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'Desktop',
      browser: 'Unknown',
      os: 'Unknown',
      lastActive: new Date().toISOString(),
      sessionToken: 'srv-session',
      isOnline: true
    };
  }

  const ua = navigator.userAgent;
  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';

  if (/iPad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(ua)) {
    deviceType = 'Mobile';
  }

  // Detect OS
  let os = 'Unknown OS';
  if (/Win/i.test(ua)) os = 'Windows PC';
  else if (/Mac/i.test(ua) && !/iPhone|iPad/i.test(ua)) os = 'macOS';
  else if (/iPhone/i.test(ua)) os = 'iOS (iPhone)';
  else if (/iPad/i.test(ua)) os = 'iPadOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Detect Browser
  let browser = 'Unknown Browser';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  // Session Token
  let sessionToken = localStorage.getItem('hotel_session_token');
  if (!sessionToken) {
    sessionToken = `SES-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('hotel_session_token', sessionToken);
  }

  const screenRes = `${window.screen.width}x${window.screen.height}`;

  return {
    deviceType,
    browser,
    os,
    lastActive: new Date().toISOString(),
    sessionToken,
    isOnline: navigator.onLine,
    screenResolution: screenRes
  };
}
