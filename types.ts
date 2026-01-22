
export enum SakuColor {
  ABU = 'Abu',
  HITAM = 'Hitam',
  CREAM = 'Cream',
  OREN = 'Oren'
}

export enum SakuType {
  SKOTLAIT = 'Skotlait',
  PETERBAN = 'Peterban',
  POLOS = 'Polos'
}

export enum JobStatus {
  BERES = 'Beres',
  PROSES = 'Proses'
}

export enum Priority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface SizeDetail {
  size: string;
  jumlah: number;
  gender: 'Pria' | 'Wanita';
  tangan: 'Panjang' | 'Pendek';
  namaPerSize?: string;
}

export interface OrderItem {
  id: string;
  namaPenjahit: string;
  kodeBarang: string;
  tanggalOrder: string;
  tanggalTargetSelesai: string;
  cs: string;
  konsumen: string;
  jumlahPesanan: number;
  sizeDetails: SizeDetail[];
  model: string;
  warna: string;
  sakuType: SakuType;
  sakuColor: SakuColor;
  status: JobStatus;
  priority: Priority;
  deskripsiPekerjaan: string;
  createdAt: string;
  isManual?: boolean;
}

export const BRAD_MODELS = ['Brad V1', 'Brad V2', 'PDH', 'Ventura', 'Rompi', 'Custom'];

export const PRICE_LIST: Record<string, number> = {
  'PDH': 39000,
  'BRAD V2': 39000,
  'BRAD V1': 34000,
  'VENTURA': 41000,
  'ROMPI': 45000,
  'CUSTOM': 45000,
  'DEFAULT': 35000
};

export type ViewState = 'DASHBOARD' | 'SCAN' | 'HISTORY' | 'ANALYTICS' | 'ACCOUNT';
