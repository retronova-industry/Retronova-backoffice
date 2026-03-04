// src/app/features/arcade-machines/pages/machines-list/machines-list.component.ts

import { Component, OnInit, inject, signal, computed, viewChild, effect } from '@angular/core';
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
import { BadgeModule } from 'primeng/badge';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { GamesService } from '../../../../core/services/games.service';
import { Arcade, GameOnArcade } from '../../../../core/models/arcade.model';
import { Game } from '../../../../core/models/game.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { StatsCardComponent, StatsData } from '../../../../shared/components/stats-card/stats-card.component';
import { forkJoin } from 'rxjs';

interface EnrichedArcade extends Arcade {
  readonly games_count: number;
  readonly status: MachineStatus;
  readonly game1_name?: string;
  readonly game2_name?: string;
  readonly utilization_rate: number;
  readonly has_both_slots: boolean;
  readonly active_slots: number;
}

type MachineStatus = 'active' | 'inactive' | 'maintenance' | 'partial';
type ViewMode = 'table' | 'grid';

/**
 * Strategy Pattern pour les différents modes d'affichage
 */
abstract class ViewModeStrategy {
  abstract render(machines: EnrichedArcade[]): any;
}

class TableViewStrategy extends ViewModeStrategy {
  render(machines: EnrichedArcade[]) {
    return machines;
  }
}

class GridViewStrategy extends ViewModeStrategy {
  render(machines: EnrichedArcade[]) {
    return machines.map(machine => ({
      ...machine,
      displayTitle: machine.nom,
      displaySubtitle: machine.localisation || 'Localisation non définie'
    }));
  }
}

/**
 * Factory Pattern pour les stratégies de vue
 */
class ViewStrategyFactory {
  static create(mode: ViewMode): ViewModeStrategy {
    switch (mode) {
      case 'table':
        return new TableViewStrategy();
      case 'grid':
        return new GridViewStrategy();
      default:
        return new TableViewStrategy();
    }
  }
}

/**
 * Service Pattern pour les calculs de statistiques
 */
class MachineStatsCalculator {
  static calculateStats(machines: EnrichedArcade[]): StatsData[] {
    const total = machines.length;
    const active = machines.filter(m => m.status === 'active').length;
    const configured = machines.filter(m => m.games_count > 0).length;
    const fullyConfigured = machines.filter(m => m.has_both_slots).length;
    const locations = new Set(machines.map(m => m.localisation).filter(Boolean)).size;

    return [
      {
        title: 'Bornes totales',
        value: total,
        icon: 'pi-desktop',
        color: 'primary',
        trend: { value: 5, direction: 'up', period: 'ce mois' }
      },
      {
        title: 'Bornes actives',
        value: active,
        icon: 'pi-check-circle',
        color: 'success',
        trend: { value: 12, direction: 'up', period: 'cette semaine' }
      },
      {
        title: 'Entièrement configurées',
        value: fullyConfigured,
        icon: 'pi-cog',
        color: 'info',
        subtitle: `${Math.round((fullyConfigured / total) * 100)}% du total`
      },
      {
        title: 'Emplacements',
        value: locations,
        icon: 'pi-map-marker',
        color: 'warning',
        subtitle: 'Sites uniques'
      }
    ];
  }
}

@Component({
  selector: 'app-machines-list',
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
    BadgeModule,
    LoaderComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div class="page-title-section">
          <h1 class="page-title">
            <i class="pi pi-desktop neon-glow"></i>
            Bornes d'Arcade
          </h1>
          <p class="page-subtitle">
            Gestion et monitoring de vos bornes d'arcade
          </p>
        </div>
        <div class="page-actions">
          <button
            pButton
            pRipple
            icon="pi pi-plus"
            label="Nouvelle borne"
            severity="success"
            class="gaming-button"
            routerLink="/arcade-machines/new">
          </button>

          <button
            pButton
            pRipple
            icon="pi pi-refresh"
            label="Actualiser"
            [loading]="loading()"
            (click)="refreshMachines()"
            severity="secondary"
            outlined>
          </button>
        </div>
      </div>

      <!-- Cartes de statistiques -->
      <!-- @if (!loading()) {
        <div class="stats-section stagger-fade-in">
          @for (stat of machineStats(); track stat.title) {
            <app-stats-card
              [data]="stat"
              [clickable]="true"
              [animated]="true"
              [gamingStyle]="true"
              (cardClick)="handleStatClick($event)">
            </app-stats-card>
          }
        </div>
      } -->

      <div class="page-content">
        @if (loading()) {
          <app-loader size="large">
            <div class="loading-content">
              <i class="pi pi-spin pi-cog loading-icon"></i>
              <span>Chargement des bornes d'arcade...</span>
            </div>
          </app-loader>
        } @else {
          <div class="controls-bar">
            <div class="search-container">
              <span class="p-input-icon-left search-wrapper">
                <i class="pi pi-search search-icon"></i>
                <input
                  pInputText
                  type="text"
                  placeholder="Rechercher une borne..."
                  (input)="handleGlobalFilter($event)"
                  class="search-input gaming-input" />
              </span>
              <div class="search-results">
                <i class="pi pi-filter-fill"></i>
                {{ filteredCount() }} machine(s) trouvée(s)
              </div>
            </div>

            <div class="view-controls">
              <div class="view-toggle">
                <button
                  pButton
                  pRipple
                  icon="pi pi-list"
                  [severity]="viewMode() === 'table' ? 'primary' : 'secondary'"
                  [outlined]="viewMode() !== 'table'"
                  (click)="setViewMode('table')"
                  pTooltip="Vue tableau"
                  class="view-btn">
                </button>
                <button
                  pButton
                  pRipple
                  icon="pi pi-th-large"
                  [severity]="viewMode() === 'grid' ? 'primary' : 'secondary'"
                  [outlined]="viewMode() !== 'grid'"
                  (click)="setViewMode('grid')"
                  pTooltip="Vue grille"
                  class="view-btn">
                </button>
              </div>
            </div>
          </div>

          @if (viewMode() === 'table') {
            <!-- Vue tableau améliorée -->
            <div class="table-container animate-scale-in">
              <p-table
                #dt
                [value]="displayedMachines()"
                [rows]="itemsPerPage()"
                [paginator]="true"
                [globalFilterFields]="globalFilterFields"
                [tableStyle]="{'min-width': '75rem'}"
                [rowHover]="true"
                dataKey="id"
                [showCurrentPageReport]="true"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} bornes"
                [loading]="loading()"
                styleClass="machines-table gaming-table">

                <ng-template pTemplate="header">
                  <tr>
                    <th pSortableColumn="nom" style="width: 25%">
                      <div class="header-content">
                        <i class="pi pi-desktop"></i>
                        Nom <p-sortIcon field="nom"></p-sortIcon>
                      </div>
                    </th>
                    <th pSortableColumn="localisation" style="width: 20%">
                      <div class="header-content">
                        <i class="pi pi-map-marker"></i>
                        Localisation <p-sortIcon field="localisation"></p-sortIcon>
                      </div>
                    </th>
                    <th style="width: 25%">
                      <div class="header-content">
                        <i class="pi pi-gamepad"></i>
                        Configuration Jeux
                      </div>
                    </th>
                    <th pSortableColumn="status" style="width: 15%">
                      <div class="header-content">
                        <i class="pi pi-circle"></i>
                        Statut <p-sortIcon field="status"></p-sortIcon>
                      </div>
                    </th>
                    <th style="width: 15%">
                      <div class="header-content">
                        <i class="pi pi-cog"></i>
                        Actions
                      </div>
                    </th>
                  </tr>
                </ng-template>

                <ng-template pTemplate="body" let-machine let-rowIndex="rowIndex">
                  <tr class="machine-row animate-fade-in-left"
                      [style.animation-delay]="(rowIndex * 0.05) + 's'">
                    <td>
                      <div class="machine-name-cell">
                        <div class="machine-icon" [class]="getMachineIconClass(machine.status)">
                          <i class="pi pi-desktop"></i>
                          @if (machine.games_count > 0) {
                            <div class="games-indicator">{{ machine.games_count }}</div>
                          }
                        </div>
                        <div class="machine-info">
                          <span class="machine-name">{{ machine.nom }}</span>
                          @if (machine.description) {
                            <span class="machine-description">{{ machine.description }}</span>
                          }
                          <!-- <div class="machine-meta"> -->
                            <!-- <span class="meta-item">
                              <i class="pi pi-calendar"></i>
                              Créée le {{ formatDate(machine.created_at) }}
                            </span> -->
                          <!-- </div> -->
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="location-cell">
                        <div class="location-main">
                          <i class="pi pi-map-marker location-icon"></i>
                          <span class="location-name">{{ machine.localisation || 'Non défini' }}</span>
                        </div>
                        @if (machine.latitude && machine.longitude) {
                          <div class="coordinates">
                            <span class="coord-label">GPS:</span>
                            <span class="coord-value">{{ machine.latitude | number:'1.4-4' }}, {{ machine.longitude | number:'1.4-4' }}</span>
                          </div>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="games-configuration">
                        @if (machine.games && machine.games.length > 0) {
                          <div class="slots-container">
                            @for (slot of [1, 2]; track slot) {
                              <div class="slot-item" [class]="getSlotClass(machine, slot)">
                                <div class="slot-header">
                                  <span class="slot-label">Slot {{ slot }}</span>
                                  <span class="slot-status" [class]="getSlotStatusClass(machine, slot)">
                                    {{ getSlotStatusLabel(machine, slot) }}
                                  </span>
                                </div>
                                @if (getGameForSlot(machine, slot); as game) {
                                  <div class="game-info">
                                    <span class="game-name">{{ game.nom }}</span>
                                    <span class="game-players">{{ game.min_players }}-{{ game.max_players }} joueurs</span>
                                  </div>
                                } @else {
                                  <div class="empty-slot">
                                    <i class="pi pi-plus-circle"></i>
                                    <span>Libre</span>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        } @else {
                          <div class="no-games-configured">
                            <i class="pi pi-exclamation-triangle"></i>
                            <span>Aucun jeu configuré</span>
                            <button
                              pButton
                              pRipple
                              icon="pi pi-plus"
                              label="Configurer"
                              size="small"
                              severity="info"
                              text
                              (click)="configureGames(machine)">
                            </button>
                          </div>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="status-cell">
                        <p-tag
                          [value]="getStatusLabel(machine.status)"
                          [severity]="getStatusSeverity(machine.status)"
                          [icon]="getStatusIcon(machine.status)"
                          styleClass="status-tag animate-pulse">
                        </p-tag>
                        @if (machine.status === 'partial') {
                          <small class="status-detail">
                            {{ machine.active_slots }}/2 slots actifs
                          </small>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <!-- <button
                          pButton
                          pRipple
                          icon="pi pi-eye"
                          [rounded]="true"
                          text
                          severity="info"
                          size="small"
                          pTooltip="Voir les détails"
                          tooltipPosition="top"
                          class="action-button hover-lift"
                          [routerLink]="['/arcade-machines/detail', machine.id]">
                        </button> -->

                        <!-- <button
                          pButton
                          pRipple
                          icon="pi pi-gamepad"
                          [rounded]="true"
                          text
                          severity="danger"
                          size="small"
                          pTooltip="Configurer les jeux"
                          tooltipPosition="top"
                          class="action-button hover-scale"
                          (click)="configureGames(machine)">
                        </button> -->

                        <!-- <button
                          pButton
                          pRipple
                          icon="pi pi-pencil"
                          [rounded]="true"
                          text
                          severity="success"
                          size="small"
                          pTooltip="Éditer"
                          tooltipPosition="top"
                          class="action-button hover-glow"
                          [routerLink]="['/arcade-machines/edit', machine.id]">
                        </button> -->

                        <button
                          pButton
                          pRipple
                          icon="pi pi-trash"
                          [rounded]="true"
                          text
                          severity="danger"
                          size="small"
                          pTooltip="Supprimer"
                          tooltipPosition="top"
                          class="action-button hover-scale"
                          (click)="confirmDelete(machine)">🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                </ng-template>

                <ng-template pTemplate="emptymessage">
                  <tr>
                    <td colspan="5" class="empty-message">
                      <div class="empty-state animate-floating">
                        <i class="pi pi-desktop empty-icon neon-glow"></i>
                        <h3>Aucune borne trouvée</h3>
                        <p>Aucune borne d'arcade ne correspond à vos critères.</p>
                        <button
                          pButton
                          pRipple
                          label="Créer une borne"
                          icon="pi pi-plus"
                          class="gaming-button"
                          routerLink="/arcade-machines/new">
                        </button>
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          } @else {
            <!-- Vue grille améliorée -->
            <div class="machines-grid animate-scale-in">
              @for (machine of displayedMachines(); track machine.id; let i = $index) {
                <div class="machine-card-container stagger-fade-in"
                     [style.animation-delay]="(i * 0.1) + 's'">
                  <p-card styleClass="machine-card gaming-card hover-lift">
                    <ng-template pTemplate="header">
                      <div class="machine-card-header" [class]="'status-' + machine.status">
                        <div class="machine-card-icon" [class]="getMachineIconClass(machine.status)">
                          <i class="pi pi-desktop"></i>
                          @if (machine.games_count > 0) {
                            <p-badge
                              [value]="machine.games_count.toString()"
                              severity="info"
                              styleClass="games-badge">
                            </p-badge>
                          }
                        </div>
                        <div class="card-title-section">
                          <h3 class="machine-card-title">{{ machine.nom }}</h3>
                          <p-tag
                            [value]="getStatusLabel(machine.status)"
                            [severity]="getStatusSeverity(machine.status)"
                            [icon]="getStatusIcon(machine.status)"
                            styleClass="status-tag-card">
                          </p-tag>
                        </div>
                      </div>
                    </ng-template>

                    <div class="machine-card-content">
                      @if (machine.description) {
                        <p class="machine-card-description">{{ machine.description }}</p>
                      }

                      <div class="machine-card-info">
                        <div class="info-item">
                          <i class="pi pi-map-marker location-icon"></i>
                          <span>{{ machine.localisation || 'Non défini' }}</span>
                        </div>

                        @if (machine.latitude && machine.longitude) {
                          <div class="info-item coordinates">
                            <i class="pi pi-compass"></i>
                            <span>{{ machine.latitude | number:'1.2-2' }}, {{ machine.longitude | number:'1.2-2' }}</span>
                          </div>
                        }

                        <!-- Configuration des slots en mode carte -->
                        <div class="card-slots-section">
                          <h4 class="slots-title">
                            <i class="pi pi-gamepad"></i>
                            Configuration des jeux
                          </h4>
                          @if (machine.games && machine.games.length > 0) {
                            <div class="card-slots-grid">
                              @for (slot of [1, 2]; track slot) {
                                <div class="card-slot-item" [class]="getSlotClass(machine, slot)">
                                  <div class="slot-number">{{ slot }}</div>
                                  @if (getGameForSlot(machine, slot); as game) {
                                    <div class="slot-game">
                                      <span class="game-name">{{ game.nom }}</span>
                                      <span class="game-meta">{{ game.min_players }}-{{ game.max_players }}p</span>
                                    </div>
                                  } @else {
                                    <div class="slot-empty">
                                      <i class="pi pi-plus"></i>
                                      <span>Libre</span>
                                    </div>
                                  }
                                </div>
                              }
                            </div>
                          } @else {
                            <div class="no-games-card">
                              <i class="pi pi-exclamation-triangle warning-icon"></i>
                              <span>Aucun jeu configuré</span>
                            </div>
                          }
                        </div>
                      </div>
                    </div>

                    <ng-template pTemplate="footer">
                      <div class="machine-card-actions">
                        <button
                          pButton
                          pRipple
                          label="Détails"
                          icon="pi pi-eye"
                          severity="info"
                          outlined
                          size="small"
                          class="card-action-btn"
                          [routerLink]="['/arcade-machines', machine.id]">
                        </button>

                        <button
                          pButton
                          pRipple
                          label="Jeux"
                          icon="pi pi-gamepad"
                          severity="danger"
                          outlined
                          size="small"
                          class="card-action-btn"
                          (click)="configureGames(machine)">
                        </button>

                        <button
                          pButton
                          pRipple
                          icon="pi pi-pencil"
                          severity="success"
                          outlined
                          size="small"
                          class="card-action-btn"
                          pTooltip="Éditer"
                          [routerLink]="['/arcade-machines/edit', machine.id]">
                        </button>
                      </div>
                    </ng-template>
                  </p-card>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>

    <p-confirmDialog
      header="Confirmation de suppression"
      icon="pi pi-exclamation-triangle"
      styleClass="gaming-confirm-dialog">
    </p-confirmDialog>
  `,
  styleUrls: ['./machines-list.component.scss']
})
export class MachinesListComponent implements OnInit {
  // Services injectés avec inject()
  private readonly arcadesService = inject(ArcadesService);
  private readonly gamesService = inject(GamesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // ViewChild avec nouvelle API
  private readonly table = viewChild<Table>('dt');

  // Signals pour l'état réactif
  protected readonly loading = signal(false);
  protected readonly machines = signal<Arcade[]>([]);
  protected readonly games = signal<Game[]>([]);
  protected readonly viewMode = signal<ViewMode>('table');
  protected readonly searchQuery = signal('');
  protected readonly itemsPerPage = signal(10);

  // Computed values avec logique métier améliorée
  protected readonly enrichedMachines = computed(() => {
    return this.machines().map(machine => this.enrichMachine(machine));
  });

  protected readonly displayedMachines = computed(() => {
    const strategy = ViewStrategyFactory.create(this.viewMode());
    return strategy.render(this.filteredMachines());
  });

  protected readonly filteredMachines = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const machines = this.enrichedMachines();

    if (!query) return machines;

    return machines.filter(machine =>
      machine.nom.toLowerCase().includes(query) ||
      machine.description?.toLowerCase().includes(query) ||
      machine.localisation?.toLowerCase().includes(query) ||
      machine.games?.some(game => game.nom.toLowerCase().includes(query))
    );
  });

  protected readonly filteredCount = computed(() => this.filteredMachines().length);

  protected readonly machineStats = computed(() =>
    MachineStatsCalculator.calculateStats(this.enrichedMachines())
  );

  // Configuration de la table
  protected readonly globalFilterFields = ['nom', 'description', 'localisation'];

  // Effect pour la recherche automatique
  private readonly searchEffect = effect(() => {
    const query = this.searchQuery();
    this.table()?.filterGlobal(query, 'contains');
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  /**
   * Charge les données initiales (machines et jeux)
   */
  private loadInitialData(): void {
    this.loading.set(true);

    forkJoin({
      machines: this.arcadesService.getAllArcades(),
      games: this.gamesService.getAllGames()
    }).subscribe({
      next: ({ machines, games }) => {
        this.machines.set(machines);
        this.games.set(games);
        this.loading.set(false);
      },
      error: (error) => this.handleError('chargement', error)
    });
  }

  /**
   * Enrichit une machine avec des métadonnées calculées (amélioré)
   */
  private enrichMachine(machine: Arcade): EnrichedArcade {
    const gamesCount = machine.games?.length || 0;
    const activeSlots = machine.games?.length || 0;
    const hasBothSlots = activeSlots === 2;
    const status = this.calculateMachineStatus(machine, activeSlots);
    const utilizationRate = this.calculateUtilizationRate(machine);

    return {
      ...machine,
      games_count: gamesCount,
      status,
      utilization_rate: utilizationRate,
      game1_name: machine.games?.find(g => g.slot_number === 1)?.nom,
      game2_name: machine.games?.find(g => g.slot_number === 2)?.nom,
      has_both_slots: hasBothSlots,
      active_slots: activeSlots
    };
  }

  /**
   * Calcule le statut d'une machine selon la logique métier améliorée
   */
  private calculateMachineStatus(machine: Arcade, activeSlots: number): MachineStatus {
    if (activeSlots === 0) {
      return 'inactive';
    } else if (activeSlots === 1) {
      return 'partial';
    } else if (activeSlots === 2) {
      return 'active';
    }

    // Logique additionnelle pour maintenance si nécessaire
    return 'active';
  }

  /**
   * Calcule le taux d'utilisation d'une machine
   */
  private calculateUtilizationRate(machine: Arcade): number {
    // Simulation - dans un vrai système, ceci viendrait des données d'usage
    return Math.random() * 100;
  }

  /**
   * Actualise les données des machines
   */
  refreshMachines(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Actualisation',
      detail: 'Actualisation des bornes d\'arcade…'
    });
    this.arcadesService.clearCache();
    this.gamesService.clearCache();
    this.loadInitialData();
  }

  /**
   * Change le mode d'affichage
   */
  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  /**
   * Gère le filtre global de recherche
   */
  protected handleGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  /**
   * Configure les jeux d'une machine
   */
  protected configureGames(machine: EnrichedArcade): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Configuration',
      detail: `Configuration des jeux pour la borne ${machine.nom}`
    });
    // TODO: Ouvrir un dialog de configuration avancé
  }

  /**
   * Gère le clic sur une carte de statistique
   */
  protected handleStatClick(statData: StatsData): void {
    // Logique de navigation ou filtrage selon la statistique cliquée
    console.log('Stat clicked:', statData);
  }

  /**
   * Confirme la suppression d'une machine
   */
  protected confirmDelete(machine: EnrichedArcade): void {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer la borne "${machine.nom}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      accept: () => this.executeDeletion(machine.id)
    });
  }

  /**
   * Exécute la suppression d'une machine
   */
  private executeDeletion(id: number): void {
    this.arcadesService.deleteArcade(id).subscribe({
      next: () => {
        this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Borne supprimée avec succès'
          });
      },
      error: (error) => this.handleError('suppression', error)
    });

  }

  /**
   * Gère les erreurs de manière centralisée
   */
  private handleError(operation: string, error: any): void {
    console.error(`Erreur lors du ${operation}:`, error);
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: `Impossible de ${operation === 'chargement' ? 'charger les données' : 'effectuer l\'opération'}`
    });
    this.loading.set(false);
  }

  // Méthodes utilitaires pour l'affichage améliorées
  protected getMachineIconClass(status: MachineStatus): string {
    return `machine-icon status-${status}`;
  }

  protected getStatusLabel(status: MachineStatus): string {
    const labels = {
      active: 'Active',
      inactive: 'Inactive',
      maintenance: 'Maintenance',
      partial: 'Partielle'
    };
    return labels[status];
  }

  protected getStatusSeverity(status: MachineStatus): 'success' | 'warning' | 'danger' | 'info' {
    const severities = {
      active: 'success' as const,
      maintenance: 'warning' as const,
      inactive: 'danger' as const,
      partial: 'info' as const
    };
    return severities[status];
  }

  protected getStatusIcon(status: MachineStatus): string {
    const icons = {
      active: 'pi-check-circle',
      maintenance: 'pi-wrench',
      inactive: 'pi-times-circle',
      partial: 'pi-info-circle'
    };
    return icons[status];
  }

  protected getSlotSeverity(slotNumber: number): 'info' | 'success' {
    return slotNumber === 1 ? 'info' : 'success';
  }

  // Nouvelles méthodes utilitaires pour la gestion des slots
  protected getGameForSlot(machine: EnrichedArcade, slotNumber: number): GameOnArcade | undefined {
    return machine.games?.find(game => game.slot_number === slotNumber);
  }

  protected getSlotClass(machine: EnrichedArcade, slotNumber: number): string {
    const hasGame = this.getGameForSlot(machine, slotNumber);
    return `slot-item ${hasGame ? 'slot-occupied' : 'slot-empty'}`;
  }

  protected getSlotStatusClass(machine: EnrichedArcade, slotNumber: number): string {
    const hasGame = this.getGameForSlot(machine, slotNumber);
    return hasGame ? 'status-occupied' : 'status-empty';
  }

  protected getSlotStatusLabel(machine: EnrichedArcade, slotNumber: number): string {
    const hasGame = this.getGameForSlot(machine, slotNumber);
    return hasGame ? 'Occupé' : 'Libre';
  }

  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
}
