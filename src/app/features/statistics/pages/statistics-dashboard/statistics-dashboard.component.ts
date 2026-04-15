import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonComponent, CardComponent, TagComponent, TagVariant } from '../../../../shared/ui';
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


@Component({
  selector: 'app-statistics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    CalendarModule,
    TableModule,
    LoaderComponent,
    ButtonComponent,
    CardComponent,
    TagComponent,
  ],
  templateUrl: './statistics-dashboard.component.html',
  styleUrls: ['./statistics-dashboard.component.scss']
})
export class StatisticsDashboardComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly partiesService = inject(PartiesService);
  private readonly gamesService = inject(GamesService);
  private readonly arcadesService = inject(ArcadesService);
  private readonly messageService = inject(MessageService);

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

  ngOnInit(): void {
    this.initializeChartOptions();
    this.initializeDateRange();
    this.loadStatistics();
  }
  
  /**
   * Initialise les options des graphiques
   */
  private initializeChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--gray-80');
    const textColorSecondary = documentStyle.getPropertyValue('--text-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--border-default');

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
        borderColor: '#0062fe',
        backgroundColor: 'rgba(0, 98, 254, 0.07)',
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
          '#0062fe',  // blue-60
          '#33b1ff',  // cyan-40
          '#42be65',  // green-40
          '#f1c21b',  // yellow-30
          '#878d96',  // gray-50
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
  getWinRateSeverity(winRate: number): TagVariant {
    if (winRate >= 70) return 'success';
    if (winRate >= 50) return 'warning';
    return 'danger';
  }
  
  /**
   * Retourne la classe CSS de la barre selon le pourcentage d'utilisation
   */
  getMachineBarClass(percentage: number): string {
    if (percentage >= 70) return 'machine-bar-fill bar-fill--danger';
    if (percentage >= 40) return 'machine-bar-fill bar-fill--warning';
    return 'machine-bar-fill bar-fill--ok';
  }
}