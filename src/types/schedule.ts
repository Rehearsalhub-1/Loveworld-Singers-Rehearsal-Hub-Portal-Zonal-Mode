export interface GridCell {
  value: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bgColor?: string;
}

export interface SpreadsheetSong {
  songTitle?: string;
  leadSinger?: string;
  choirLeader?: string;
  subLeader?: string;
  drummer?: string;
  keyboardist?: string;
  bass?: string;
  rhythm?: string;
  auxKey?: string;
  talkingDrum?: string;
  traditional?: string;
  sound?: string;
  visual?: string;
  dateReceived?: string;
  lyricsStatus?: string;
  transcriptionStatus?: string;
  category?: string;
  source?: string;
  originalSongTitle?: string;
  order?: number;
  height?: number;
  label?: string;
}

export interface SpreadsheetData {
  rows: any[];
  columns: any[];
  data: Record<string, any>;
  lastModified?: string;
  sheetName?: string;
}

export interface ScheduleCategory {
  id: string;
  zoneId: string | null;
  label: string;
  description: string;
  icon: string;
  color: string;
  iconColor: string;
  order: number;
  isActive: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  spreadsheetData?: SpreadsheetData;
}

export interface ScheduleSong {
  id: string;
  zoneId?: string | null;
  categoryId?: string;
  title: string;
  artist?: string;
  writer?: string;
  leadSinger?: string;
  rehearsalCount?: number;
  key?: string;
  tempo?: string;
  lyricsUrl?: string;
  audioUrl?: string;
  notes?: string;
  order?: number;
  date?: string;
  dateReceived?: string;
  type?: string;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface ScheduleProgram {
  id: string;
  zoneId: string | null;
  title?: string;
  program?: string;
  time?: string;
  dailyTarget?: string;
  description?: string;
  date: string;
  categoryId?: string;
  songs?: ScheduleSong[];
  spreadsheetData?: SpreadsheetData;
  updatedAt: string;
  createdBy: string;
}
