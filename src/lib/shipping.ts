export interface Agency {
  id: number;
  ubigeo: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export type District = [code: string, department: string, province: string, name: string, latitude: number | null, longitude: number | null];

export interface AgencyDirectory {
  agencies: Agency[];
  sourceVersion: string;
  checkedAt: string;
}
