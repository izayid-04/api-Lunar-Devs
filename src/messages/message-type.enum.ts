export enum MessageType {
  QUESTION = 'question',
  SIGNALEMENT = 'signalement',
}

export const REPORT_CATEGORIES = [
  'voirie',
  'eclairage',
  'propreté',
  'eau',
  'autre',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
