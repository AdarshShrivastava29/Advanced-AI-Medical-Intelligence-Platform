// Deployment-level branding. These are presentation-only values supplied per
// hospital tenant at build time; the backend has no organisation endpoint, so
// nothing here is fetched or persisted.

/** Hospital / health-system name shown in the sidebar and topbar. */
export const ORG_NAME: string = import.meta.env.VITE_ORG_NAME ?? 'AIMIP Health System';

/** Department or service line shown under the organisation name. */
export const ORG_UNIT: string = import.meta.env.VITE_ORG_UNIT ?? 'Radiology · AI Diagnostics';

/** Frontend release shown in the auth footer and settings diagnostics. */
export const APP_VERSION = '0.1.0';

/** Regulatory footer shown on reports and auth screens. */
export const CLINICAL_DISCLAIMER =
  'AIMIP provides clinical decision-support only and is not a medical device. All findings require review by a qualified clinician.';

/** Human labels for the `role` values returned by /auth/me. */
export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  doctor: 'Clinician',
  user: 'Staff',
};
