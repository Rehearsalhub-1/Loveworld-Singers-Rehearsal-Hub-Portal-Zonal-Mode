export interface MasterSong {
  id: string;
  title: string;
  lyrics?: string;
  solfa?: string;
  history?: string;
  key?: string;
  tempo?: string;
  writer?: string;
  leadSinger?: string;
  category?: string;
  categories?: string[];
  audioFile?: string;
  imageUrl?: string;
  audioUrls?: any;
  importCount: number;
  publishedAt: Date | string;
  updatedAt: Date | string;
  originalSongId?: string;
  conductor?: string;
  leadKeyboardist?: string;
  bassGuitarist?: string;
  drummer?: string;
  customParts?: string[];
  isHQOnly?: boolean;
  sourceType?: string;
  publishedBy?: string;
  publishedByName?: string;
}

export interface MasterProgram {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
  publishedBy: string;
  publishedByName: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  sortOrder?: number;
}
