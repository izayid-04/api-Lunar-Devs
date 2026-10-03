export function parseUserAgent(ua: string | undefined | null): string {
  if (!ua || typeof ua !== 'string') {
    return 'Appareil inconnu';
  }

  const uaLower = ua.toLowerCase();

  // Détection du système d'exploitation
  let os = 'Système inconnu';
  if (uaLower.includes('iphone')) {
    os = 'iPhone';
  } else if (uaLower.includes('ipad')) {
    os = 'iPad';
  } else if (uaLower.includes('android')) {
    os = 'Android';
  } else if (uaLower.includes('windows')) {
    os = 'Windows';
  } else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
    os = 'Mac';
  } else if (uaLower.includes('linux')) {
    os = 'Linux';
  }

  // Détection du navigateur
  let browser = 'Navigateur';
  if (uaLower.includes('smoketestrunner')) {
    browser = 'SmokeTestRunner';
  } else if (uaLower.includes('edg/')) {
    browser = 'Edge';
  } else if (uaLower.includes('chrome/') || uaLower.includes('crios/')) {
    browser = 'Chrome';
  } else if (uaLower.includes('firefox/') || uaLower.includes('fxios/')) {
    browser = 'Firefox';
  } else if (uaLower.includes('safari/') && !uaLower.includes('chrome')) {
    browser = 'Safari';
  } else if (uaLower.includes('opera/') || uaLower.includes('opr/')) {
    browser = 'Opera';
  } else if (uaLower.includes('curl/')) {
    browser = 'Curl';
  } else if (uaLower.includes('postman')) {
    browser = 'Postman';
  } else if (ua.trim().length > 0 && !ua.includes('(') && !ua.includes('/')) {
    browser = ua.trim();
  }

  if (os === 'Système inconnu' && browser !== 'Navigateur') {
    return browser;
  }
  return `${browser} sur ${os}`;
}
