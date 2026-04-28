import type { ScheduleFilter, ShowSlot, Song, Station } from '../types';

export const station: Station = {
  id: 1,
  name: 'Skyline FM',
  genre: 'Pop and Talk',
  frequency: '98.5 FM',
  location: 'Chennai',
  tagline: 'Your city soundtrack, live all day.',
  listeners: 12482,
  accent: 'linear-gradient(135deg, #9bf6ff 0%, #48cae4 100%)',
};

export const songs: Song[] = [
  {
    id: 1,
    title: 'Skyline Intro Mix',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 2,
    title: 'City Beat Drive',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 3,
    title: 'Night Vibes Session',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

export const schedule: ShowSlot[] = [
  {
    id: 1,
    title: 'Sunrise Energy',
    host: 'RJ Kavya',
    startTime: '06:00',
    endTime: '10:00',
    segment: 'Morning',
    status: 'Upcoming',
    summary: 'Motivation, quick headlines, and upbeat hits for your commute.',
  },
  {
    id: 2,
    title: 'Midday Mix Live',
    host: 'RJ Vishal',
    startTime: '10:00',
    endTime: '14:00',
    segment: 'Afternoon',
    status: 'Live',
    summary: 'Live shoutouts, listener dedications, and nonstop pop favorites.',
  },
  {
    id: 3,
    title: 'Drive Time Stories',
    host: 'RJ Sara',
    startTime: '17:00',
    endTime: '20:00',
    segment: 'Evening',
    status: 'Upcoming',
    summary: 'Traffic pulses, local stories, and chart-topping requests.',
  },
];

export const scheduleFilters: ScheduleFilter[] = [
  'All',
  'Live',
  'Morning',
  'Afternoon',
  'Evening',
];