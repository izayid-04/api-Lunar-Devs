import * as bcrypt from 'bcryptjs';
import { MoreThan, type DataSource } from 'typeorm';
import { Announcement } from '../announcements/entities/announcement.entity.js';
import { DISTRICTS } from '../common/districts.js';
import { MunicipalService } from '../services/entities/municipal-service.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import {
  TransportLine,
  TransportLineStatus,
  TransportType,
} from '../transports/entities/transport-line.entity.js';

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

// Idempotent & self-healing: ensures at least one AVAILABLE slot exists in
// the next 7 days at all times. On a redeploy where every previously
// seeded slot has slipped into the past (or been booked), this detects
// that no future-available slot remains and seeds a fresh batch — so the
// demo never runs dry on bookable appointments just because the calendar
// moved on since the last deploy. Never touches slots that already exist
// (booked or not), so a citizen's existing booking is never affected.
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

  const now = new Date();
  const futureAvailableCount = await slotRepo.count({
    where: { isAvailable: true, startsAt: MoreThan(now) },
  });
  if (futureAvailableCount > 0) {
    console.log(
      'Appointment slots: des créneaux libres existent déjà dans les 7 prochains jours, rien à faire.',
    );
    return;
  }

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

      const candidates = [
        { startsAt: morningStart, endsAt: morningEnd, room: 'Salle 101' },
        { startsAt: afternoonStart, endsAt: afternoonEnd, room: 'Salle 102' },
      ];

      for (const candidate of candidates) {
        // Guards against double-creating a slot that already exists for
        // this exact service + time (e.g. a slot that's in the future
        // but currently booked — isAvailable: false — must not be
        // duplicated just because it didn't count toward
        // futureAvailableCount above).
        const existing = await slotRepo.findOne({
          where: { service: { id: srv.id }, startsAt: candidate.startsAt },
        });
        if (existing) continue;

        await slotRepo.save(
          slotRepo.create({
            service: srv,
            agent: agent ?? null,
            startsAt: candidate.startsAt,
            endsAt: candidate.endsAt,
            location: `Guichet ${srv.name} — ${candidate.room}`,
            isAvailable: true,
          }),
        );
        created++;
      }
    }
  }

  console.log(`Seeded ${created} appointment slot(s) for the next 7 days.`);
}

// Idempotent per line `code` (not a global count): a transport line
// missing from the table — because an earlier deploy's seeding run was
// interrupted partway through, say — gets created on the next boot
// instead of being silently skipped forever just because the table is
// no longer empty.
export async function seedTransports(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(TransportLine);

  const defaultLines = [
    {
      code: 'NAV-1',
      name: 'Navette Éco-Centre',
      type: TransportType.NAVETTE,
      origin: 'Port Stellaire',
      destination: 'Centre Ville',
      status: TransportLineStatus.NORMAL,
      statusMessage: 'Circulation fluide',
      frequency: 'Toutes les 8 min',
      operatingHours: '05:30 - 23:30',
      stops: JSON.stringify(['Port Stellaire', 'Gare Maritime', 'Place Centrale', 'Hôtel de Ville']),
      nextDepartures: JSON.stringify(['10:15', '10:23', '10:31', '10:39']),
    },
    {
      code: 'L4',
      name: 'Ligne Express Quartier Nord',
      type: TransportType.BUS,
      origin: 'Quartier Nord',
      destination: 'Campus Scientifique',
      status: TransportLineStatus.NORMAL,
      statusMessage: 'Service normal',
      frequency: 'Toutes les 12 min',
      operatingHours: '06:00 - 22:00',
      stops: JSON.stringify(['Quartier Nord', 'Avenue des Étoiles', 'Hôpital Municipal', 'Campus']),
      nextDepartures: JSON.stringify(['10:10', '10:22', '10:34', '10:46']),
    },
    {
      code: 'T1',
      name: 'Tramway de la Baie',
      type: TransportType.TRAM,
      origin: 'Plage du Levant',
      destination: 'Technopôle Nova',
      status: TransportLineStatus.NORMAL,
      statusMessage: 'Circulation conforme',
      frequency: 'Toutes les 6 min',
      operatingHours: '05:00 - 00:30',
      stops: JSON.stringify(['Plage Levant', 'Baie Ouest', 'Cité Administrative', 'Technopôle']),
      nextDepartures: JSON.stringify(['10:12', '10:18', '10:24', '10:30']),
    },
    {
      code: 'BAT-A',
      name: 'Navette Fluviale Archipel',
      type: TransportType.BATELIER,
      origin: 'Embarcadère Sud',
      destination: 'Île de l’Énergie',
      status: TransportLineStatus.NORMAL,
      statusMessage: 'Départs toutes les 20 min',
      frequency: 'Toutes les 20 min',
      operatingHours: '07:00 - 20:00',
      stops: JSON.stringify(['Embarcadère Sud', 'Quai des Pêcheurs', 'Île de l’Énergie']),
      nextDepartures: JSON.stringify(['10:20', '10:40', '11:00']),
    },
  ];

  let created = 0;
  for (const line of defaultLines) {
    const existing = await repo.findOne({ where: { code: line.code } });
    if (existing) continue;
    await repo.save(repo.create(line));
    created++;
  }
  console.log(
    created > 0
      ? `Seeded ${created} transport line(s).`
      : 'Transport lines already seeded, skipping.',
  );
}

// Idempotent per project `title` (not a global count): a project missing
// from the table gets created on the next boot instead of being silently
// skipped forever just because the table already has other rows. Each
// project's consultation is likewise created only if that project does
// not already have one.
export async function seedParticipationProjects(dataSource: DataSource): Promise<void> {
  const { Project, ProjectStatus } = await import('../participation/entities/project.entity.js');
  const { Consultation } = await import('../participation/entities/consultation.entity.js');
  const projectRepo = dataSource.getRepository(Project);
  const consultationRepo = dataSource.getRepository(Consultation);

  {
    const projectsData = [
      {
        title: 'Végétalisation du Dôme Central',
        description: 'Implantation d\'espaces verts suspendus et d\'un réseau de brumisateurs bio-régénérants pour améliorer la qualité de l\'air et le confort thermique dans le quartier central.',
        district: DISTRICTS[0], // Centre-Ville
        status: ProjectStatus.EN_COURS,
        startDate: '2026-09-01',
        endDate: '2027-03-31',
        consultation: {
          question: 'Quel aménagement végétal prioritaire souhaitez-vous installer sous la verrière ?',
          options: ['Jardins partagés suspendus', 'Forêt urbaine de palmiers régénérants', 'Bassin d\'eau filtrée et allées ombragées'],
          endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000), // In 30 days
        },
      },
      {
        title: 'Modernisation des Écluses Portuaires',
        description: 'Renforcement des digues d\'amarrage et automatisation des sas pressurisés du Port Stellaire pour fluidifier l\'arrivée des cargos de ravitaillement.',
        district: DISTRICTS[1], // Port Stellaire
        status: ProjectStatus.EN_COURS,
        startDate: '2026-08-15',
        endDate: '2026-12-15',
        consultation: {
          question: 'Comment optimiser les flux de circulation des piétons le long des quais ?',
          options: ['Passerelle haute vitrée', 'Trottoirs roulants solaires', 'Priorité totale aux navettes douces'],
          endDate: new Date(Date.now() + 14 * 24 * 3600 * 1000), // In 14 days
        },
      },
      {
        title: 'Parc Solaire et Éolien des Dunes',
        description: 'Déploiement d\'un parc de captage d\'énergie renouvelable mixte exploitant les vents thermiques et le rayonnement solaire dans les Dunes.',
        district: DISTRICTS[2], // Quartier des Dunes
        status: ProjectStatus.PROPOSE,
        startDate: '2027-01-10',
        endDate: '2027-09-30',
        consultation: {
          question: 'À quel usage affecter l\'énergie excédentaire produite localement ?',
          options: ['Climatisation municipale gratuite', 'Éclairage public permanent', 'Recharge libre des navettes électriques'],
          endDate: new Date(Date.now() + 45 * 24 * 3600 * 1000), // In 45 days
        },
      },
      {
        title: 'Réseau Sentiers Panoramiques des Crêtes',
        description: 'Création d\'itinéraires piétons sécurisés équipés de points d\'observation astronomique sur les Hauts de Nova.',
        district: DISTRICTS[3], // Hauts de Nova
        status: ProjectStatus.TERMINE,
        startDate: '2026-01-15',
        endDate: '2026-08-30',
      },
    ];

    let createdProjects = 0;
    let createdConsultations = 0;

    for (const p of projectsData) {
      const { consultation, ...pData } = p;

      let project = await projectRepo.findOne({ where: { title: p.title } });
      if (!project) {
        project = await projectRepo.save(projectRepo.create(pData));
        createdProjects++;
      }

      if (consultation) {
        const existingConsultation = await consultationRepo.findOne({
          where: { projectId: project.id },
        });
        if (!existingConsultation) {
          await consultationRepo.save(
            consultationRepo.create({
              project,
              projectId: project.id,
              question: consultation.question,
              options: consultation.options,
              endDate: consultation.endDate,
            }),
          );
          createdConsultations++;
        }
      }
    }
    console.log(
      `Participation: ${createdProjects} projet(s) créé(s), ${createdConsultations} consultation(s) créée(s).`,
    );
  }
}

// Idempotent per partner `name` (not a global count): a partner missing
// from the table gets created on the next boot instead of being silently
// skipped forever just because the table already has other rows. This is
// the exact bug that left `partners` empty in production: it used to run
// only once, nested inside seedTransports's now-removed "table is empty"
// guard, so once transports existed the whole block — including partners
// — was skipped on every later deploy even though partners itself was
// still empty (its own seeding attempt had failed, e.g. a schema mismatch
// on `opening_hours`).
export async function seedPartners(dataSource: DataSource): Promise<void> {
  const { Partner } = await import('../partners/entities/partner.entity.js');
  const partnerRepo = dataSource.getRepository(Partner);

  {
    const partnersData = [
      {
        name: 'Éco-Pionniers de Nova Terra',
        description: 'Association citoyenne engagée pour le recyclage des biomatériaux, l\'agriculture urbaine et la préservation de la biosphère locale.',
        address: '12 Avenue de l\'Harmonie',
        district: DISTRICTS[0], // Centre-Ville
        openingHours: 'Mar-Sam 9h-17h',
        contact: '+269 773 80 01 · contact@ecopionniers.org',
      },
      {
        name: 'Solidarité Stellaire & Entraide',
        description: 'Accompagnement social des nouveaux arrivants, permanence d\'aide aux démarches et distribution de repas solidaires.',
        address: '5 Rue du Quai Sud',
        district: DISTRICTS[1], // Port Stellaire
        openingHours: 'Lun-Ven 8h30-16h30',
        contact: '+269 773 80 02 · entraide@solidarite-stellaire.org',
      },
      {
        name: 'Atelier Sciences & Jeunesse',
        description: 'Club d\'initiation aux sciences spatiales, robotique et observation télescopique pour les jeunes de la colonie.',
        address: '28 Boulevard des Sables',
        district: DISTRICTS[2], // Quartier des Dunes
        openingHours: 'Mer 14h-18h, Sam 10h-18h',
        contact: '+269 773 80 03 · sciences@jeunesse-nova.org',
      },
    ];

    let created = 0;
    for (const partner of partnersData) {
      const existing = await partnerRepo.findOne({ where: { name: partner.name } });
      if (existing) continue;
      await partnerRepo.save(partnerRepo.create(partner));
      created++;
    }
    console.log(
      created > 0
        ? `Seeded ${created} partner association(s).`
        : 'Partner associations already seeded, skipping.',
    );
  }
}

// Gives the demo citizen some realistic activity to show the jury, without
// ever touching their email/password. Each kind of activity (messages,
// idea, service feedback, consultation response) is seeded independently
// and only if that citizen has none of that kind yet — never duplicated
// on a later redeploy, and never added on top of activity the citizen (or
// a juror using that account) created themselves.
export async function seedDemoCitizenActivity(dataSource: DataSource): Promise<void> {
  const email = process.env.DEMO_CITIZEN_EMAIL ?? 'citoyen.demo@novaterra.local';
  const citizen = await dataSource.getRepository(User).findOne({ where: { email } });
  if (!citizen) {
    console.warn(
      'Skipping demo citizen activity seed: demo citizen account not found yet.',
    );
    return;
  }

  await seedDemoCitizenMessages(dataSource, citizen);
  await seedDemoCitizenIdea(dataSource, citizen);
  await seedDemoCitizenServiceFeedback(dataSource, citizen);
  await seedDemoCitizenConsultationResponse(dataSource, citizen);
}

async function seedDemoCitizenMessages(dataSource: DataSource, citizen: User): Promise<void> {
  const { CitizenMessage } = await import('../messages/entities/citizen-message.entity.js');
  const { MessageStatusHistory } = await import(
    '../messages/entities/message-status-history.entity.js'
  );
  const { MessageStatus } = await import('../messages/message-status.enum.js');
  const { MessageType } = await import('../messages/message-type.enum.js');
  const { MessagePriority } = await import('../messages/message-priority.enum.js');
  const { buildMessageReference } = await import('../messages/reference.util.js');

  const messageRepo = dataSource.getRepository(CitizenMessage);
  const historyRepo = dataSource.getRepository(MessageStatusHistory);

  const existingCount = await messageRepo.count({ where: { authorId: citizen.id } });
  if (existingCount > 0) {
    return;
  }

  const admin = await dataSource
    .getRepository(User)
    .findOne({ where: { role: UserRole.ADMIN } });

  const demoMessages = [
    {
      type: MessageType.SIGNALEMENT,
      subject: 'Nid de poule dangereux Avenue du Port',
      body:
        "Un nid de poule profond s'est formé devant le numéro 42, il a déjà causé une crevaison à un voisin. Une intervention rapide serait appréciée.",
      category: 'voirie',
      preciseLocation: 'Avenue du Port, devant le 42',
      priority: MessagePriority.HAUTE,
      history: [MessageStatus.NOUVEAU, MessageStatus.EN_COURS] as const,
    },
    {
      type: MessageType.SIGNALEMENT,
      subject: 'Éclairage public en panne Rue des Savoirs',
      body:
        'Trois lampadaires consécutifs sont éteints depuis une semaine, la rue est très sombre le soir.',
      category: 'eclairage',
      preciseLocation: 'Rue des Savoirs, entre le 8 et le 14',
      priority: MessagePriority.NORMALE,
      history: [
        MessageStatus.NOUVEAU,
        MessageStatus.EN_COURS,
        MessageStatus.TRAITE,
      ] as const,
    },
    {
      type: MessageType.QUESTION,
      subject: 'Horaires de la déchèterie municipale',
      body: "Pourriez-vous me confirmer les horaires d'ouverture de la déchèterie le week-end ?",
      category: 'autre',
      preciseLocation: undefined,
      priority: MessagePriority.NORMALE,
      history: [MessageStatus.NOUVEAU] as const,
    },
  ];

  const historyNotes: Record<string, string> = {
    [MessageStatus.NOUVEAU]: 'Signalement enregistré',
    [MessageStatus.EN_COURS]: 'Prise en charge par le service compétent',
    [MessageStatus.TRAITE]: 'Intervention terminée',
  };

  let created = 0;
  for (const m of demoMessages) {
    const saved = await messageRepo.save(
      messageRepo.create({
        authorId: citizen.id,
        type: m.type,
        subject: m.subject,
        body: m.body,
        category: m.category,
        district:
          m.type === MessageType.SIGNALEMENT ? citizen.district ?? DISTRICTS[1] : null,
        preciseLocation: m.preciseLocation ?? null,
        priority: m.priority,
        status: m.history[m.history.length - 1],
      }),
    );
    saved.reference = buildMessageReference(saved.id);
    await messageRepo.save(saved);

    for (const status of m.history) {
      await historyRepo.save(
        historyRepo.create({
          messageId: saved.id,
          status,
          note: historyNotes[status],
          changedById: status === MessageStatus.NOUVEAU ? citizen.id : admin?.id ?? citizen.id,
        }),
      );
    }
    created++;
  }
  console.log(`Seeded ${created} demo message(s)/signalement(s) for the demo citizen.`);
}

async function seedDemoCitizenIdea(dataSource: DataSource, citizen: User): Promise<void> {
  const { Idea } = await import('../participation/entities/idea.entity.js');
  const ideaRepo = dataSource.getRepository(Idea);

  const existingCount = await ideaRepo.count({ where: { citizenId: citizen.id } });
  if (existingCount > 0) {
    return;
  }

  const dateStr = new Date().getFullYear().toString();
  const rand = Math.floor(1000 + Math.random() * 9000);

  await ideaRepo.save(
    ideaRepo.create({
      reference: `IDEE-${dateStr}-${rand}`,
      title: 'Composteurs collectifs dans les Dunes',
      description:
        'Installer des composteurs collectifs dans le quartier des Dunes pour réduire les déchets organiques et produire du compost pour les jardins partagés.',
      district: citizen.district ?? DISTRICTS[2],
      citizenId: citizen.id,
    }),
  );
  console.log('Seeded 1 demo idea for the demo citizen.');
}

async function seedDemoCitizenServiceFeedback(
  dataSource: DataSource,
  citizen: User,
): Promise<void> {
  const { ServiceFeedback } = await import(
    '../service-feedback/entities/service-feedback.entity.js'
  );
  const feedbackRepo = dataSource.getRepository(ServiceFeedback);

  const existingCount = await feedbackRepo.count({ where: { citizenId: citizen.id } });
  if (existingCount > 0) {
    return;
  }

  const service = await dataSource
    .getRepository(MunicipalService)
    .findOne({ where: { slug: 'hopital-etoile-du-sud' } });
  if (!service) {
    return;
  }

  const refNumber = Math.floor(100000 + Math.random() * 900000);
  await feedbackRepo.save(
    feedbackRepo.create({
      serviceId: service.id,
      citizenId: citizen.id,
      rating: 4,
      comment: "Accueil rapide aux urgences, personnel à l'écoute. Un peu d'attente en pharmacie.",
      reference: `AVIS-${service.id}-${refNumber}`,
    }),
  );
  console.log('Seeded 1 demo service feedback for the demo citizen.');
}

async function seedDemoCitizenConsultationResponse(
  dataSource: DataSource,
  citizen: User,
): Promise<void> {
  const { ConsultationResponse } = await import(
    '../participation/entities/consultation-response.entity.js'
  );
  const { Consultation } = await import('../participation/entities/consultation.entity.js');
  const responseRepo = dataSource.getRepository(ConsultationResponse);

  const existingCount = await responseRepo.count({ where: { citizenId: citizen.id } });
  if (existingCount > 0) {
    return;
  }

  const [consultation] = await dataSource
    .getRepository(Consultation)
    .find({ order: { id: 'ASC' }, take: 1 });
  if (!consultation) {
    return;
  }

  const refNumber = Math.floor(100000 + Math.random() * 900000);
  await responseRepo.save(
    responseRepo.create({
      consultationId: consultation.id,
      citizenId: citizen.id,
      reference: `CONS-${consultation.id}-${refNumber}`,
      option: consultation.options[0],
      comment: 'Je soutiens cette option, elle me semble la plus utile pour le quartier.',
    }),
  );
  console.log('Seeded 1 demo consultation response for the demo citizen.');
}


