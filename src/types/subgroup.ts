export type SubGroupType = 'church' | 'campus' | 'cell' | 'youth' | 'other';
export type SubGroupStatus = 'pending' | 'active' | 'rejected';

export interface SubGroup {
  id: string;
  zoneId: string;
  name: string;
  type: SubGroupType;
  description: string;
  coordinatorId: string;
  coordinatorName?: string;
  coordinatorEmail?: string;
  memberIds: string[];
  status: SubGroupStatus;
  estimatedMembers: number;
  createdAt: Date | string;
  approvedAt?: Date | string;
  approvedBy?: string;
  approvedByName?: string;
  activatedAt?: Date | string;
  code?: string;
  memberCount?: number;
  zoneName?: string;
  rejectionReason?: string;
  rejectedAt?: Date | string;
  rejectedBy?: string;
}

export interface SubGroupRequest {
  name: string;
  type: SubGroupType;
  description: string;
  estimatedMembers: number;
}

export interface SubGroupSong {
  id: string;
  title: string;
  lyrics: string;
  writer: string;
  category: string;
  key: string;
  tempo: string;
  leadSinger: string;
  audioUrl?: string;
  audioFile?: string;
  audioUrls?: any;
  rehearsalCount: number;
  isActive?: boolean;
  status?: 'unheard' | 'heard';
  praiseNightId?: string;
  solfa?: string;
  solfas?: string;
  comments?: any[];
  history?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SubGroupRehearsal {
  id: string;
  title: string;
  name: string;
  date: string;
  time: string;
  location: string;
  songIds: string[];
  bannerImage?: string;
  category?: 'ongoing' | 'pre-rehearsal' | 'archive';
  subGroupName?: string;
  subGroupId: string;
}
