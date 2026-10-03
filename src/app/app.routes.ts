import { Routes } from '@angular/router';
import { MeetingList } from './components/meeting-list/meeting-list';
import { MeetingDetail } from './components/meeting-detail/meeting-detail';

export const routes: Routes = [
  { path: '', component: MeetingList, title: 'Meetings' },
  { path: 'meetings/:slug', component: MeetingDetail },
  { path: '**', redirectTo: '' },
];
