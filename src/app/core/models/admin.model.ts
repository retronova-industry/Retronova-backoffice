export type AdminRole = 'super_admin' | 'arcade_owner';

export interface AdminMe {
  id: number;
  firebase_uid: string;
  email: string;
  role: AdminRole;
  arcade_ids: number[];
}

export interface AdminListItem {
  id: number;
  email: string;
  role: AdminRole;
  arcades: { id: number; nom: string }[];
  created_at: string;
}

export interface OwnerListItem {
  id: number;
  email: string;
  created_at: string;
  arcades: { id: number; nom: string; localisation: string }[];
}

export interface UnassignedArcade {
  id: number;
  nom: string;
  localisation: string;
}
