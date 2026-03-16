export type ApplicationStatus =
  | "In Queue"
  | "Applied"
  | "Screening"
  | "Interviewing"
  | "Offer"
  | "Rejected"
  | "Withdrawn";

export type Application = {
  id: string;
  company: string;
  role_title: string;
  location: string | null;
  job_link: string | null;
  source: string | null;
  date_applied: string;
  status: ApplicationStatus;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const statusOptions: ApplicationStatus[] = [
  "In Queue",
  "Applied",
  "Screening",
  "Interviewing",
  "Offer",
  "Rejected",
  "Withdrawn",
];
