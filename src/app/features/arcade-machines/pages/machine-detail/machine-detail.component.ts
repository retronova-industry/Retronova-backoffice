// src/app/features/arcade-machines/pages/machine-detail/machine-detail.component.ts

import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabview';
import { TimelineModule } from 'primeng/timeline';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonComponent, CardComponent, TagComponent } from '../../../../shared/ui';
import { forkJoin, interval, Subject, takeUntil, catchError, of } from 'rxjs';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { Arcade, QueueItem } from '../../../../core/models/arcade.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { StatsCardComponent, StatsData } from '../../../../shared/components/stats-card/stats-card.component';

interface EnrichedArcade extends Arcade {
  readonly status: MachineStatus;
  readonly utilization_rate: number;
  readonly last_activity?: Date;
  readonly total_games_played?: number;
  readonly revenue_generated?: number;
  readonly average_session_time?: number;
}

type MachineStatus = 'active' | 'inactive' | 'maintenance' | 'partial';

interface ActivityLogEntry {
  id: number;
  timestamp: Date;
  event_type: 'game_start' | 'game_end' | 'maintenance' | 'configuration' | 'error';
  description: string;
  user?: string;
  game?: string;
}

/**
 * Strategy Pattern pour les différents types de statistiques
 */
abstract class StatsCalculationStrategy {
  abstract calculateStats(machine: EnrichedArcade, queue: QueueItem[]): StatsData[];
}

class MachineStatsStrategy extends StatsCalculationStrategy {
  calculateStats(machine: EnrichedArcade, queue: QueueItem[]): StatsData[] {
    const gamesConfigured = machine.games?.length || 0;
    const queueLength = queue.length;
    const utilizationRate = machine.utilization_rate || 0;
    const revenue = machine.revenue_generated || 0;

    return [
      {
        title: 'Jeux configurés',
        value: gamesConfigured,
        icon: 'pi-gamepad',
        color: gamesConfigured === 2 ? 'success' : gamesConfigured === 1 ? 'warning' : 'danger',
        subtitle: `sur 2 slots disponibles`
      },
      {
        title: 'File d\'attente',
        value: queueLength,
        icon: 'pi-users',
        color: queueLength > 0 ? 'info' : 'primary',
        subtitle: queueLength > 0 ? 'joueurs en attente' : 'aucune attente'
      },
      {
        title: 'Taux d\'utilisation',
        value: Math.round(utilizationRate),
        icon: 'pi-chart-line',
        color: utilizationRate > 75 ? 'success' : utilizationRate > 50 ? 'warning' : 'danger',
        subtitle: '% du temps actif',
        format: 'percentage'
      },
      {
        title: 'Revenus générés',
        value: revenue,
        icon: 'pi-ticket',
        color: 'info',
        subtitle: 'tickets collectés',
        format: 'currency'
      }
    ];
  }
}

@Component({
  selector: 'app-machine-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TabViewModule,
    TimelineModule,
    ProgressBarModule,
    ChartModule,
    LoaderComponent,
    StatsCardComponent,
    ButtonComponent,
    CardComponent,
    TagComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container animate-fade-in">
      @if (loading()) {
        <app-loader size="large">
          <div class="loading-content">
            <i class="pi pi-spin pi-cog loading-icon"></i>
            <span>Chargement des détails de la borne...</span>
          </div>
        </app-loader>
      } @else if (machine()) {
        <!-- Header de la borne -->
        <div class="machine-header">
          <div class="header-content">
            <div class="machine-title-section">
              <div class="machine-icon" [class.active]="machineStatus() === 'active'">
                <i class="pi pi-desktop"></i>
                @if (hasGames()) {
                  <div class="games-count">{{ gamesCount() }}</div>
                }
              </div>
              <div class="machine-info">
                <h1 class="machine-name">{{ machine()!.nom }}</h1>
                @if (machine()!.description) {
                  <p class="machine-description">{{ machine()!.description }}</p>
                }
                <div class="machine-meta">
                  <span class="meta-item">
                    <i class="pi pi-map-marker"></i>
                    {{ machine()!.localisation }}
                  </span>
                  <span class="meta-item">
                    <i class="pi pi-calendar"></i>
                    Créée le {{ formatDate(machine()!.created_at) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="machine-status-section">
              <ui-tag
                [label]="getStatusLabel()"
                [variant]="getStatusSeverity()"
                [icon]="getStatusIcon()">
              </ui-tag>

              <div class="action-buttons">
                <ui-button
                  icon="pi pi-pencil"
                  label="Modifier"
                  variant="primary"
                  (clicked)="router.navigate(['/arcade-machines/edit', machine()!.id])">
                </ui-button>

                <ui-button
                  icon="pi pi-gamepad"
                  label="Configurer"
                  variant="secondary"
                  (clicked)="configureGames()">
                </ui-button>

                <ui-button
                  icon="pi pi-refresh"
                  label="Actualiser"
                  variant="ghost"
                  [loading]="refreshing()"
                  (clicked)="refreshData()">
                </ui-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistiques -->
        <div class="stats-section stagger-fade-in">
          @for (stat of machineStats(); track stat.title) {
            <app-stats-card 
              [data]="stat"
              [animated]="true"
              [gamingStyle]="true">
            </app-stats-card>
          }
        </div>

        <!-- Contenu principal avec onglets -->
        <div class="main-content">
          <p-tabView styleClass="gaming-tabs">
            
            <!-- Onglet Vue d'ensemble -->
            <p-tabPanel header="Vue d'ensemble" leftIcon="pi pi-home">
              <div class="overview-grid">
                
                <!-- Informations générales -->
                <ui-card>
                  <div card-header class="card-header">
                    <i class="pi pi-info-circle"></i>
                    <span>Informations générales</span>
                  </div>

                  <div class="info-grid">
                    <div class="info-item">
                      <label>Nom de la borne</label>
                      <span class="value">{{ machine()!.nom }}</span>
                    </div>
                    
                    <div class="info-item">
                      <label>Clé API</label>
                      <span class="value api-key">{{ formatApiKey(machine()!.api_key) }}</span>
                    </div>
                    
                    <div class="info-item">
                      <label>Localisation</label>
                      <span class="value">{{ machine()!.localisation }}</span>
                    </div>
                    
                    @if (machine()!.latitude && machine()!.longitude) {
                      <div class="info-item">
                        <label>Coordonnées GPS</label>
                        <span class="value coordinates">
                          {{ machine()!.latitude | number:'1.4-4' }}, {{ machine()!.longitude | number:'1.4-4' }}
                        </span>
                      </div>
                    }
                    
                    <div class="info-item">
                      <label>Date de création</label>
                      <span class="value">{{ formatDateTime(machine()!.created_at) }}</span>
                    </div>
                    
                    <div class="info-item">
                      <label>Dernière modification</label>
                      <span class="value">{{ formatDateTime(machine()!.updated_at) }}</span>
                    </div>
                  </div>
                </ui-card>

                <!-- Configuration des jeux -->
                <ui-card>
                  <div card-header class="card-header">
                    <i class="pi pi-gamepad"></i>
                    <span>Configuration des jeux</span>
                  </div>
                  
                  @if (hasGames()) {
                    <div class="games-grid">
                      @for (slot of [1, 2]; track slot) {
                        <div class="slot-display" [class.occupied]="!!getGameForSlot(slot)">
                          <div class="slot-header">
                            <span class="slot-number">Slot {{ slot }}</span>
                            <span class="slot-status" [class.active]="!!getGameForSlot(slot)">
                              {{ getGameForSlot(slot) ? 'Occupé' : 'Libre' }}
                            </span>
                          </div>
                          
                          @if (getGameForSlot(slot); as game) {
                            <div class="game-details">
                              <h4 class="game-name">{{ game.nom }}</h4>
                              @if (game.description) {
                                <p class="game-description">{{ game.description }}</p>
                              }
                              <div class="game-meta">
                                <span class="meta-tag">
                                  <i class="pi pi-users"></i>
                                  {{ game.min_players }}-{{ game.max_players }} joueurs
                                </span>
                                <span class="meta-tag">
                                  <i class="pi pi-ticket"></i>
                                  {{ game.ticket_cost }} tickets
                                </span>
                              </div>
                            </div>
                          } @else {
                            <div class="empty-slot">
                              <i class="pi pi-plus-circle"></i>
                              <span>Slot libre</span>
                              <ui-button
                                label="Configurer"
                                variant="ghost"
                                size="sm"
                                (clicked)="configureSlot(slot)">
                              </ui-button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="no-games">
                      <i class="pi pi-exclamation-triangle"></i>
                      <h3>Aucun jeu configuré</h3>
                      <p>Cette borne n'a aucun jeu configuré pour le moment.</p>
                      <ui-button
                        label="Configurer les jeux"
                        icon="pi pi-plus"
                        variant="primary"
                        (clicked)="configureGames()">
                      </ui-button>
                    </div>
                  }
                </ui-card>

                <!-- File d'attente en temps réel -->
                <ui-card>
                  <div card-header class="card-header">
                    <i class="pi pi-users"></i>
                    <span>File d'attente</span>
                    <ui-tag [label]="queueItems().length.toString()" variant="info"></ui-tag>
                  </div>
                  
                  @if (queueItems().length > 0) {
                    <div class="queue-list">
                      @for (item of queueItems(); track item.id; let i = $index) {
                        <div class="queue-item animate-fade-in-left" 
                             [style.animation-delay]="(i * 0.1) + 's'">
                          <div class="queue-position">{{ item.position }}</div>
                          <div class="queue-info">
                            <span class="player-name">{{ item.player_pseudo }}</span>
                            @if (item.player2_pseudo) {
                              <span class="player2-name">& {{ item.player2_pseudo }}</span>
                            }
                            <span class="game-name">{{ item.game_name }}</span>
                          </div>
                          <div class="unlock-code">
                            <span class="code-label">Code:</span>
                            <span class="code-value">{{ item.unlock_code }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="empty-queue">
                      <i class="pi pi-clock"></i>
                      <span>Aucun joueur en attente</span>
                    </div>
                  }
                </ui-card>
              </div>
            </p-tabPanel>

            <!-- Onglet Statistiques -->
            <p-tabPanel header="Statistiques" leftIcon="pi pi-chart-line">
              <div class="stats-grid">

                <!-- Graphique d'utilisation -->
                <ui-card>
                  <div card-header class="card-header">
                    <i class="pi pi-chart-line"></i>
                    <span>Utilisation hebdomadaire</span>
                  </div>
                  <p-chart
                    type="line" 
                    [data]="chartData()"
                    [options]="chartOptions()"
                    width="100%"
                    height="300px">
                  </p-chart>
                </ui-card>

                <!-- Métriques de performance -->
                <ui-card>
                  <div card-header class="card-header">
                    <i class="pi pi-chart-bar"></i>
                    <span>Métriques de performance</span>
                  </div>
                  <div class="metrics-grid">
                    <div class="metric-item">
                      <div class="metric-value">{{ enrichedMachine().total_games_played || 0 }}</div>
                      <div class="metric-label">Parties jouées</div>
                      <div class="metric-icon">
                        <i class="pi pi-play"></i>
                      </div>
                    </div>
                    
                    <div class="metric-item">
                      <div class="metric-value">{{ enrichedMachine().average_session_time || 0 }}min</div>
                      <div class="metric-label">Temps moyen</div>
                      <div class="metric-icon">
                        <i class="pi pi-clock"></i>
                      </div>
                    </div>
                    
                    <div class="metric-item">
                      <div class="metric-value">{{ (enrichedMachine().utilization_rate || 0) }}%</div>
                      <div class="metric-label">Taux d'utilisation</div>
                      <div class="metric-icon">
                        <i class="pi pi-chart-pie"></i>
                      </div>
                      <div class="metric-progress">
                        <p-progressBar 
                          [value]="enrichedMachine().utilization_rate || 0"
                          [showValue]="false"
                          styleClass="gaming-progress">
                        </p-progressBar>
                      </div>
                    </div>
                    
                    <div class="metric-item">
                      <div class="metric-value">{{ enrichedMachine().revenue_generated || 0 }}</div>
                      <div class="metric-label">Tickets générés</div>
                      <div class="metric-icon">
                        <i class="pi pi-ticket"></i>
                      </div>
                    </div>
                  </div>
                </ui-card>
              </div>
            </p-tabPanel>

            <!-- Onglet Activité -->
            <p-tabPanel header="Journal d'activité" leftIcon="pi pi-history">
              <div class="activity-container">
                @if (activityLog().length === 0) {
                  <div class="empty-state">
                    <i class="pi pi-history" style="font-size: 3rem; opacity: 0.3"></i>
                    <h3>Aucun événement disponible</h3>
                    <p>Le journal d'activité n'est pas encore disponible via l'API.</p>
                  </div>
                } @else {
                  <p-timeline
                    [value]="activityLog()"
                    styleClass="gaming-timeline">

                    <ng-template pTemplate="marker" let-event>
                      <div class="timeline-marker" [class]="getEventMarkerClass(event.event_type)">
                        <i [class]="'pi ' + getEventIcon(event.event_type)"></i>
                      </div>
                    </ng-template>

                    <ng-template pTemplate="content" let-event>
                      <div class="timeline-content">
                        <div class="event-header">
                          <h4 class="event-title">{{ event.description }}</h4>
                          <span class="event-time">{{ formatRelativeTime(event.timestamp) }}</span>
                        </div>
                        <div class="event-details">
                          @if (event.user) {
                            <span class="event-user">
                              <i class="pi pi-user"></i>
                              {{ event.user }}
                            </span>
                          }
                          @if (event.game) {
                            <span class="event-game">
                              <i class="pi pi-gamepad"></i>
                              {{ event.game }}
                            </span>
                          }
                        </div>
                        <span class="event-timestamp">{{ formatDateTime(event.timestamp) }}</span>
                      </div>
                    </ng-template>
                  </p-timeline>
                }
              </div>
            </p-tabPanel>
          </p-tabView>
        </div>
      } @else {
        <!-- État d'erreur -->
        <div class="error-state">
          <i class="pi pi-exclamation-triangle error-icon"></i>
          <h2>Borne introuvable</h2>
          <p>La borne demandée n'existe pas ou a été supprimée.</p>
          <ui-button
            label="Retour à la liste"
            icon="pi pi-arrow-left"
            variant="primary"
            (clicked)="router.navigate(['/arcade-machines'])">
          </ui-button>
        </div>
      }
    </div>
  `,
  styleUrls: ['./machine-detail.component.scss']
})
export class MachineDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly arcadesService = inject(ArcadesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly statsStrategy = new MachineStatsStrategy();
  private readonly destroy$ = new Subject<void>();

  // Signaux
  protected readonly loading = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly machine = signal<EnrichedArcade | null>(null);
  protected readonly queueItems = signal<QueueItem[]>([]);
  protected readonly activityLog = signal<ActivityLogEntry[]>([]);

  // Computed signals
  protected readonly machineStatus = computed(() => {
    const m = this.machine();
    if (!m) return 'inactive';
    
    const gamesCount = m.games?.length || 0;
    if (gamesCount === 0) return 'inactive';
    if (gamesCount === 1) return 'partial';
    return 'active';
  });

  protected readonly machineStats = computed(() => {
    const m = this.machine();
    const queue = this.queueItems();
    return m ? this.statsStrategy.calculateStats(m, queue) : [];
  });

  protected readonly machineGames = computed(() => {
    const m = this.machine();
    return m?.games || [];
  });

  protected readonly hasGames = computed(() => {
    return this.machineGames().length > 0;
  });

  protected readonly gamesCount = computed(() => {
    return this.machineGames().length;
  });

  protected readonly enrichedMachine = computed(() => {
    return this.machine() as EnrichedArcade;
  });

  // Chart data
  protected readonly chartData = signal<any>({
    labels: [],
    datasets: [{
      label: 'Utilisation (%)',
      data: [],
      fill: true,
      backgroundColor: 'rgba(0, 212, 255, 0.1)',
      borderColor: '#00d4ff',
      tension: 0.4
    }]
  });

  protected readonly chartOptions = signal<any>({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 212, 255, 0.1)'
        },
        ticks: {
          color: '#64748b'
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 212, 255, 0.1)'
        },
        ticks: {
          color: '#64748b'
        }
      }
    }
  });

  ngOnInit(): void {
    this.loadMachineData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMachineData(): void {
    const id = +this.route.snapshot.params['id'];
    if (!id) {
      this.router.navigate(['/arcade-machines']);
      return;
    }

    this.loading.set(true);

    forkJoin({
      machine: this.arcadesService.getArcadeById(id),
      queue: this.arcadesService.getArcadeQueue(id).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ machine, queue }) => {
        this.machine.set(this.enrichMachine(machine));
        this.queueItems.set(queue);
        this.activityLog.set([]);
        this.updateChartData();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les détails de la borne'
        });
        this.loading.set(false);
      }
    });
  }

  private setupAutoRefresh(): void {
    const m = this.machine();
    if (m && this.machineStatus() !== 'inactive') {
      interval(30000).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.refreshQueue();
      });
    }
  }

  private refreshQueue(): void {
    const m = this.machine();
    if (m) {
      this.arcadesService.getArcadeQueue(m.id).subscribe({
        next: (queue) => this.queueItems.set(queue),
        error: (error) => console.error('Erreur lors du rafraîchissement de la file:', error)
      });
    }
  }

  private enrichMachine(machine: Arcade): EnrichedArcade {
    return {
      ...machine,
      status: this.calculateMachineStatus(machine),
      utilization_rate: 0,
      total_games_played: 0,
      revenue_generated: 0,
      average_session_time: 0
    };
  }

  private calculateMachineStatus(machine: Arcade): MachineStatus {
    const gamesCount = machine.games?.length || 0;
    if (gamesCount === 0) return 'inactive';
    if (gamesCount === 1) return 'partial';
    return 'active';
  }

  private updateChartData(): void {
    const labels = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('fr-FR', { weekday: 'short' }));
    }

    this.chartData.set({
      labels,
      datasets: [{
        label: 'Utilisation (%)',
        data: new Array(7).fill(0),
        fill: true,
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        borderColor: '#00d4ff',
        tension: 0.4
      }]
    });
  }

  protected refreshData(): void {
    this.refreshing.set(true);
    this.loadMachineData();
    setTimeout(() => this.refreshing.set(false), 1000);
  }

  protected configureGames(): void {
    this.router.navigate(['/arcade-machines/edit', this.machine()?.id]);
  }

  protected configureSlot(slotNumber: number): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Configuration',
      detail: `Configuration du slot ${slotNumber}`
    });
    this.router.navigate(['/arcade-machines/edit', this.machine()?.id]);
  }

  // Méthodes utilitaires pour l'affichage
  protected getStatusLabel(): string {
    const labels = {
      active: 'Active',
      inactive: 'Inactive',
      maintenance: 'Maintenance',
      partial: 'Partielle'
    };
    return labels[this.machineStatus()] || 'Inconnu';
  }

  protected getStatusSeverity(): 'success' | 'warning' | 'danger' | 'info' | 'default' {
    const severities = {
      active: 'success' as const,
      inactive: 'danger' as const,
      maintenance: 'warning' as const,
      partial: 'warning' as const
    };
    return severities[this.machineStatus()] || 'info';
  }

  protected getStatusIcon(): string {
    const icons = {
      active: 'pi pi-check-circle',
      inactive: 'pi pi-times-circle',
      maintenance: 'pi pi-wrench',
      partial: 'pi pi-exclamation-triangle'
    };
    return icons[this.machineStatus()] || 'pi pi-question-circle';
  }

  protected getGameForSlot(slotNumber: number) {
    const games = this.machineGames();
    return games.find(game => game.slot_number === slotNumber);
  }

  protected getEventMarkerClass(eventType: ActivityLogEntry['event_type']): string {
    const classes = {
      game_start: 'marker-success',
      game_end: 'marker-info',
      maintenance: 'marker-warning',
      configuration: 'marker-primary',
      error: 'marker-danger'
    };
    return classes[eventType] || 'marker-default';
  }

  protected getEventIcon(eventType: ActivityLogEntry['event_type']): string {
    const icons = {
      game_start: 'pi-play',
      game_end: 'pi-stop',
      maintenance: 'pi-wrench',
      configuration: 'pi-cog',
      error: 'pi-exclamation-triangle'
    };
    return icons[eventType] || 'pi-circle';
  }

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  protected formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('fr-FR');
  }

  protected formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `il y a ${diffMins} minutes`;
    if (diffHours < 24) return `il y a ${diffHours} heures`;
    return `il y a ${diffDays} jours`;
  }

  protected formatApiKey(apiKey: string): string {
    if (!apiKey) return '';
    const start = apiKey.substring(0, 8);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}...${end}`;
  }
}