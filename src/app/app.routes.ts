import { type Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Arun Sudi — Portfolio',
    loadComponent: () => import('@features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'projects/:slug',
    title: 'Project — Arun Sudi',
    loadComponent: () =>
      import('@features/project-detail/project-detail.component').then(
        (m) => m.ProjectDetailComponent,
      ),
  },
  {
    path: 'news',
    title: "What's Buzzing — Arun Sudi",
    loadComponent: () =>
      import('@features/news/news.component').then((m) => m.NewsComponent),
  },
  { path: '**', redirectTo: '' },
];
