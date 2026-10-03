export function maskEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const firstChar = local.charAt(0) || '*';
  return `${firstChar}***@${domain}`;
}

export function maskIp(ip: string | undefined | null): string {
  if (!ip || typeof ip !== 'string') return '';
  const trimmed = ip.trim();
  // IPv4
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
  }
  // IPv6
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:*:*`;
    }
  }
  return ip;
}
