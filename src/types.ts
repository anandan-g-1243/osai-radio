export type ScheduleFilter = 'All' | 'Live' | 'Morning' | 'Afternoon' | 'Evening';
export type ShowStatus = 'Live' | 'Upcoming';
export type RepeatMode = 'off' | 'all' | 'one';

export interface Station {
  id: number;
  name: string;
  genre: string;
  frequency: string;
  location: string;
  tagline: string;
  listeners: number;
  accent: string;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  url: string;
}

export interface ShowSlot {
  id: number;
  title: string;
  host: string;
  startTime: string;
  endTime: string;
  segment: Exclude<ScheduleFilter, 'All' | 'Live'>;
  status: ShowStatus;
  summary: string;
}

export interface PlayerState {
  isPlaying: boolean;
  volume: number;
}