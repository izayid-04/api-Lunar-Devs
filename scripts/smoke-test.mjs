#!/usr/bin/env node

import process from 'node:process';

const baseUrl = process.argv[2] || process.env.API_URL || 'https://api.lunardevs.lescomores.webcup.hodi.cloud';
const agentEmail = process.env.DEMO_AGENT_EMAIL || 'agent.demo@novaterra.local';
const agentPassword = process.env.DEMO_AGENT_PASSWORD || 'AgentDemo123!';
const adminEmail = process.env.DEMO_ADMIN_EMAIL || 'admin.demo@novaterra.local';
const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'AdminDemo123!';
const citizenEmail = process.env.DEMO_CITIZEN_EMAIL || 'citoyen.demo@novaterra.local';
const citizenPassword = process.env.DEMO_CITIZEN_PASSWORD || 'CitizenDemo123!';

console.log(`\n======================================================`);
console.log(`🚀 SMOKE TESTS NOVA TERRA API`);
console.log(`🎯 Cible : ${baseUrl}`);
console.log(`======================================================\n`);

const results = [];

const FORBIDDEN_KEYS = ['password', 'passwordHash', 'hash', 'lockedUntil'];

function findForbiddenKeys(obj, path = '') {
  const leaks = [];
  if (!obj || typeof obj !== 'object') return leaks;
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_KEYS.includes(key)) {
      leaks.push(`${currentPath}`);
    }
    if (value && typeof value === 'object') {
      leaks.push(...findForbiddenKeys(value, currentPath));
    }
  }
  return leaks;
}

let lastRequestLeaks = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}, retries = 2) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'SmokeTestRunner/1.0 (Linux; x86_64)',
    ...(options.headers || {}),
  };
  await sleep(150); // Léger espacement pour respecter le serveur Apache/Passenger
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => null);
    }

    lastRequestLeaks = (data && typeof data === 'object') ? findForbiddenKeys(data) : [];

    return { status: res.status, data, headers: res.headers, securityLeaks: lastRequestLeaks };
  } catch (err) {
    if (retries > 0) {
      await sleep(1000);
      return request(path, options, retries - 1);
    }
    console.error(`[FETCH ERROR] ${options.method || 'GET'} ${path}: ${err.message}`);
    lastRequestLeaks = [];
    return { status: 0, error: err.message, securityLeaks: [] };
  }
}

function record(route, testCase, expected, actual, details = '') {
  let ok = expected === actual;
  let statusMessage = details;

  if (lastRequestLeaks && lastRequestLeaks.length > 0) {
    ok = false;
    statusMessage = `[FAILLE SÉCURITÉ] Fuite détectée : ${lastRequestLeaks.join(', ')}`;
  }

  results.push({
    route,
    testCase,
    expected,
    actual,
    status: ok ? 'OK' : 'ÉCHEC',
    details: statusMessage,
  });
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} [${ok ? 'OK' : 'FAIL'}] ${route} | ${testCase} -> Attendu: ${expected}, Reçu: ${actual}${statusMessage ? ` (${statusMessage})` : ''}`);
}

async function run() {
  // 1. Authentification des comptes de démo
  console.log(`🔑 Authentification des comptes de démonstration...`);
  
  const loginResAgent = await request('/auth/login', {
    method: 'POST',
    body: { email: agentEmail, password: agentPassword },
  });
  const agentToken = loginResAgent.data?.accessToken;

  const loginResAdmin = await request('/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });
  const adminToken = loginResAdmin.data?.accessToken;

  const loginResCitizen = await request('/auth/login', {
    method: 'POST',
    body: { email: citizenEmail, password: citizenPassword },
  });
  const citizenToken = loginResCitizen.data?.accessToken;

  const authH = (token) => ({ Authorization: `Bearer ${token}` });

  // 2. Tests de Santé
  console.log(`\n--- Santé ---`);
  const rHealth = await request('/health');
  record('GET /health', 'cas normal public', 200, rHealth.status);

  const rHealthDb = await request('/health/db');
  record('GET /health/db', 'cas normal public', 200, rHealthDb.status);

  // 3. Tests Auth & Profil
  console.log(`\n--- Authentification & Profil ---`);
  record('POST /auth/login', 'cas normal', 200, loginResCitizen.status);
  
  const randomEmail = `wrong-${Date.now()}@novaterra.local`;
  const rLoginBad = await request('/auth/login', {
    method: 'POST',
    body: { email: randomEmail, password: 'WrongPassword!' },
  });
  record('POST /auth/login', 'identifiants invalides (401)', 401, rLoginBad.status);

  const rMeNoAuth = await request('/me');
  record('GET /me', 'sans jeton (401)', 401, rMeNoAuth.status);

  const rMeCitizen = await request('/me', { headers: authH(citizenToken) });
  record('GET /me', 'citoyen connecté (200)', 200, rMeCitizen.status);

  const rPatchMe = await request('/me', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { preferredLanguage: 'fr', firstName: 'CitoyenModifie', lastName: 'DemoModifie' },
  });
  record('PATCH /me', 'mise à jour profil avec prénom et nom (200)', 200, rPatchMe.status);
  record('PATCH /me', 'nom bien pris en compte', 'DemoModifie', rPatchMe.data?.lastName);

  // Validation : non vide
  const rPatchMeEmpty = await request('/me', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { firstName: '' },
  });
  record('PATCH /me', 'prénom vide refusé (400)', 400, rPatchMeEmpty.status);

  // Remise en place du nom initial
  await request('/me', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { firstName: 'Citoyen', lastName: 'Demo' },
  });

  const rSecurityMine = await request('/me/security', { headers: authH(citizenToken) });
  record('GET /me/security', 'audit personnel (200)', 200, rSecurityMine.status);
  const hasDevicesField = Array.isArray(rSecurityMine.data?.devices);
  record('GET /me/security', 'appareils connus retournés (F54)', true, hasDevicesField);

  // Test F54 - Détection nouvel appareil vs appareil déjà connu
  const testDeviceEmail = `device.test.${Date.now()}@novaterra.local`;
  const rRegDevice = await request('/auth/register', {
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
    body: {
      email: testDeviceEmail,
      password: 'DeviceTest123!',
      firstName: 'Device',
      lastName: 'Tester',
    },
  });
  record('POST /auth/register', 'création compte test device', 201, rRegDevice.status);

  // Première connexion avec le même appareil -> aucun nouvel appareil, pas de notification de sécurité
  const rLoginSameDevice = await request('/auth/login', {
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
    body: { email: testDeviceEmail, password: 'DeviceTest123!' },
  });
  const deviceToken = rLoginSameDevice.data?.accessToken;
  const rNotifsSame = await request('/notifications', { headers: authH(deviceToken) });
  const hasSecurityAlertSame = Array.isArray(rNotifsSame.data) && rNotifsSame.data.some(n => n.type === 'security');
  record('POST /auth/login', 'appareil déjà connu -> pas de notification de sécurité (F54)', false, hasSecurityAlertSame);

  // Deuxième connexion depuis un NOUVEL appareil -> doit créer une notification de sécurité
  await request('/auth/login', {
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
    body: { email: testDeviceEmail, password: 'DeviceTest123!' },
  });
  const rNotifsNew = await request('/notifications', { headers: authH(deviceToken) });
  const hasSecurityAlertNew = Array.isArray(rNotifsNew.data) && rNotifsNew.data.some(n => n.type === 'security');
  record('POST /auth/login', 'nouvel appareil -> notification de sécurité créée (F54)', true, hasSecurityAlertNew);

  const rSecurityDeviceUser = await request('/me/security', { headers: authH(deviceToken) });
  const deviceCount = rSecurityDeviceUser.data?.devices?.length || 0;
  record('GET /me/security', 'deux appareils distincts enregistrés (F54)', true, deviceCount >= 2);

  const rSecurityMineNoAuth = await request('/me/security');
  record('GET /me/security', 'sans jeton (401)', 401, rSecurityMineNoAuth.status);

  // Tests PATCH /me/password (D03 / F37)
  const rPassNoAuth = await request('/me/password', {
    method: 'PATCH',
    body: { currentPassword: citizenPassword, newPassword: 'NewCitizen123!' },
  });
  record('PATCH /me/password', 'sans jeton (401)', 401, rPassNoAuth.status);

  const rPassWrongCurrent = await request('/me/password', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { currentPassword: 'WrongPassword999!', newPassword: 'NewCitizen123!' },
  });
  record('PATCH /me/password', 'mot de passe actuel faux (401)', 401, rPassWrongCurrent.status);

  const rPassTooWeak = await request('/me/password', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { currentPassword: citizenPassword, newPassword: 'faible' },
  });
  record('PATCH /me/password', 'nouveau trop faible (400)', 400, rPassTooWeak.status);

  const rPassIdentical = await request('/me/password', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { currentPassword: citizenPassword, newPassword: citizenPassword },
  });
  record('PATCH /me/password', 'nouveau identique à l ancien (400)', 400, rPassIdentical.status);

  const tempNewPassword = 'NewCitizen123!';
  const rPassSuccess = await request('/me/password', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { currentPassword: citizenPassword, newPassword: tempNewPassword },
  });
  record('PATCH /me/password', 'changement réussi (200)', 200, rPassSuccess.status);

  // Remise en place du mot de passe initial pour préserver l'état de démo
  const rPassReset = await request('/me/password', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { currentPassword: tempNewPassword, newPassword: citizenPassword },
  });
  record('PATCH /me/password', 'remise mot de passe initial (200)', 200, rPassReset.status);

  const rSecTargeted = await request('/agent/security/targeted-accounts', { headers: authH(agentToken) });
  record('GET /agent/security/targeted-accounts', 'agent connecté (200)', 200, rSecTargeted.status);

  const rSecTargetedCit = await request('/agent/security/targeted-accounts', { headers: authH(citizenToken) });
  record('GET /agent/security/targeted-accounts', 'mauvais rôle citoyen (403)', 403, rSecTargetedCit.status);

  // 4. Pings Rôles
  console.log(`\n--- Pings Rôles ---`);
  const rAgentPing = await request('/agent/ping', { headers: authH(agentToken) });
  record('GET /agent/ping', 'agent autorisé (200)', 200, rAgentPing.status);

  const rAgentPingCit = await request('/agent/ping', { headers: authH(citizenToken) });
  record('GET /agent/ping', 'citoyen refusé (403)', 403, rAgentPingCit.status);

  const rAdminPing = await request('/admin/ping', { headers: authH(adminToken) });
  record('GET /admin/ping', 'admin autorisé (200)', 200, rAdminPing.status);

  const rAdminPingAgent = await request('/admin/ping', { headers: authH(agentToken) });
  record('GET /admin/ping', 'agent refusé (403)', 403, rAdminPingAgent.status);

  // 5. Gestion des Citoyens (F34)
  console.log(`\n--- Gestion des Citoyens (F34) ---`);
  const rCitizens = await request('/agent/citizens', { headers: authH(agentToken) });
  record('GET /agent/citizens', 'agent autorisé (200)', 200, rCitizens.status);

  const rCitizensCit = await request('/agent/citizens', { headers: authH(citizenToken) });
  record('GET /agent/citizens', 'citoyen refusé (403)', 403, rCitizensCit.status);

  const rCitizenStatus404 = await request('/agent/citizens/999999/status', {
    method: 'PATCH',
    headers: authH(agentToken),
    body: { isActive: true },
  });
  record('PATCH /agent/citizens/:id/status', 'id inexistant (404)', 404, rCitizenStatus404.status);

  // 5b. Gestion des Comptes par l'Admin (D08, D09)
  console.log(`\n--- Gestion des Comptes par l'Admin (D08, D09) ---`);
  const rAdminUsersList = await request('/admin/users', { headers: authH(adminToken) });
  record('GET /admin/users', 'admin liste utilisateurs (200)', 200, rAdminUsersList.status);

  const rAdminUsersCit = await request('/admin/users', { headers: authH(citizenToken) });
  record('GET /admin/users', 'citoyen refusé (403)', 403, rAdminUsersCit.status);

  const testAgentEmail = `test.agent.${Date.now()}@novaterra.local`;
  const rAdminCreateAgent = await request('/admin/users', {
    method: 'POST',
    headers: authH(adminToken),
    body: {
      email: testAgentEmail,
      password: 'AgentCreated123!',
      firstName: '[TEST] Agent',
      lastName: 'Municipal',
      role: 'agent',
    },
  });
  record('POST /admin/users', 'admin création agent (201)', 201, rAdminCreateAgent.status);
  const createdAgentId = rAdminCreateAgent.data?.id;

  if (createdAgentId) {
    const rAdminPatchRole = await request(`/admin/users/${createdAgentId}/role`, {
      method: 'PATCH',
      headers: authH(adminToken),
      body: { role: 'citizen' },
    });
    record('PATCH /admin/users/:id/role', 'admin mise à jour rôle (200)', 200, rAdminPatchRole.status);

    const rAdminPatchStatus = await request(`/admin/users/${createdAgentId}/status`, {
      method: 'PATCH',
      headers: authH(adminToken),
      body: { isActive: false },
    });
    record('PATCH /admin/users/:id/status', 'admin désactivation compte (200)', 200, rAdminPatchStatus.status);
  }

  // 6. Services Municipaux
  console.log(`\n--- Services Municipaux ---`);
  const rServices = await request('/services');
  record('GET /services', 'public (200)', 200, rServices.status);

  const rServiceOne = await request('/services/mairie-de-nova-terra');
  record('GET /services/:slug', 'public existant (200)', 200, rServiceOne.status);

  const rService404 = await request('/services/service-inconnu-9999');
  record('GET /services/:slug', 'slug inexistant (404)', 404, rService404.status);

  const rServiceAvailCit = await request('/services/mairie-de-nova-terra/availability', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { availability: 'disponible' },
  });
  record('PATCH /services/:idOrSlug/availability', 'citoyen refusé (403)', 403, rServiceAvailCit.status);

  const rServiceAvailAgent = await request('/services/mairie-de-nova-terra/availability', {
    method: 'PATCH',
    headers: authH(agentToken),
    body: { availability: 'disponible' },
  });
  record('PATCH /services/:idOrSlug/availability', 'agent autorisé (200)', 200, rServiceAvailAgent.status);

  // 7. Messages et Signalements
  console.log(`\n--- Messages et Signalements ---`);
  const rPostMsg = await request('/messages', {
    method: 'POST',
    headers: authH(citizenToken),
    body: {
      type: 'signalement',
      subject: '[TEST] Test smoke test automated',
      body: 'Ceci est un test automatisé de bon fonctionnement du signalement.',
      category: 'voirie',
      district: 'Centre-Ville',
      preciseLocation: 'Place Centrale',
    },
  });
  record('POST /messages', 'citoyen création signalement (201)', 201, rPostMsg.status);
  const createdMsgId = rPostMsg.data?.id;

  const rPostMsgAgent = await request('/messages', {
    method: 'POST',
    headers: authH(agentToken),
    body: { subject: '[TEST] Interdit', body: 'Agent ne doit pas poster', category: 'autre' },
  });
  record('POST /messages', 'agent refusé (403)', 403, rPostMsgAgent.status);

  const rMsgPublicNoAuth = await request('/messages/public');
  record('GET /messages/public', 'sans jeton (401)', 401, rMsgPublicNoAuth.status);

  const rMsgPublic = await request('/messages/public', { headers: authH(citizenToken) });
  record('GET /messages/public', 'citoyen connecté (200)', 200, rMsgPublic.status);

  const rMsgPublicAgent = await request('/messages/public', { headers: authH(agentToken) });
  record('GET /messages/public', 'agent refusé (403)', 403, rMsgPublicAgent.status);

  const rMsgMine = await request('/messages/mine', { headers: authH(citizenToken) });
  record('GET /messages/mine', 'citoyen connecté (200)', 200, rMsgMine.status);

  if (createdMsgId) {
    const rMsgMineOne = await request(`/messages/mine/${createdMsgId}`, { headers: authH(citizenToken) });
    record('GET /messages/mine/:id', 'citoyen propriétaire (200)', 200, rMsgMineOne.status);

    // F52 : Interdiction de soutenir sa propre demande -> 400 attendu
    const rMsgSupportSelf = await request(`/messages/${createdMsgId}/support`, {
      method: 'POST',
      headers: authH(citizenToken),
    });
    record('POST /messages/:id/support', 'refus soutien propre demande (400)', 400, rMsgSupportSelf.status);
  }

  const rMsgMine404 = await request('/messages/mine/999999', { headers: authH(citizenToken) });
  record('GET /messages/mine/:id', 'id inexistant (404)', 404, rMsgMine404.status);

  const rAgentMsgs = await request('/agent/messages', { headers: authH(agentToken) });
  record('GET /agent/messages', 'agent liste (200)', 200, rAgentMsgs.status);

  const rAgentMsgsCit = await request('/agent/messages', { headers: authH(citizenToken) });
  record('GET /agent/messages', 'citoyen refusé (403)', 403, rAgentMsgsCit.status);

  if (createdMsgId) {
    const rUpdateStatus = await request(`/agent/messages/${createdMsgId}/status`, {
      method: 'PATCH',
      headers: authH(agentToken),
      body: { status: 'en_cours', note: '[TEST] Prise en charge smoke test' },
    });
    record('PATCH /agent/messages/:id/status', 'agent mise à jour (200)', 200, rUpdateStatus.status);
  }

  // 8. Dashboard Agent & Webcup
  console.log(`\n--- Dashboard Agent & Webcup ---`);
  const rDashboard = await request('/agent/dashboard', { headers: authH(agentToken) });
  record('GET /agent/dashboard', 'agent autorisé (200)', 200, rDashboard.status);

  const rDashboardCit = await request('/agent/dashboard', { headers: authH(citizenToken) });
  record('GET /agent/dashboard', 'citoyen refusé (403)', 403, rDashboardCit.status);

  const rWebcup = await request('/agent/webcup/requests', { headers: authH(agentToken) });
  const webcupOk = rWebcup.status === 200 || rWebcup.status === 503;
  record('GET /agent/webcup/requests', 'agent proxy (200 ou 503 sans crash)', true, webcupOk, `reçu: ${rWebcup.status}`);

  // 9. Rendez-vous Municipaux (F39, F40)
  console.log(`\n--- Rendez-vous Municipaux ---`);
  const rSlots = await request('/appointments/slots');
  record('GET /appointments/slots', 'public disponible (200)', 200, rSlots.status);

  const rApptMine = await request('/appointments/mine', { headers: authH(citizenToken) });
  record('GET /appointments/mine', 'citoyen connecté (200)', 200, rApptMine.status);

  const rAgentAppts = await request('/agent/appointments', { headers: authH(agentToken) });
  record('GET /agent/appointments', 'agent connecté (200)', 200, rAgentAppts.status);

  const rAgentApptsCit = await request('/agent/appointments', { headers: authH(citizenToken) });
  record('GET /agent/appointments', 'citoyen refusé (403)', 403, rAgentApptsCit.status);

  const rIcs404 = await request('/appointments/999999/ics', { headers: authH(citizenToken) });
  record('GET /appointments/:id/ics', 'rdv inexistant (404)', 404, rIcs404.status);

  // 10. Annonces Municipales
  console.log(`\n--- Annonces Municipales ---`);
  const rAnnouncements = await request('/announcements');
  record('GET /announcements', 'public (200)', 200, rAnnouncements.status);

  const rAnnounce404 = await request('/announcements/999999');
  record('GET /announcements/:id', 'id inexistant (404)', 404, rAnnounce404.status);

  const rPostAnnounce = await request('/announcements', {
    method: 'POST',
    headers: authH(adminToken),
    body: {
      title: '[TEST] Annonce Smoke Test',
      body: 'Ceci est une annonce temporaire générée par le test automatisé.',
      category: 'municipal',
      isImportant: false,
    },
  });
  record('POST /announcements', 'admin création (201)', 201, rPostAnnounce.status);
  const createdAnnounceId = rPostAnnounce.data?.id;

  if (createdAnnounceId) {
    const rDeleteAnnounce = await request(`/announcements/${createdAnnounceId}`, {
      method: 'DELETE',
      headers: authH(adminToken),
    });
    record('DELETE /announcements/:id', 'admin nettoyage (204)', 204, rDeleteAnnounce.status);
  }

  // 11. Alertes Municipales
  console.log(`\n--- Alertes Municipales ---`);
  const rAlertsActive = await request('/alerts/active');
  record('GET /alerts/active', 'public (200)', 200, rAlertsActive.status);

  const rAlerts = await request('/alerts');
  record('GET /alerts', 'public historique (200)', 200, rAlerts.status);

  const rPostAlert = await request('/alerts', {
    method: 'POST',
    headers: authH(agentToken),
    body: {
      title: '[TEST] Alerte Test Smoke',
      body: 'Test de création d alerte.',
      severity: 'info',
      target: 'all',
      startsAt: new Date().toISOString(),
    },
  });
  record('POST /alerts', 'agent création (201)', 201, rPostAlert.status);
  const createdAlertId = rPostAlert.data?.id;

  if (createdAlertId) {
    const rTermAlert = await request(`/alerts/${createdAlertId}/terminate`, {
      method: 'PATCH',
      headers: authH(agentToken),
    });
    record('PATCH /alerts/:id/terminate', 'agent terminaison (200)', 200, rTermAlert.status);

    const rDeleteAlert = await request(`/alerts/${createdAlertId}`, {
      method: 'DELETE',
      headers: authH(adminToken),
    });
    record('DELETE /alerts/:id', 'admin suppression (204)', 204, rDeleteAlert.status);
  }

  // 12. Notifications
  console.log(`\n--- Notifications ---`);
  const rNotifs = await request('/notifications', { headers: authH(citizenToken) });
  record('GET /notifications', 'citoyen connecté (200)', 200, rNotifs.status);

  const rNotif404 = await request('/notifications/999999/read', {
    method: 'PATCH',
    headers: authH(citizenToken),
  });
  record('PATCH /notifications/:id/read', 'id inexistant (404)', 404, rNotif404.status);

  // 13. Journal d'Audit (F47, F48)
  console.log(`\n--- Journal d'Audit (F47, F48) ---`);
  const rAudit = await request('/agent/audit-logs', { headers: authH(agentToken) });
  record('GET /agent/audit-logs', 'agent autorisé (200)', 200, rAudit.status);

  const rAuditCit = await request('/agent/audit-logs', { headers: authH(citizenToken) });
  record('GET /agent/audit-logs', 'citoyen refusé (403)', 403, rAuditCit.status);

  // 14. Transports Municipaux (F36)
  console.log(`\n--- Transports Municipaux (F36) ---`);
  const rTransports = await request('/transports');
  record('GET /transports', 'public (200)', 200, rTransports.status);

  const rTransOne = await request('/transports/NAV-1');
  record('GET /transports/:codeOrId', 'public ligne par code (200)', 200, rTransOne.status);

  const rTransCitPatch = await request('/transports/NAV-1/status', {
    method: 'PATCH',
    headers: authH(citizenToken),
    body: { status: 'normal' },
  });
  record('PATCH /transports/:codeOrId/status', 'citoyen refusé (403)', 403, rTransCitPatch.status);

  const rTransAgentPatch = await request('/transports/NAV-1/status', {
    method: 'PATCH',
    headers: authH(agentToken),
    body: { status: 'normal', statusMessage: 'Circulation normale' },
  });
  record('PATCH /transports/:codeOrId/status', 'agent autorisé (200)', 200, rTransAgentPatch.status);

  // 15. RGPD & Données Personnelles (F51)
  console.log(`\n--- RGPD & Données Personnelles (F51) ---`);
  const rPostPrivacy = await request('/privacy/inquiries', {
    method: 'POST',
    headers: authH(citizenToken),
    body: {
      type: 'explication',
      subject: '[TEST] Demande test smoke',
      description: 'Vérification de la prise en compte des requêtes de données.',
    },
  });
  record('POST /privacy/inquiries', 'citoyen création (201)', 201, rPostPrivacy.status);
  const createdPrivacyId = rPostPrivacy.data?.id;

  const rMinePrivacy = await request('/privacy/inquiries/mine', { headers: authH(citizenToken) });
  record('GET /privacy/inquiries/mine', 'citoyen connecté (200)', 200, rMinePrivacy.status);

  const rAgentPrivacy = await request('/agent/privacy/inquiries', { headers: authH(agentToken) });
  record('GET /agent/privacy/inquiries', 'agent connecté (200)', 200, rAgentPrivacy.status);

  if (createdPrivacyId) {
    const rUpdatePrivacy = await request(`/agent/privacy/inquiries/${createdPrivacyId}/status`, {
      method: 'PATCH',
      headers: authH(agentToken),
      body: { status: 'traitee', responseNote: '[TEST] Clôturé par le test' },
    });
    record('PATCH /agent/privacy/inquiries/:id/status', 'agent réponse (200)', 200, rUpdatePrivacy.status);
  }

  // --- RECAPITULATIF SOUS FORME DE TABLEAU ---
  console.log(`\n======================================================`);
  console.log(`📊 TABLEAU RÉCAPITULATIF DES TESTS`);
  console.log(`======================================================`);

  console.table(
    results.map((r) => ({
      Route: r.route,
      Cas: r.testCase,
      Attendu: r.expected,
      Obtenu: r.actual,
      Statut: r.status,
    }))
  );

  const failedCount = results.filter((r) => r.status === 'ÉCHEC').length;
  const passedCount = results.filter((r) => r.status === 'OK').length;
  const totalCount = results.length;
  const successRate = ((passedCount / totalCount) * 100).toFixed(1);

  console.log(`\nTotal: ${totalCount} | Réussis: ${passedCount} | Échecs: ${failedCount} | Taux: ${successRate}%\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('Erreur fatale lors du smoke test:', err);
  process.exitCode = 2;
});
