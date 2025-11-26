// src/app/features/games/pages/games-list/games-list.component.ts


import { Component, OnInit, inject, signal, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ConfirmationService, MessageService } from 'primeng/api';
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
    ButtonModule,
    RippleModule,
    InputTextModule,
    ConfirmDialogModule,
    TooltipModule,
    TagModule,
    CardModule,
    LoaderComponent
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1><i class="pi pi-play"></i> Gestion des Jeux</h1>
        <div class="page-actions">
          <p-button 
            icon="pi pi-plus" 
            label="Nouveau jeu" 
            severity="success"
            routerLink="/games/new">
          </p-button>
          
          <p-button 
            icon="pi pi-refresh" 
            label="Actualiser" 
            [loading]="loading()"
            (click)="refreshGames()"
            severity="secondary"
            outlined>
          </p-button>
        </div>
      </div>

      <!-- Statistiques rapides -->
      <div class="stats-cards" *ngIf="!loading()">
        <p-card styleClass="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <i class="pi pi-play"></i>
            </div>
            <div class="stat-details">
              <h3>{{ totalGames() }}</h3>
              <p>Jeux disponibles</p>
            </div>
          </div>
        </p-card>
        
        <p-card styleClass="stat-card">
          <div class="stat-content">
            <div class="stat-icon single-player">
              <i class="pi pi-user"></i>
            </div>
            <div class="stat-details">
              <h3>{{ singlePlayerGames() }}</h3>
              <p>Jeux solo</p>
            </div>
          </div>
        </p-card>
        
        <p-card styleClass="stat-card">
          <div class="stat-content">
            <div class="stat-icon multiplayer">
              <i class="pi pi-users"></i>
            </div>
            <div class="stat-details">
              <h3>{{ multiplayerGames() }}</h3>
              <p>Jeux multijoueurs</p>
            </div>
          </div>
        </p-card>
      </div>
      
      <div class="page-content">
        @if (loading()) {
          <app-loader size="large">Chargement des jeux...</app-loader>
        } @else {
          <div class="search-container">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input 
                pInputText 
                type="text" 
                placeholder="Rechercher un jeu..." 
                (input)="applyFilterGlobal($event)" />
            </span>
            <div class="view-toggle">
              <p-button 
                icon="pi pi-list" 
                [severity]="viewMode() === 'table' ? 'primary' : 'secondary'"
                [outlined]="viewMode() !== 'table'"
                (click)="setViewMode('table')"
                pTooltip="Vue tableau">
              </p-button>
              <p-button 
                icon="pi pi-th-large" 
                [severity]="viewMode() === 'grid' ? 'primary' : 'secondary'"
                [outlined]="viewMode() !== 'grid'"
                (click)="setViewMode('grid')"
                pTooltip="Vue grille">
              </p-button>
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
                  <!-- <th style="width: 11%">Actions</th> -->
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
                    <p-tag 
                      [value]="game.min_players.toString()" 
                      severity="info"
                      icon="pi pi-user">
                    </p-tag>
                  </td>
                  <td class="text-center">
                    <p-tag 
                      [value]="game.max_players.toString()" 
                      severity="success"
                      icon="pi pi-users">
                    </p-tag>
                  </td>
                  <!-- <td>
                    <div class="action-buttons">
                      <p-button 
                        icon="pi pi-pencil" 
                        [rounded]="true"
                        text
                        severity="success"
                        size="small"
                        pTooltip="Éditer" 
                        tooltipPosition="top"
                        [routerLink]="['/games/edit', game.id]">
                      </p-button>
                      
                      <p-button 
                        icon="pi pi-trash" 
                        [rounded]="true"
                        text
                        severity="danger"
                        size="small"
                        pTooltip="Supprimer" 
                        tooltipPosition="top"
                        (click)="confirmDelete(game)">
                      </p-button>
                    </div>
                  </td> -->
                </tr>
              </ng-template>
              
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="5" class="empty-message">
                    <div class="empty-state">
                      <i class="pi pi-play empty-icon"></i>
                      <h3>Aucun jeu trouvé</h3>
                      <p>Aucun jeu ne correspond à vos critères de recherche.</p>
                      <p-button 
                        label="Créer un jeu" 
                        icon="pi pi-plus"
                        routerLink="/games/new">
                      </p-button>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          } @else {
            <!-- Vue grille -->
            <div class="games-grid">
              @for (game of filteredGames(); track game.id) {
                <p-card styleClass="game-card">
                  <ng-template pTemplate="header">
                    <div class="game-card-header">
                      <h3>{{ game.nom }}</h3>
                    </div>
                  </ng-template>
                  
                  <p class="game-card-description">
                    {{ game.description || 'Aucune description disponible' }}
                  </p>
                  
                  <div class="game-card-stats">
                    <div class="stat-item">
                      @if (game.max_players == 1) {
                        <i class="pi pi-user"></i><span style="font-weight: 700;">&nbsp;Solo ({{ game.min_players }})</span>
                      } @else {
                        <i class="pi pi-users"></i><span style="font-weight: 700;">&nbsp;Multijoueurs ({{ game.min_players }}-{{ game.max_players }})</span>
                      }
                    </div>
                    <div class="stat-item">
                      <i class="pi pi-ticket"></i>
                      <span>&nbsp;{{ game.ticket_cost }} ticket(s)</span>
                    </div>
                  </div>
                  
                  <ng-template pTemplate="footer">
                    <div class="game-card-actions">
                      <p-button 
                        label="Éditer" 
                        icon="pi pi-pencil"
                        severity="success"
                        outlined
                        size="small"
                        [routerLink]="['/games/edit', game.id]">
                      </p-button>
                      
                      <p-button 
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        size="small"
                        (click)="confirmDelete(game)">
                      </p-button>
                    </div>
                  </ng-template>
                </p-card>
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
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);
      
      h1 {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin: 0;
        font-size: var(--text-2xl);
        font-weight: 700;
        color: var(--text-color);
        
        i {
          color: var(--primary-500);
        }
      }
      
      .page-actions {
        display: flex;
        gap: var(--space-3);
      }
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-6);
      
      .stat-card {
        .stat-content {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          
          .stat-icon {
            width: 50px;
            height: 50px;
            border-radius: var(--radius-lg);
            background: var(--gradient-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            
            &.single-player {
              background: var(--gradient-success);
            }
            
            &.multiplayer {
              background: var(--gradient-secondary);
            }
          }
          
          .stat-details {
            h3 {
              margin: 0;
              font-size: var(--text-2xl);
              font-weight: 700;
              color: var(--text-color);
            }
            
            p {
              margin: 0;
              color: var(--text-color-secondary);
              font-size: var(--text-sm);
            }
          }
        }
      }
    }
    
    .search-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-4);
      
      .p-input-icon-left {
        flex: 1;
        max-width: 400px;
        
        input {
          width: 100%;
          padding-left: var(--space-10);
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
        background: var(--gradient-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: var(--text-sm);
      }
      
      .game-name {
        font-weight: 600;
        color: var(--text-color);
      }
    }
    
    .game-description {
      color: var(--text-color-secondary);
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
      
      .game-card {
        transition: all var(--transition-normal);
        
        &:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }
        
        .game-card-header {
          text-align: center;
          padding: var(--space-4);
          width: 100%;
          height: 60px;
          border-radius: var(--radius-full);
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin: 0 auto var(--space-3) auto;
          
          h3 {
            margin: 0;
            font-size: var(--text-lg);
            font-weight: 600;
            color: var(--text-color);
          }
        }
        
        .game-card-description {
          color: var(--text-color-secondary);
          font-size: var(--text-sm);
          line-height: 1.5;
          margin-bottom: var(--space-4);
          min-height: 3rem;
        }
        
        .game-card-stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: var(--space-4);
          
          .stat-item {
            display: flex;
            align-items: center;
            gap: var(--space-1);
            font-size: var(--text-sm);
            color: var(--text-color-secondary);
            
            i {
              color: var(--primary-500);
            }
          }
        }
        
        .game-card-actions {
          display: flex;
          gap: var(--space-2);
          justify-content: space-between;
        }
      }
    }
    
    .empty-state {
      text-align: center;
      padding: var(--space-12) var(--space-4);
      
      .empty-icon {
        font-size: 3rem;
        color: var(--gray-400);
        margin-bottom: var(--space-4);
      }
      
      h3 {
        margin: 0 0 var(--space-2) 0;
        color: var(--text-color);
      }
      
      p {
        margin: 0 0 var(--space-4) 0;
        color: var(--text-color-secondary);
      }
    }
    
    .mr-1 { margin-right: 0.25rem; }
    .mr-2 { margin-right: 0.5rem; }
    .ml-1 { margin-left: 0.25rem; }
    
    .sort-icon {
      font-size: 0.75rem;
      color: var(--text-color-secondary);
    }
    
    :host ::ng-deep {
      .games-table {
        .p-datatable-thead > tr > th {
          background: var(--surface-ground);
          border-bottom: 2px solid var(--surface-border);
          font-weight: 600;
          color: var(--text-color);
        }
        
        .p-datatable-tbody > tr {
          transition: all var(--transition-fast);
          
          &:hover {
            background: var(--surface-hover);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
          }
        }
      }
      
      .stat-card .p-card-body {
        padding: var(--space-4);
      }
      
      .game-card .p-card-body {
        padding: var(--space-4);
      }
    }
    
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-4);
      }
      
      .stats-cards {
        grid-template-columns: 1fr;
      }
      
      .search-container {
        flex-direction: column;
        gap: var(--space-3);
        
        .p-input-icon-left {
          max-width: none;
        }
      }
      
      .games-grid {
        grid-template-columns: 1fr;
      }
      
      .p-button.p-button-rounded {
        width: 2rem;
        height: 2rem;
        padding: 0;
        
        i {
          font-size: 0.875rem;
        }
      }
      
      .p-button.p-button-text:not(:disabled):hover {
        background-color: rgba(0, 0, 0, 0.04);
      }
      
      .p-button.p-button-text.p-button-success:not(:disabled):hover {
        background-color: rgba(76, 175, 80, 0.04);
      }
      
      .p-button.p-button-text.p-button-danger:not(:disabled):hover {
        background-color: rgba(244, 67, 54, 0.04);
      }
    }
  `]
})
export class GamesListComponent implements OnInit {
  // Services injectés
  private readonly gamesService = inject(GamesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

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