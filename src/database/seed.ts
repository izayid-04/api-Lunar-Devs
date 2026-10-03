import * as bcrypt from 'bcryptjs';
import type { DataSource } from 'typeorm';
import { Announcement } from '../announcements/entities/announcement.entity.js';
import { DISTRICTS } from '../common/districts.js';
import { MunicipalService } from '../services/entities/municipal-service.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';

const BCRYPT_SALT_ROUNDS = 10;

interface DemoAccount {
  role: UserRole;
  email: string | undefined;
  password: string | undefined;
  firstName: string;
  lastName: string;
  envLabel: string;
}

// Read lazily (inside the function, not at module-evaluation time) so
// this never races against dotenv loading .env in local dev.
function getDemoAccounts(): DemoAccount[] {
  return [
    {
      role: UserRole.AGENT,
      email: process.env.DEMO_AGENT_EMAIL,
      password: process.env.DEMO_AGENT_PASSWORD,
      firstName: 'Agent',
      lastName: 'Demo',
      envLabel: 'DEMO_AGENT_EMAIL / DEMO_AGENT_PASSWORD',
    },
    {
      role: UserRole.ADMIN,
      email: process.env.DEMO_ADMIN_EMAIL,
      password: process.env.DEMO_ADMIN_PASSWORD,
      firstName: 'Admin',
      lastName: 'Demo',
      envLabel: 'DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD',
    },
  ];
}

// Idempotent: safe to run on every boot (migrationsRun-style). Skips an
// account whose env vars are unset, and skips creating it again if a user
// with that email already exists — it never overwrites an existing
// account's password or role.
export async function seedDemoUsers(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(User);

  for (const account of getDemoAccounts()) {
    if (!account.email || !account.password) {
      console.warn(
        `Skipping ${account.role} demo seed: ${account.envLabel} not set.`,
      );
      continue;
    }

    const existing = await repository.findOne({
      where: { email: account.email },
    });
    if (existing) {
      console.log(`Demo ${account.role} account already exists, skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(
      account.password,
      BCRYPT_SALT_ROUNDS,
    );
    await repository.save(
      repository.create({
        email: account.email,
        passwordHash,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
      }),
    );
    console.log(`Demo ${account.role} account created (${account.email}).`);
  }
}

const MUNICIPAL_SERVICES: (Omit<
  MunicipalService,
  'id' | 'availability' | 'availabilityMessage' | 'availableAgainAt' | 'alternative'
> & Partial<MunicipalService>)[] = [
  {
    slug: 'mairie-de-nova-terra',
    name: 'Mairie de Nova Terra',
    category: 'administratif',
    description: 'Administration municipale, état civil et démarches citoyennes.',
    details:
      "Guichet unique pour les démarches d'état civil (naissance, mariage, décès), les demandes d'urbanisme et les doléances citoyennes. Accueil du public et orientation vers les services compétents.",
    contact: '+269 773 10 01 · mairie@novaterra.city',
    horaires: 'Lun-Ven 8h-16h',
    district: DISTRICTS[0],
    address: '1 Place de la République, Centre-Ville',
    latitude: -11.70215,
    longitude: 43.25512,
    featured: true,
    isEmergency: false,
  },
  {
    slug: 'commissariat-central',
    name: 'Commissariat Central',
    category: 'securite',
    description: 'Sécurité publique, urgences policières et dépôt de plaintes.',
    details:
      'Poste de police principal de Nova Terra, en charge de la sécurité du centre-ville et de la coordination avec les postes de quartier. Dépôt de plaintes et signalements.',
    contact: '+269 773 10 02 · police@novaterra.city',
    horaires: '24h/24, 7j/7',
    district: DISTRICTS[0],
    address: '15 Boulevard de la Concorde, Centre-Ville',
    latitude: -11.70420,
    longitude: 43.25730,
    featured: false,
    isEmergency: true,
  },
  {
    slug: 'bibliotheque-municipale',
    name: 'Bibliothèque Municipale',
    category: 'culture',
    description: 'Prêt de livres, espace de travail et ateliers numériques.',
    details:
      "Médiathèque proposant prêt de livres et de ressources numériques, salles de travail silencieuses, et ateliers d'initiation informatique pour tous les âges.",
    contact: '+269 773 10 03 · bibliotheque@novaterra.city',
    horaires: 'Mar-Sam 9h-18h',
    district: DISTRICTS[0],
    address: '8 Rue des Savoirs, Centre-Ville',
    latitude: -11.70110,
    longitude: 43.25340,
    featured: false,
    isEmergency: false,
  },
  {
    slug: 'hopital-etoile-du-sud',
    name: 'Hôpital Étoile du Sud',
    category: 'sante',
    description: 'Urgences médicales 24h/24 et soins hospitaliers de référence.',
    details:
      "Établissement hospitalier principal de Nova Terra, doté d'un service d'urgences réanimatoires, maternité, médecine générale et consultations spécialisées.",
    contact: '+269 773 20 01 · hopital@novaterra.city',
    horaires: '24h/24, 7j/7',
    district: DISTRICTS[1],
    address: '42 Avenue du Port, Port Stellaire',
    latitude: -11.71850,
    longitude: 43.24210,
    featured: true,
    isEmergency: true,
  },
  {
    slug: 'office-du-tourisme-spatial',
    name: 'Office du Tourisme Spatial',
    category: 'tourisme',
    description: 'Informations sur les visites du port et des navettes orbitales.',
    details:
      "Point d'accueil pour les visiteurs souhaitant découvrir le port spatial de Nova Terra : réservation de visites guidées, billetterie des navettes d'observation et informations pratiques.",
    contact: '+269 773 20 02 · tourisme@novaterra.city',
    horaires: 'Lun-Dim 9h-19h',
    district: DISTRICTS[1],
    address: '2 Quai des Pionniers, Port Stellaire',
    latitude: -11.72100,
    longitude: 43.23950,
    featured: false,
    isEmergency: false,
  },
  {
    slug: 'ecole-primaire-des-dunes',
    name: 'École Primaire des Dunes',
    category: 'education',
    description: 'Scolarisation des enfants du quartier des Dunes.',
    details:
      'École primaire publique accueillant les enfants de 6 à 11 ans du quartier des Dunes, avec cantine scolaire et activités périscolaires.',
    contact: '+269 773 30 01 · ecole-dunes@novaterra.city',
    horaires: 'Lun-Ven 7h30-15h30',
    district: DISTRICTS[2],
    address: '14 Allée des Sables, Quartier des Dunes',
    latitude: -11.69120,
    longitude: 43.26840,
    featured: false,
    isEmergency: false,
  },
  {
    slug: 'service-de-la-voirie',
    name: 'Service de la Voirie',
    category: 'voirie',
    description: "Entretien des routes, éclairage public et signalement d'incidents.",
    details:
      "En charge de l'entretien des chaussées, de l'éclairage public et de la signalisation sur l'ensemble de la ville. Traite les signalements transmis via la plateforme (nids de poule, lampadaires en panne, etc.).",
    contact: '+269 773 40 01 · voirie@novaterra.city',
    horaires: 'Lun-Ven 7h-15h',
    district: DISTRICTS[3],
    address: '5 Route des Crêtes, Hauts de Nova',
    latitude: -11.68530,
    longitude: 43.27910,
    featured: true,
    isEmergency: false,
  },
  {
    slug: 'centre-eau-energie',
    name: "Centre des Eaux et de l'Énergie",
    category: 'eau-energie',
    description: "Distribution d'eau potable et d'énergie, interventions d'urgence.",
    details:
      "Gère la distribution d'eau potable et d'énergie sur Nova Terra, les raccordements, et les interventions d'urgence en cas de coupure ou de fuite.",
    contact: '+269 773 50 01 · eau-energie@novaterra.city',
    horaires: 'Lun-Sam 8h-17h, urgences 24h/24',
    district: DISTRICTS[4],
    address: '88 Avenue Industrielle, Faubourg Est',
    latitude: -11.71120,
    longitude: 43.28450,
    featured: false,
    isEmergency: true,
  },
];

// Idempotent: creates or updates services with current metadata (category, featured, geo).
export async function seedMunicipalServices(
  dataSource: DataSource,
): Promise<void> {
  const repository = dataSource.getRepository(MunicipalService);
  let created = 0;
  let updated = 0;

  for (const service of MUNICIPAL_SERVICES) {
    const existing = await repository.findOne({
      where: { slug: service.slug },
    });
    if (existing) {
      existing.category = service.category ?? existing.category;
      existing.address = service.address ?? existing.address;
      existing.latitude = service.latitude ?? existing.latitude;
      existing.longitude = service.longitude ?? existing.longitude;
      existing.featured = service.featured ?? existing.featured;
      existing.isEmergency = service.isEmergency ?? existing.isEmergency;
      await repository.save(existing);
      updated++;
      continue;
    }
    await repository.save(repository.create(service));
    created++;
  }

  console.log(
    `Municipal services seeded: ${created} created, ${updated} updated with metadata.`,
  );
}

const ANNOUNCEMENTS: { title: string; body: string; category: string; isImportant?: boolean }[] = [
  {
    title: 'Bienvenue sur la plateforme numérique de Nova Terra',
    body: 'La ville de Nova Terra lance sa nouvelle plateforme numérique : signalez un problème, suivez vos démarches et restez informés de l\'actualité municipale, tout en un seul endroit.',
    category: 'annonce',
    isImportant: true,
  },
  {
    title: 'Travaux de voirie dans le quartier des Hauts de Nova',
    body: 'Des travaux de réfection des routes auront lieu dans le quartier des Hauts de Nova. Merci de votre patience et de votre vigilance dans les zones concernées.',
    category: 'travaux',
  },
  {
    title: "Nouveaux horaires pour l'Office du Tourisme Spatial",
    body: "L'Office du Tourisme Spatial de Port Stellaire élargit ses horaires d'ouverture pour accueillir les visiteurs tous les jours de la semaine, y compris le week-end.",
    category: 'service',
  },
  {
    title: "Campagne de vaccination à l'Hôpital Étoile du Sud",
    body: "Une campagne de vaccination gratuite est organisée à l'Hôpital Étoile du Sud. Renseignez-vous auprès du service d'accueil pour connaître les créneaux disponibles.",
    category: 'sante',
  },
];

// Idempotent: skips any announcement whose title already exists.
// Attributed to the first admin account found (the demo admin, if
// seeded) — skipped entirely (logged, no crash) if no admin exists yet,
// since there would be no one to attribute authorship to.
export async function seedAnnouncements(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const announcementRepository = dataSource.getRepository(Announcement);

  const admin = await userRepository.findOne({
    where: { role: UserRole.ADMIN },
  });
  if (!admin) {
    console.warn(
      'Skipping announcements seed: no admin account exists yet to attribute them to.',
    );
    return;
  }

  let created = 0;
  for (const announcement of ANNOUNCEMENTS) {
    const existing = await announcementRepository.findOne({
      where: { title: announcement.title },
    });
    if (existing) {
      continue;
    }
    await announcementRepository.save(
      announcementRepository.create({
        ...announcement,
        publishedAt: new Date(),
        author: admin,
      }),
    );
    created++;
  }

  console.log(
    created > 0
      ? `Seeded ${created} announcement(s).`
      : 'Announcements already seeded, skipping.',
  );
}

// Demo citizen account for the jury, so the platform is ready to evaluate immediately
export async function seedDemoCitizen(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(User);
  const email = process.env.DEMO_CITIZEN_EMAIL ?? 'citoyen.demo@novaterra.local';
  const password = process.env.DEMO_CITIZEN_PASSWORD ?? 'CitizenDemo123!';

  const existing = await repository.findOne({ where: { email } });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  await repository.save(
    repository.create({
      email,
      passwordHash,
      firstName: 'Amina',
      lastName: 'Hassan',
      role: UserRole.CITIZEN,
      district: DISTRICTS[1], // Port Stellaire (littoral / sud)
      preferredLanguage: 'fr',
      isVulnerable: true,
      profileCompleted: true,
    }),
  );
  console.log(`Demo citizen account created (${email}).`);
}

// Seed alerts matching competition prompts (D18, F29, F30, F31)
export async function seedAlerts(dataSource: DataSource): Promise<void> {
  const { Alert } = await import('../alerts/entities/alert.entity.js');
  const { AlertSeverity, AlertTarget } = await import('../alerts/alert-enums.js');
  const alertRepository = dataSource.getRepository(Alert);
  const userRepository = dataSource.getRepository(User);

  const admin = await userRepository.findOne({
    where: { role: UserRole.ADMIN },
  });

  const DEMO_ALERTS = [
    {
      title: 'Alerte Générale du Haut Conseil',
      body: 'Le Haut Conseil de Nova Terra décrète une alerte générale préventive pour l\'ensemble des districts. Veuillez consulter régulièrement les canaux d\'information municipaux et suivre les consignes civiques.',
      instructions: 'Respectez les consignes de circulation, limitez les déplacements non essentiels et tenez-vous informés via le portail officiel.',
      severity: AlertSeverity.INFO,
      target: AlertTarget.ALL,
      targetDistrict: null,
      startsAt: new Date(Date.now() - 3600 * 1000 * 4), // 4h ago
      expiresAt: null,
    },
    {
      title: "Montée du niveau de l'eau — Secteur Portuaire Sud",
      body: 'En raison de coefficients de marée exceptionnels et de fortes houles, une montée du niveau de l\'eau est constatée sur les quais et berges du secteur Port Stellaire (façade sud). Risque de submersion des voies basses.',
      instructions: 'Évitez les zones côtières, les quais et les promenades maritimes. Ne stationnez aucun véhicule à proximité immédiate du littoral. En cas d\'urgence côtière, contactez les secours portuaires.',
      severity: AlertSeverity.URGENT,
      target: AlertTarget.DISTRICT,
      targetDistrict: DISTRICTS[1], // Port Stellaire
      startsAt: new Date(Date.now() - 3600 * 1000 * 2), // 2h ago
      expiresAt: null,
    },
    {
      title: 'Vague de chaleur extrême — Dispositif Vigilance Vulnérabilité',
      body: 'Un pic de température critique traverse Nova Terra avec un indice UV élevé. Les infrastructures de climatisation municipale sont activées à pleine capacité.',
      instructions: 'Recommandations pour les personnes vulnérables : restez dans les pièces fraîches ou les espaces de fraîcheur municipaux, buvez au moins 1,5L d\'eau par jour même sans soif, mouillez-vous le corps plusieurs fois par jour, ne sortez pas aux heures les plus chaudes (11h-17h). Prévenez un voisin ou le service municipal d\'aide si vous vivez seul.',
      severity: AlertSeverity.IMPORTANT,
      target: AlertTarget.VULNERABLE,
      targetDistrict: null,
      startsAt: new Date(Date.now() - 3600 * 1000), // 1h ago
      expiresAt: null,
    },
  ];

  let created = 0;
  for (const item of DEMO_ALERTS) {
    const existing = await alertRepository.findOne({
      where: { title: item.title },
    });
    if (existing) {
      continue;
    }
    await alertRepository.save(
      alertRepository.create({
        ...item,
        author: admin,
      }),
    );
    created++;
  }

  console.log(
    created > 0
      ? `Seeded ${created} demo alert(s).`
      : 'Demo alerts already seeded, skipping.',
  );
}

// Seed appointment slots over the next 7 days for municipal services
export async function seedAppointmentSlots(dataSource: DataSource): Promise<void> {
  const { AppointmentSlot } = await import(
    '../appointments/entities/appointment-slot.entity.js'
  );
  const slotRepo = dataSource.getRepository(AppointmentSlot);
  const serviceRepo = dataSource.getRepository(MunicipalService);
  const userRepo = dataSource.getRepository(User);

  const [services, agent] = await Promise.all([
    serviceRepo.find(),
    userRepo.findOne({ where: { role: UserRole.AGENT } }),
  ]);

  if (services.length === 0) {
    return;
  }

  const existingSlotsCount = await slotRepo.count();
  if (existingSlotsCount > 0) {
    console.log('Appointment slots already seeded, skipping.');
    return;
  }

  const now = new Date();
  let created = 0;

  // For the first 3 services (Mairie, Commissariat, Hôpital), create slots over the next 7 days
  const targetServices = services.slice(0, 3);

  for (const srv of targetServices) {
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      // 2 slots per day: 10:00 - 10:30 and 14:00 - 14:30
      const morningStart = new Date(now);
      morningStart.setDate(now.getDate() + dayOffset);
      morningStart.setHours(10, 0, 0, 0);

      const morningEnd = new Date(morningStart);
      morningEnd.setMinutes(30);

      const afternoonStart = new Date(now);
      afternoonStart.setDate(now.getDate() + dayOffset);
      afternoonStart.setHours(14, 0, 0, 0);

      const afternoonEnd = new Date(afternoonStart);
      afternoonEnd.setMinutes(30);

      const slotsToCreate = [
        slotRepo.create({
          service: srv,
          agent: agent ?? null,
          startsAt: morningStart,
          endsAt: morningEnd,
          location: `Guichet ${srv.name} — Salle 101`,
          isAvailable: true,
        }),
        slotRepo.create({
          service: srv,
          agent: agent ?? null,
          startsAt: afternoonStart,
          endsAt: afternoonEnd,
          location: `Guichet ${srv.name} — Salle 102`,
          isAvailable: true,
        }),
      ];

      await slotRepo.save(slotsToCreate);
      created += slotsToCreate.length;
    }
  }

  console.log(`Seeded ${created} appointment slot(s) for the next 7 days.`);
}


