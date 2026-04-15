// src/app/features/arcade-machines/pages/machine-detail/machine-detail.component.ts

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TimelineModule } from 'primeng/timeline';
import { ChartModule } from 'primeng/chart';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonComponent, CardComponent, TagComponent } from '../../../../shared/ui';
import { forkJoin, interval, Subject, takeUntil, catchError, of } from 'rxjs';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { Arcade, QueueItem } from '../../../../core/models/arcade.model';

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

@Component({
  selector: 'app-machine-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TimelineModule,
    ChartModule,
    ButtonComponent,
    CardComponent,
    TagComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './machine-detail.component.html',
  styleUrl: './machine-detail.component.scss',
})
export class MachineDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly arcadesService = inject(ArcadesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroy$ = new Subject<void>();

  // Signaux
  protected readonly loading = signal(false);
  protected readonly machine = signal<EnrichedArcade | null>(null);
  protected readonly queueItems = signal<QueueItem[]>([]);
  protected readonly activityLog = signal<ActivityLogEntry[]>([]);
  protected readonly activeTab = signal<'overview' | 'stats' | 'activity'>('overview');

  // Computed signals
  protected readonly machineStatus = computed(() => {
    const m = this.machine();
    if (!m) return 'inactive';
    const gamesCount = m.games?.length || 0;
    if (gamesCount === 0) return 'inactive';
    if (gamesCount === 1) return 'partial';
    return 'active';
  });

  protected readonly machineGames = computed(() => {
    return this.machine()?.games || [];
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
      backgroundColor: 'rgba(0, 98, 254, 0.08)',
      borderColor: 'var(--blue-60)',
      tension: 0.4
    }]
  });

  protected readonly chartOptions = signal<any>({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { color: '#697077' }
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { color: '#697077' }
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
    interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.refreshQueue();
    });
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
    const labels: string[] = [];
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
        backgroundColor: 'rgba(0, 98, 254, 0.08)',
        borderColor: '#0062FE',
        tension: 0.4
      }]
    });
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

  protected getStatusLabel(): string {
    const labels: Record<string, string> = {
      active: 'Active',
      inactive: 'Inactive',
      maintenance: 'Maintenance',
      partial: 'Partielle'
    };
    return labels[this.machineStatus()] || 'Inconnu';
  }

  protected getStatusSeverity(): 'success' | 'warning' | 'danger' | 'info' | 'default' {
    const severities: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      active: 'success',
      inactive: 'danger',
      maintenance: 'warning',
      partial: 'warning'
    };
    return severities[this.machineStatus()] || 'default';
  }

  protected getGameForSlot(slotNumber: number) {
    return this.machineGames().find(game => game.slot_number === slotNumber);
  }

  protected getEventMarkerClass(eventType: ActivityLogEntry['event_type']): string {
    const classes: Record<string, string> = {
      game_start: 'marker-success',
      game_end: 'marker-info',
      maintenance: 'marker-warning',
      configuration: 'marker-primary',
      error: 'marker-danger'
    };
    return classes[eventType] || 'marker-default';
  }

  protected getEventIcon(eventType: ActivityLogEntry['event_type']): string {
    const icons: Record<string, string> = {
      game_start: 'pi-play',
      game_end: 'pi-stop',
      maintenance: 'pi-wrench',
      configuration: 'pi-cog',
      error: 'pi-exclamation-triangle'
    };
    return icons[eventType] || 'pi-circle';
  }

  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  protected formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('fr-FR');
  }

  protected formatRelativeTime(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours} h`;
    return `il y a ${diffDays} j`;
  }

  protected formatApiKey(apiKey: string): string {
    if (!apiKey) return '—';
    return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
  }
}
