import { Component, OnInit, inject, signal, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonComponent } from '../../../../shared/ui';
import { GamesService } from '../../../../core/services/games.service';
import { Game } from '../../../../core/models/game.model';

@Component({
  selector: 'app-games-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ConfirmDialogModule,
    ButtonComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './games-list.component.html',
  styleUrl: './games-list.component.scss',
})
export class GamesListComponent implements OnInit {
  private readonly gamesService = inject(GamesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  readonly router = inject(Router);

  readonly table = viewChild<Table>('dt');

  readonly games = this.gamesService.games;
  readonly loading = signal(false);
  readonly searchQuery = signal('');

  readonly totalGames = computed(() => this.games().length);
  readonly singlePlayerGames = computed(() =>
    this.games().filter(game => game.max_players === 1).length
  );
  readonly multiplayerGames = computed(() =>
    this.games().filter(game => game.max_players > 1).length
  );
  readonly filteredGames = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.games();
    return this.games().filter(g => {
      const name = g.nom?.toString()?.toLowerCase() ?? '';
      const desc = g.description?.toString()?.toLowerCase() ?? '';
      return name.includes(q) || desc.includes(q);
    });
  });

  ngOnInit(): void {
    this.loadGames();
  }

  private loadGames(): void {
    this.loading.set(true);
    this.gamesService.getAllGames().subscribe({
      next: () => this.loading.set(false),
      error: (error) => {
        console.error('Erreur lors du chargement des jeux:', error);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la liste des jeux' });
        this.loading.set(false);
      }
    });
  }

  refreshGames(): void {
    this.gamesService.clearCache();
    this.loadGames();
  }

  applyFilterGlobal(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.searchQuery.set(value);
    this.table()?.filterGlobal?.(value, 'contains');
  }

  confirmDelete(game: Game): void {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer le jeu "${game.nom}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      accept: () => this.deleteGame(game.id.toString())
    });
  }

  private deleteGame(id: string): void {
    this.gamesService.deleteGame(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Le jeu a été supprimé avec succès' });
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer le jeu' });
      }
    });
  }
}
