// src/app/features/games/pages/games-list/games-list.component.ts


import { Component, OnInit, inject, signal, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonComponent, CardComponent, TagComponent } from '../../../../shared/ui';
import { GamesService } from '../../../../core/services/games.service';
import { Game } from '../../../../core/models/game.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-games-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ConfirmDialogModule,
    LoaderComponent,
    ButtonComponent,
    CardComponent,
    TagComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1><i class="pi pi-play"></i> Gestion des Jeux</h1>
        <div class="page-actions">
          <ui-button
            icon="pi pi-plus"
            label="Nouveau jeu"
            variant="primary"
            (clicked)="router.navigate(['/games/new'])">
          </ui-button>

          <ui-button
            icon="pi pi-refresh"
            label="Actualiser"
            variant="secondary"
            [loading]="loading()"
            (clicked)="refreshGames()">
          </ui-button>
        </div>
      </div>

      <!-- Statistiques rapides -->
      @if (!loading()) {
        <div class="stats-cards">
          <ui-card>
            <div class="stat-content">
              <div class="stat-icon">
                <i class="pi pi-play"></i>
              </div>
              <div class="stat-details">
                <h3>{{ totalGames() }}</h3>
                <p>Jeux disponibles</p>
              </div>
            </div>
          </ui-card>

          <ui-card>
            <div class="stat-content">
              <div class="stat-icon single-player">
                <i class="pi pi-user"></i>
              </div>
              <div class="stat-details">
                <h3>{{ singlePlayerGames() }}</h3>
                <p>Jeux solo</p>
              </div>
            </div>
          </ui-card>

          <ui-card>
            <div class="stat-content">
              <div class="stat-icon multiplayer">
                <i class="pi pi-users"></i>
              </div>
              <div class="stat-details">
                <h3>{{ multiplayerGames() }}</h3>
                <p>Jeux multijoueurs</p>
              </div>
            </div>
          </ui-card>
        </div>
      }
      
      <div class="page-content">
        @if (loading()) {
          <app-loader size="large">Chargement des jeux...</app-loader>
        } @else {
          <div class="search-container">
            <div class="search-input-wrapper">
              <i class="pi pi-search search-icon"></i>
              <input
                type="text"
                class="search-input"
                placeholder="Rechercher un jeu..."
                (input)="applyFilterGlobal($event)" />
            </div>
            <div class="view-toggle">
              <ui-button
                icon="pi pi-list"
                [variant]="viewMode() === 'table' ? 'primary' : 'secondary'"
                tooltip="Vue tableau"
                (clicked)="setViewMode('table')">
              </ui-button>
              <ui-button
                icon="pi pi-th-large"
                [variant]="viewMode() === 'grid' ? 'primary' : 'secondary'"
                tooltip="Vue grille"
                (clicked)="setViewMode('grid')">
              </ui-button>
            </div>
          </div>

          @if (viewMode() === 'table') {
            <!-- Vue tableau -->
            <p-table 
              #dt 
              [value]="filteredGames()" 
              [rows]="10" 
              [paginator]="true" 
              [globalFilterFields]="['nom', 'description']"
              [tableStyle]="{'min-width': '60rem'}"
              [rowHover]="true" 
              dataKey="id"
              [showCurrentPageReport]="true" 
              currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} jeux"
              [loading]="loading()"
              styleClass="games-table">
              
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="nom" style="width: 30%">
                    Nom <p-sortIcon field="nom"></p-sortIcon>
                  </th>
                  <th pSortableColumn="description" style="width: 35%">
                    Description <p-sortIcon field="description"></p-sortIcon>
                  </th>
                  <th pSortableColumn="min_players" style="width: 12%">
                    Min <p-sortIcon field="min_players"></p-sortIcon>
                  </th>
                  <th pSortableColumn="max_players" style="width: 12%">
                    Max <p-sortIcon field="max_players"></p-sortIcon>
                  </th>
                  <th style="width: 11%">Actions</th>
                </tr>
              </ng-template>
              
              <ng-template pTemplate="body" let-game>
                <tr>
                  <td>
                    <div class="game-name-cell">
                      <div class="game-icon">
                        <i class="pi pi-play"></i>
                      </div>
                      <span class="game-name">{{ game.nom }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="game-description">
                      {{ game.description || 'Aucune description' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <ui-tag
                      [label]="game.min_players.toString()"
                      variant="info"
                      icon="pi pi-user">
                    </ui-tag>
                  </td>
                  <td class="text-center">
                    <ui-tag
                      [label]="game.max_players.toString()"
                      variant="success"
                      icon="pi pi-users">
                    </ui-tag>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <ui-button
                        icon="pi pi-pencil"
                        variant="ghost"
                        size="sm"
                        [rounded]="true"
                        tooltip="Éditer"
                        (clicked)="router.navigate(['/games/edit', game.id])">
                      </ui-button>

                      <ui-button
                        icon="pi pi-trash"
                        variant="ghost-danger"
                        size="sm"
                        [rounded]="true"
                        tooltip="Supprimer"
                        (clicked)="confirmDelete(game)">
                      </ui-button>
                    </div>
                  </td>
                </tr>
              </ng-template>
              
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="5" class="empty-message">
                    <div class="empty-state">
                      <i class="pi pi-play empty-icon"></i>
                      <h3>Aucun jeu trouvé</h3>
                      <p>Aucun jeu ne correspond à vos critères de recherche.</p>
                      <ui-button
                        label="Créer un jeu"
                        icon="pi pi-plus"
                        variant="primary"
                        (clicked)="router.navigate(['/games/new'])">
                      </ui-button>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          } @else {
            <!-- Vue grille -->
            <div class="games-grid">
              @for (game of filteredGames(); track game.id) {
                <ui-card styleClass="game-card">
                  <div card-header class="game-card-header">
                    <h3>{{ game.nom }}</h3>
                  </div>

                  <p class="game-card-description">
                    {{ game.description || 'Aucune description disponible' }}
                  </p>

                  <div class="game-card-stats">
                    <div class="card-stat-item">
                      @if (game.max_players == 1) {
                        <i class="pi pi-user"></i><span>&nbsp;Solo ({{ game.min_players }})</span>
                      } @else {
                        <i class="pi pi-users"></i><span>&nbsp;Multijoueurs ({{ game.min_players }}-{{ game.max_players }})</span>
                      }
                    </div>
                    <div class="card-stat-item">
                      <i class="pi pi-ticket"></i>
                      <span>&nbsp;{{ game.ticket_cost }} ticket(s)</span>
                    </div>
                  </div>

                  <div card-footer class="game-card-actions">
                    <ui-button
                      label="Éditer"
                      icon="pi pi-pencil"
                      variant="secondary"
                      size="sm"
                      (clicked)="router.navigate(['/games/edit', game.id])">
                    </ui-button>

                    <ui-button
                      icon="pi pi-trash"
                      variant="danger"
                      size="sm"
                      (clicked)="confirmDelete(game)">
                    </ui-button>
                  </div>
                </ui-card>
              }
            </div>
          }
        }
      </div>
    </div>
    
    <p-confirmDialog 
      header="Confirmation de suppression"
      icon="pi pi-exclamation-triangle">
    </p-confirmDialog>
  `,
  styles: [`
    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-6);

      .stat-content {
        display: flex;
        align-items: center;
        gap: var(--space-4);

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background: var(--blue-60);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.375rem;
          flex-shrink: 0;

          &.single-player { background: var(--green-50); }
          &.multiplayer   { background: var(--blue-40); }
        }

        .stat-details {
          h3 {
            margin: 0;
            font-size: var(--text-2xl);
            font-weight: 700;
            color: var(--gray-80);
            font-family: var(--font-mono);
          }

          p {
            margin: 0;
            color: var(--text-secondary);
            font-size: var(--text-sm);
          }
        }
      }
    }

    .search-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-4);

      .search-input-wrapper {
        position: relative;
        flex: 1;
        max-width: 400px;

        .search-icon {
          position: absolute;
          left: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
          font-size: var(--text-sm);
        }

        .search-input {
          width: 100%;
          height: 36px;
          padding: 0 var(--space-3) 0 var(--space-9);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          background: var(--white);
          font-size: var(--text-sm);
          color: var(--gray-80);
          font-family: var(--font-sans);
          outline: none;
          transition: border-color var(--duration-fast) var(--ease-default);

          &:focus {
            border-color: var(--blue-60);
            box-shadow: 0 0 0 2px rgba(0, 98, 254, 0.15);
          }

          &::placeholder { color: var(--text-secondary); }
        }
      }

      .view-toggle {
        display: flex;
        gap: var(--space-1);
      }
    }

    .game-name-cell {
      display: flex;
      align-items: center;
      gap: var(--space-3);

      .game-icon {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-md);
        background: var(--blue-60);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: var(--text-sm);
        flex-shrink: 0;
      }

      .game-name {
        font-weight: 600;
        color: var(--gray-80);
      }
    }

    .game-description {
      color: var(--text-secondary);
      font-size: var(--text-sm);
      line-height: 1.4;
    }

    .action-buttons {
      display: flex;
      gap: var(--space-1);
    }

    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-6);

      .game-card-header {
        h3 {
          margin: 0;
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--gray-80);
        }
      }

      .game-card-description {
        color: var(--text-secondary);
        font-size: var(--text-sm);
        line-height: 1.5;
        margin-bottom: var(--space-4);
        min-height: 3rem;
      }

      .game-card-stats {
        display: flex;
        justify-content: space-around;
        margin-bottom: var(--space-4);

        .card-stat-item {
          display: flex;
          align-items: center;
          font-size: var(--text-sm);
          color: var(--text-secondary);
          font-weight: 600;

          i { color: var(--blue-60); }
        }
      }

      .game-card-actions {
        display: flex;
        gap: var(--space-2);
        justify-content: space-between;
        width: 100%;
      }
    }

    .empty-state {
      text-align: center;
      padding: var(--space-12) var(--space-4);

      .empty-icon {
        font-size: 3rem;
        color: var(--gray-40);
        margin-bottom: var(--space-4);
      }

      h3 {
        margin: 0 0 var(--space-2) 0;
        color: var(--gray-80);
      }

      p {
        margin: 0 0 var(--space-4) 0;
        color: var(--text-secondary);
      }
    }

    @media (max-width: 768px) {
      .stats-cards { grid-template-columns: 1fr; }
      .games-grid  { grid-template-columns: 1fr; }

      .search-container {
        flex-direction: column;
        gap: var(--space-3);

        .search-input-wrapper { max-width: none; }
      }
    }
  `]
})
export class GamesListComponent implements OnInit {
  // Services injectés
  private readonly gamesService = inject(GamesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  readonly router = inject(Router);

  // ViewChild pour la table
  readonly table = viewChild<Table>('dt');
  
  // Signals pour l'état du composant
  readonly games = this.gamesService.games;
  readonly loading = signal(false);
  readonly viewMode = signal<'table' | 'grid'>('table');
  readonly searchQuery = signal('');
  
  // Computed values pour les statistiques
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

  /**
   * Charge la liste des jeux
   */
  private loadGames(): void {
    this.loading.set(true);
    
    this.gamesService.getAllGames().subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des jeux:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger la liste des jeux'
        });
        this.loading.set(false);
      }
    });
  }

  /**
   * Actualise la liste des jeux
   */
  refreshGames(): void {
    this.gamesService.clearCache();
    this.loadGames();
  }

  /**
   * Change le mode d'affichage
   */
  setViewMode(mode: 'table' | 'grid'): void {
    this.viewMode.set(mode);
  }

  /**
   * Applique un filtre global sur la table
   */
  applyFilterGlobal(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value ?? '';
    // Keep the table's builtin filter for table view (so paginator + sort behave normally)
    // and keep an independent search signal so grid view can rely on it as well.
    this.searchQuery.set(value);
    this.table()?.filterGlobal?.(value, 'contains');
  }

  /**
   * Affiche la boîte de dialogue de confirmation avant suppression
   */
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

  /**
   * Supprime un jeu après confirmation
   */
  private deleteGame(id: string): void {
    this.gamesService.deleteGame(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Le jeu a été supprimé avec succès'
        });
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de supprimer le jeu'
        });
      }
    });
  }
}