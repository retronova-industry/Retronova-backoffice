// src/app/features/dashboard/pages/home/home.component.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { GamesService } from '../../../../core/services/games.service';
import { UsersService } from '../../../../core/services/users.service';
import { PartiesService } from '../../../../core/services/parties.service';

interface DashboardMetric {
  value: number | string;
  label: string;
  link: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly arcadesService = inject(ArcadesService);
  private readonly gamesService   = inject(GamesService);
  private readonly usersService   = inject(UsersService);
  private readonly partiesService = inject(PartiesService);

  readonly isLoading          = signal(true);
  readonly metrics            = signal<DashboardMetric[]>([]);
  readonly activePartiesCount = signal(0);
  readonly activeMachinesCount = signal(0);
  readonly totalMachinesCount  = signal(0);

  readonly today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.isLoading.set(true);

    forkJoin({
      users:         this.usersService.getAllUsers(),
      machines:      this.arcadesService.getAllArcades(),
      games:         this.gamesService.getAllGames(),
      activeParties: this.partiesService.getActiveParties(),
    }).subscribe({
      next: ({ users, machines, games, activeParties }) => {
        // Calcul des bornes actives (celles qui ont au moins une partie en cours)
        const activeMachineIds = new Set(activeParties.map((p: any) => p.machine_id));

        this.activePartiesCount.set(activeParties.length);
        this.activeMachinesCount.set(activeMachineIds.size);
        this.totalMachinesCount.set(machines.length);

        this.metrics.set([
          { value: users.length,         label: 'Utilisateurs',    link: '/users' },
          { value: activeParties.length, label: 'Parties actives', link: '/parties' },
          { value: games.length,         label: 'Jeux',            link: '/games' },
          { value: `${activeMachineIds.size}/${machines.length}`, label: 'Bornes actives', link: '/arcade-machines' },
        ]);

        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
