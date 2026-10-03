import * as bcrypt from 'bcryptjs';
import type { DataSource } from 'typeorm';
import { Announcement } from '../announcements/entities/announcement.entity.js';
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

const MUNICIPAL_SERVICES: Omit<MunicipalService, 'id'>[] = [
  {
    slug: 'mairie-de-nova-terra',
    name: 'Mairie de Nova Terra',
    description: 'Administration municipale, état civil et démarches citoyennes.',
    details:
      "Guichet unique pour les démarches d'état civil (naissance, mariage, décès), les demandes d'urbanisme et les doléances citoyennes. Accueil du public et orientation vers les services compétents.",
    contact: '+269 773 10 01 · mairie@novaterra.city',
    horaires: 'Lun-Ven 8h-16h',
    district: 'Centre-Ville',
  },
  {
    slug: 'commissariat-central',
    name: 'Commissariat Central',
    description: 'Sécurité publique et dépôt de plaintes.',
    details:
      'Poste de police principal de Nova Terra, en charge de la sécurité du centre-ville et de la coordination avec les postes de quartier. Dépôt de plaintes et signalements.',
    contact: '+269 773 10 02 · police@novaterra.city',
    horaires: '24h/24, 7j/7',
    district: 'Centre-Ville',
  },
  {
    slug: 'bibliotheque-municipale',
    name: 'Bibliothèque Municipale',
    description: 'Prêt de livres, espace de travail et ateliers numériques.',
    details:
      "Médiathèque proposant prêt de livres et de ressources numériques, salles de travail silencieuses, et ateliers d'initiation informatique pour tous les âges.",
    contact: '+269 773 10 03 · bibliotheque@novaterra.city',
    horaires: 'Mar-Sam 9h-18h',
    district: 'Centre-Ville',
  },
  {
    slug: 'hopital-etoile-du-sud',
    name: 'Hôpital Étoile du Sud',
    description: 'Urgences et soins de santé pour les habitants du port.',
    details:
      "Établissement hospitalier principal du quartier de Port Stellaire, avec service d'urgences, maternité et consultations spécialisées.",
    contact: '+269 773 20 01 · hopital@novaterra.city',
    horaires: '24h/24, 7j/7',
    district: 'Port Stellaire',
  },
  {
    slug: 'office-du-tourisme-spatial',
    name: 'Office du Tourisme Spatial',
    description: 'Informations sur les visites du port et des navettes orbitales.',
    details:
      "Point d'accueil pour les visiteurs souhaitant découvrir le port spatial de Nova Terra : réservation de visites guidées, billetterie des navettes d'observation et informations pratiques.",
    contact: '+269 773 20 02 · tourisme@novaterra.city',
    horaires: 'Lun-Dim 9h-19h',
    district: 'Port Stellaire',
  },
  {
    slug: 'ecole-primaire-des-dunes',
    name: 'École Primaire des Dunes',
    description: 'Scolarisation des enfants du quartier des Dunes.',
    details:
      'École primaire publique accueillant les enfants de 6 à 11 ans du quartier des Dunes, avec cantine scolaire et activités périscolaires.',
    contact: '+269 773 30 01 · ecole-dunes@novaterra.city',
    horaires: 'Lun-Ven 7h30-15h30',
    district: 'Quartier des Dunes',
  },
  {
    slug: 'service-de-la-voirie',
    name: 'Service de la Voirie',
    description: "Entretien des routes, éclairage public et signalement d'incidents.",
    details:
      "En charge de l'entretien des chaussées, de l'éclairage public et de la signalisation sur l'ensemble de la ville. Traite les signalements transmis via la plateforme (nids de poule, lampadaires en panne, etc.).",
    contact: '+269 773 40 01 · voirie@novaterra.city',
    horaires: 'Lun-Ven 7h-15h',
    district: 'Hauts de Nova',
  },
  {
    slug: 'centre-eau-energie',
    name: "Centre des Eaux et de l'Énergie",
    description: "Distribution d'eau potable et d'énergie, interventions d'urgence.",
    details:
      "Gère la distribution d'eau potable et d'énergie sur Nova Terra, les raccordements, et les interventions d'urgence en cas de coupure ou de fuite.",
    contact: '+269 773 50 01 · eau-energie@novaterra.city',
    horaires: 'Lun-Sam 8h-17h, urgences 24h/24',
    district: 'Faubourg Est',
  },
];

// Idempotent: skips any service whose slug already exists.
export async function seedMunicipalServices(
  dataSource: DataSource,
): Promise<void> {
  const repository = dataSource.getRepository(MunicipalService);
  let created = 0;

  for (const service of MUNICIPAL_SERVICES) {
    const existing = await repository.findOne({
      where: { slug: service.slug },
    });
    if (existing) {
      continue;
    }
    await repository.save(repository.create(service));
    created++;
  }

  console.log(
    created > 0
      ? `Seeded ${created} municipal service(s).`
      : 'Municipal services already seeded, skipping.',
  );
}

const ANNOUNCEMENTS: { title: string; body: string; category: string }[] = [
  {
    title: 'Bienvenue sur la plateforme numérique de Nova Terra',
    body: 'La ville de Nova Terra lance sa nouvelle plateforme numérique : signalez un problème, suivez vos démarches et restez informés de l\'actualité municipale, tout en un seul endroit.',
    category: 'annonce',
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
