import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { forkJoin } from 'rxjs';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { GamesService } from '../../../../core/services/games.service';
import { UsersService } from '../../../../core/services/users.service';
import { PartiesService } from '../../../../core/services/parties.service';

interface DashboardCard {
  title: string;
  icon: string;
  value: number;
  link: string;
  linkText: string;
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly arcadesService = inject(ArcadesService);
  private readonly gamesService = inject(GamesService);
  private readonly usersService = inject(UsersService);
  private readonly partiesService = inject(PartiesService);

  readonly isLoading = signal(true);
  readonly dashboardCards = signal<DashboardCard[]>([]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.isLoading.set(true);

    forkJoin({
      users: this.usersService.getAllUsers(),
      machines: this.arcadesService.getAllArcades(),
      games: this.gamesService.getAllGames(),
      activeParties: this.partiesService.getActiveParties()
    }).subscribe({
      next: (data) => {
        this.dashboardCards.set([
          {
            title: 'Utilisateurs',
            icon: 'pi pi-users',
            value: data.users.length,
            link: '/users',
            linkText: 'Voir les utilisateurs',
            color: 'var(--primary-color)'
          },
          {
            title: "Bornes d'arcade",
            icon: 'pi pi-desktop',
            value: data.machines.length,
            link: '/arcade-machines',
            linkText: 'Gérer les bornes',
            color: 'var(--green-500)'
          },
          {
            title: 'Jeux',
            icon: 'pi pi-play',
            value: data.games.length,
            link: '/games',
            linkText: 'Voir les jeux',
            color: 'var(--yellow-500)'
          },
          {
            title: 'Parties en cours',
            icon: 'pi pi-ticket',
            value: data.activeParties.length,
            link: '/parties',
            linkText: 'Voir les parties',
            color: 'var(--red-500)'
          }
        ]);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
