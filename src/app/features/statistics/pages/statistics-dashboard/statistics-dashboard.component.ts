import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import { UsersService } from '../../../../core/services/users.service';
import { PartiesService } from '../../../../core/services/parties.service';
import { GamesService } from '../../../../core/services/games.service';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { FormsModule } from '@angular/forms';

interface ChartData {
  labels: string[];
  datasets: any[];
}

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

interface TopPlayer {
  name: string;
  victories: number;
  parties: number;
  winRate: number;
}

interface PopularGame {
  name: string;
  playCount: number;
  percentage: number;
}

@Component({
  selector: 'app-statistics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    FormsModule,
    ChartModule,
    DropdownModule,
    CalendarModule,
    ButtonModule,
    TableModule,
    TagModule,
    LoaderComponent
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Statistiques</h1>
        <div class="page-actions">
          <p-calendar [(ngModel)]="dateRange" selectionMode="range" 
                     [readonlyInput]="true" placeholder="Sélectionner une période">
          </p-calendar>
          <button pButtonIc pRipple type="button" icon="pi pi-refresh" 
                  label="Actualiser" (click)="refreshData()">
          </button>
        </div>
      </div>
      
      <app-loader *ngIf="loading" size="large"></app-loader>
      
      <div class="statistics-content" *ngIf="!loading">
        <!-- Cartes de statistiques principales -->
        <div class="stat-cards-grid">
          <p-card *ngFor="let stat of statCards" [styleClass]="'stat-card ' + stat.color">
            <div class="stat-card-content">
              <div class="stat-icon">
                <i [class]="'pi ' + stat.icon"></i>
              </div>
              <div class="stat-details">
                <h3>{{ stat.value }}</h3>
                <p>{{ stat.title }}</p>
                <div class="stat-trend" *ngIf="stat.trend">
                  <i class="pi" [ngClass]="stat.trend.direction === 'up' ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                  <span>{{ stat.trend.value }}%</span>
                </div>
              </div>
            </div>
          </p-card>
        </div>
        
        <!-- Graphiques -->
        <div class="charts-grid">
          <!-- Évolution des parties -->
          <p-card header="Évolution des parties (30 derniers jours)">
            <p-chart type="line" [data]="partiesEvolutionData" [options]="lineChartOptions"></p-chart>
          </p-card>
          
          <!-- Répartition des jeux -->
          <p-card header="Jeux les plus joués">
            <p-chart type="doughnut" [data]="gamesDistributionData" [options]="doughnutChartOptions"></p-chart>
          </p-card>
        </div>
        
        <!-- Tableaux -->
        <div class="tables-grid">
          <!-- Top joueurs -->
          <p-card header="Top 10 des joueurs">
            <p-table [value]="topPlayers" [rows]="10" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 3rem">#</th>
                  <th>Joueur</th>
                  <th>Victoires</th>
                  <th>Parties</th>
                  <th>Taux</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-player let-i="rowIndex">
                <tr>
                  <td class="text-center">
                    <i *ngIf="i < 3" class="pi pi-trophy" 
                       [style.color]="getTrophyColor(i)"></i>
                    <span *ngIf="i >= 3">{{ i + 1 }}</span>
                  </td>
                  <td>{{ player.name }}</td>
                  <td class="text-center">{{ player.victories }}</td>
                  <td class="text-center">{{ player.parties }}</td>
                  <td class="text-center">
                    <p-tag [value]="player.winRate + '%'" 
                           [severity]="getWinRateSeverity(player.winRate)">
                    </p-tag>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
          
          <!-- Utilisation des bornes -->
          <p-card header="Utilisation des bornes">
            <div class="machine-usage">
              <div *ngFor="let machine of machineUsage" class="machine-item">
                <div class="machine-info">
                  <span class="machine-name">{{ machine.name }}</span>
                  <span class="machine-count">{{ machine.activeParties }} parties actives</span>
                </div>
                <div class="machine-bar">
                  <div class="machine-bar-fill" 
                       [style.width.%]="machine.usagePercentage"
                       [style.backgroundColor]="getMachineBarColor(machine.usagePercentage)">
                  </div>
                </div>
              </div>
            </div>
          </p-card>
        </div>
        
        <!-- Statistiques détaillées -->
        <p-card header="Statistiques détaillées" styleClass="detailed-stats-card">
          <div class="detailed-stats-grid">
            <div class="stat-detail">
              <label>Temps moyen par partie</label>
              <p>{{ avgGameDuration }} min</p>
            </div>
            <div class="stat-detail">
              <label>Tickets consommés aujourd'hui</label>
              <p>{{ todayTickets }}</p>
            </div>
            <div class="stat-detail">
              <label>Revenus estimés (mois)</label>
              <p>{{ monthlyRevenue }}€</p>
            </div>
            <div class="stat-detail">
              <label>Heure de pointe</label>
              <p>{{ peakHour }}</p>
            </div>
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: [`
    .statistics-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .stat-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }
    
    .stat-card {
      &.primary { --stat-color: var(--primary-color); }
      &.success { --stat-color: var(--green-500); }
      &.warning { --stat-color: var(--yellow-500); }
      &.danger { --stat-color: var(--red-500); }
      
      .stat-card-content {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        
        .stat-icon {
          width: 60px;
          height: 60px;
          background-color: var(--stat-color);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          
          i {
            font-size: 1.75rem;
            color: white;
          }
        }
        
        .stat-details {
          flex: 1;
          
          h3 {
            margin: 0;
            font-size: 2rem;
            font-weight: 700;
          }
          
          p {
            margin: 0.25rem 0 0.5rem 0;
            color: var(--text-color-secondary);
          }
          
          .stat-trend {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.875rem;
            
            i {
              font-size: 0.75rem;
              &.pi-arrow-up { color: var(--green-500); }
              &.pi-arrow-down { color: var(--red-500); }
            }
          }
        }
      }
    }
    
    .charts-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1rem;
      
      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }
    
    .tables-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      
      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }
    
    .machine-usage {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      
      .machine-item {
        .machine-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          
          .machine-name {
            font-weight: 500;
          }
          
          .machine-count {
            color: var(--text-color-secondary);
            font-size: 0.875rem;
          }
        }
        
        .machine-bar {
          height: 8px;
          background-color: var(--surface-border);
          border-radius: 4px;
          overflow: hidden;
          
          .machine-bar-fill {
            height: 100%;
            transition: width 0.3s ease;
          }
        }
      }
    }
    
    .detailed-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
      
      .stat-detail {
        label {
          display: block;
          color: var(--text-color-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        
        p {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
      }
    }
    
    :host ::ng-deep {
      .p-datatable-sm {
        font-size: 0.875rem;
        
        .p-datatable-thead > tr > th {
          padding: 0.5rem;
        }
        
        .p-datatable-tbody > tr > td {
          padding: 0.5rem;
        }
      }
      
      .stat-card .p-card-body {
        padding: 1.25rem;
      }
      
      .detailed-stats-card {
        background-color: var(--surface-ground);
      }
    }
  `]
})
export class StatisticsDashboardComponent implements OnInit {
  loading = true;
  dateRange: Date[] = [];
  
  // Données pour les cartes de statistiques
  statCards: StatCard[] = [];
  
  // Données pour les graphiques
  partiesEvolutionData: ChartData = { labels: [], datasets: [] };
  gamesDistributionData: ChartData = { labels: [], datasets: [] };
  
  // Options des graphiques
  lineChartOptions: any;
  doughnutChartOptions: any;
  
  // Données pour les tableaux
  topPlayers: TopPlayer[] = [];
  machineUsage: any[] = [];
  
  // Statistiques détaillées
  avgGameDuration = 0;
  todayTickets = 0;
  monthlyRevenue = 0;
  peakHour = '14h-16h';
  
  constructor(
    private usersService: UsersService,
    private partiesService: PartiesService,
    private gamesService: GamesService,
    private arcadesService: ArcadesService,
    private messageService: MessageService
  ) {
    this.initializeChartOptions();
    this.initializeDateRange();
  }
  
  ngOnInit(): void {
    this.loadStatistics();
  }
  
  /**
   * Initialise les options des graphiques
   */
  private initializeChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
    
    this.lineChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 2,
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      scales: {
        x: {
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder }
        },
        y: {
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder }
        }
      }
    };
    
    this.doughnutChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 1.5,
      plugins: {
        legend: {
          labels: { color: textColor },
          position: 'bottom'
        }
      }
    };
  }
  
  /**
   * Initialise la période par défaut (30 derniers jours)
   */
  private initializeDateRange(): void {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    this.dateRange = [start, end];
  }
  
  /**
   * Charge toutes les statistiques
   */
  private loadStatistics(): void {
    this.loading = true;
    
    forkJoin({
      users: this.usersService.getAllUsers(),
      parties: this.partiesService.getAllParties(),
      games: this.gamesService.getAllGames(),
      machines: this.arcadesService.getAllArcades()
    }).subscribe({
      next: (data) => {
        this.processStatistics(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les statistiques'
        });
        this.loading = false;
      }
    });
  }
  
  /**
   * Traite les données pour générer les statistiques
   */
  private processStatistics(data: any): void {
    const { users, parties, games, machines } = data;
    
    // Cartes de statistiques
    this.statCards = [
      {
        title: 'Utilisateurs actifs',
        value: users.length,
        icon: 'pi-users',
        color: 'primary',
        trend: { value: 12, direction: 'up' }
      },
      {
        title: 'Parties aujourd\'hui',
        value: this.getTodayParties(parties),
        icon: 'pi-play',
        color: 'success',
        trend: { value: 8, direction: 'up' }
      },
      {
        title: 'Tickets vendus',
        value: this.calculateTicketsSold(parties),
        icon: 'pi-ticket',
        color: 'warning',
        trend: { value: 15, direction: 'up' }
      },
      {
        title: 'Bornes actives',
        value: `${this.getActiveMachines(machines, parties)}/${machines.length}`,
        icon: 'pi-desktop',
        color: 'danger'
      }
    ];
    
    // Données des graphiques
    this.generatePartiesEvolutionData(parties);
    this.generateGamesDistributionData(parties, games);
    
    // Top joueurs
    this.calculateTopPlayers(parties, users);
    
    // Utilisation des bornes
    this.calculateMachineUsage(machines, parties);
    
    // Statistiques détaillées
    this.calculateDetailedStats(parties);
  }
  
  /**
   * Calcule le nombre de parties aujourd'hui
   */
  private getTodayParties(parties: any[]): number {
    const today = new Date().toDateString();
    return parties.filter(p => 
      new Date(p.created_at).toDateString() === today
    ).length;
  }
  
  /**
   * Calcule le nombre de tickets vendus
   */
  private calculateTicketsSold(parties: any[]): number {
    return parties.filter(p => p.done).length;
  }
  
  /**
   * Calcule le nombre de bornes actives
   */
  private getActiveMachines(machines: any[], parties: any[]): number {
    const activePartiesNow = parties.filter(p => !p.done && !p.cancel);
    const activeMachineIds = new Set(activePartiesNow.map(p => p.machine_id));
    return activeMachineIds.size;
  }
  
  /**
   * Génère les données pour le graphique d'évolution
   */
  private generatePartiesEvolutionData(parties: any[]): void {
    // Simulation de données pour les 30 derniers jours
    const labels = [];
    const data = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
      
      // Compter les parties pour cette date
      const dayParties = parties.filter(p => 
        new Date(p.created_at).toDateString() === date.toDateString()
      ).length;
      
      data.push(dayParties || Math.floor(Math.random() * 50) + 10); // Données simulées si pas de parties
    }
    
    this.partiesEvolutionData = {
      labels,
      datasets: [{
        label: 'Parties jouées',
        data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4
      }]
    };
  }
  
  /**
   * Génère les données pour la répartition des jeux
   */
  private generateGamesDistributionData(parties: any[], games: any[]): void {
    const gameCount: { [key: string]: number } = {};
    
    parties.forEach(party => {
      gameCount[party.game_id] = (gameCount[party.game_id] || 0) + 1;
    });
    
    const sortedGames = Object.entries(gameCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const labels = sortedGames.map(([gameId]) => {
      const game = games.find(g => g.id === gameId);
      const shortId = String(gameId ?? '').substring(0, 8);
      return game?.nom || `Jeu ${shortId}`;
    });
    
    const data = sortedGames.map(([, count]) => count);
    
    this.gamesDistributionData = {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#6366f1',
          '#8b5cf6',
          '#ec4899',
          '#f59e0b',
          '#10b981'
        ]
      }]
    };
  }
  
  /**
   * Calcule le top des joueurs
   */
  private calculateTopPlayers(parties: any[], users: any[]): void {
    const playerStats: { [key: string]: any } = {};
    
    // Analyser toutes les parties terminées
    parties.filter(p => p.done).forEach(party => {
      // Joueur 1
      if (!playerStats[party.player1_id]) {
        playerStats[party.player1_id] = { victories: 0, parties: 0 };
      }
      playerStats[party.player1_id].parties++;
      if (party.p1_score > party.p2_score) {
        playerStats[party.player1_id].victories++;
      }
      
      // Joueur 2
      if (!playerStats[party.player2_id]) {
        playerStats[party.player2_id] = { victories: 0, parties: 0 };
      }
      playerStats[party.player2_id].parties++;
      if (party.p2_score > party.p1_score) {
        playerStats[party.player2_id].victories++;
      }
    });
    
    // Convertir en tableau et calculer le taux de victoire
    this.topPlayers = Object.entries(playerStats)
      .map(([playerId, stats]) => {
        const user = users.find(u => u.id === playerId);
        return {
          name: user ? `${user.prenom || ''} ${user.nom || ''}`.trim() || user.pseudo : `Joueur ${String(playerId ?? '').substring(0, 8)}`,
          victories: stats.victories,
          parties: stats.parties,
          winRate: Math.round((stats.victories / stats.parties) * 100)
        };
      })
      .sort((a, b) => b.victories - a.victories)
      .slice(0, 10);
  }
  
  /**
   * Calcule l'utilisation des bornes
   */
  private calculateMachineUsage(machines: any[], parties: any[]): void {
    const activeParties = parties.filter(p => !p.done && !p.cancel);
    
    this.machineUsage = machines.map(machine => {
      const machineParties = activeParties.filter(p => p.machine_id === machine.id);
      const totalActiveParties = activeParties.length || 1;
      
      return {
        name: machine.nom || `Borne ${machine.id}`,
        activeParties: machineParties.length,
        usagePercentage: Math.round((machineParties.length / totalActiveParties) * 100)
      };
    }).sort((a, b) => b.activeParties - a.activeParties);
  }
  
  /**
   * Calcule les statistiques détaillées
   */
  private calculateDetailedStats(parties: any[]): void {
    // Temps moyen par partie (simulation)
    this.avgGameDuration = 15;
    
    // Tickets consommés aujourd'hui
    this.todayTickets = this.getTodayParties(parties);
    
    // Revenus estimés du mois (5€ par ticket)
    const thisMonth = new Date().getMonth();
    const monthParties = parties.filter(p => 
      new Date(p.created_at).getMonth() === thisMonth && p.done
    );
    this.monthlyRevenue = monthParties.length * 5;
    
    // Heure de pointe (simulation)
    this.peakHour = '14h-16h';
  }
  
  /**
   * Actualise les données
   */
  refreshData(): void {
    this.loadStatistics();
  }
  
  /**
   * Retourne la couleur du trophée selon le rang
   */
  getTrophyColor(index: number): string {
    switch (index) {
      case 0: return '#FFD700'; // Or
      case 1: return '#C0C0C0'; // Argent
      case 2: return '#CD7F32'; // Bronze
      default: return '';
    }
  }
  
  /**
   * Retourne la sévérité selon le taux de victoire
   */
  getWinRateSeverity(winRate: number): string {
    if (winRate >= 70) return 'success';
    if (winRate >= 50) return 'warning';
    return 'danger';
  }
  
  /**
   * Retourne la couleur de la barre selon le pourcentage d'utilisation
   */
  getMachineBarColor(percentage: number): string {
    if (percentage >= 70) return '#ef4444'; // Rouge
    if (percentage >= 40) return '#f59e0b'; // Orange
    return '#10b981'; // Vert
  }
}