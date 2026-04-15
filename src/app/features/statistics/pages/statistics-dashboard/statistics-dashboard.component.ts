import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { CardComponent, TagComponent, TagVariant } from '../../../../shared/ui';
import { AdminService, AdminStats } from '../../../../core/services/admin.service';

interface ChartData {
  labels: string[];
  datasets: any[];
}

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  trend?: { value: number; direction: 'up' | 'down' };
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
    CardComponent,
    TagComponent,
  ],
  templateUrl: './statistics-dashboard.component.html',
  styleUrl: './statistics-dashboard.component.scss',
})
export class StatisticsDashboardComponent implements OnInit {
  private readonly adminService    = inject(AdminService);
  private readonly messageService  = inject(MessageService);

  loading = true;
  dateRange: Date[] = [];

  statCards: StatCard[] = [];
  reservationsEvolutionData: ChartData = { labels: [], datasets: [] };
  gamesDistributionData: ChartData = { labels: [], datasets: [] };
  ticketRevenueData: ChartData = { labels: [], datasets: [] };
  arcadeOccupancyData: ChartData = { labels: [], datasets: [] };
  lineChartOptions: any;
  barChartOptions: any;
  doughnutChartOptions: any;
  topPlayers: TopPlayer[] = [];
  machineUsage: any[] = [];

  avgGameDuration = 0;
  todayTickets = 0;
  monthlyRevenue = 0;
  peakHour = '14h–16h';

  ngOnInit(): void {
    this.initializeChartOptions();
    this.initializeDateRange();
    this.loadStatistics();
  }

  private initializeChartOptions(): void {
    const style = getComputedStyle(document.documentElement);
    const textColor          = style.getPropertyValue('--gray-80');
    const textColorSecondary = style.getPropertyValue('--text-secondary');
    const surfaceBorder      = style.getPropertyValue('--border-default');

    this.lineChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 2,
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } },
        y: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } }
      }
    };

    this.doughnutChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 1.5,
      plugins: { legend: { labels: { color: textColor }, position: 'bottom' } }
    };

    this.barChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 2,
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } },
        y: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } }
      }
    };
  }

  private initializeDateRange(): void {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    this.dateRange = [start, end];
  }

  private loadStatistics(): void {
    this.loading = true;
    this.adminService.getStats().subscribe({
      next: (data) => { this.processStatistics(data); this.loading = false; },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les statistiques' });
        this.loading = false;
      }
    });
  }

  private processStatistics(data: AdminStats): void {
    const previousRevenue = data.ticket_revenue.previous_month || 0;
    const currentRevenue = data.ticket_revenue.current_month || 0;
    const revenueTrend = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : (currentRevenue > 0 ? 100 : 0);

    const occupiedArcades = data.arcade_occupancy.occupied_arcades || 0;
    const totalArcades = data.arcade_occupancy.total_arcades || 0;

    const totalReservations30d = data.reservations_evolution.reduce(
      (acc, item) => acc + item.reservations,
      0,
    );

    const middleIndex = Math.floor(data.reservations_evolution.length / 2);
    const firstHalf = data.reservations_evolution
      .slice(0, middleIndex)
      .reduce((acc, item) => acc + item.reservations, 0);
    const secondHalf = data.reservations_evolution
      .slice(middleIndex)
      .reduce((acc, item) => acc + item.reservations, 0);
    const reservationsTrend = firstHalf > 0
      ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
      : (secondHalf > 0 ? 100 : 0);

    this.statCards = [
      { title: 'Utilisateurs', value: data.active_users, icon: 'pi-users', color: 'primary' },
      {
        title: 'Revenu tickets (mois)',
        value: `${currentRevenue.toFixed(2)} ${data.ticket_revenue.currency}`,
        icon: 'pi-ticket',
        color: 'warning',
        trend: {
          value: Math.abs(revenueTrend),
          direction: revenueTrend >= 0 ? 'up' : 'down',
        },
      },
      {
        title: 'Arcades occupées',
        value: `${occupiedArcades}/${totalArcades}`,
        icon: 'pi-desktop',
        color: 'danger',
      },
      {
        title: 'Réservations (30 jours)',
        value: totalReservations30d,
        icon: 'pi-calendar',
        color: 'success',
        trend: {
          value: Math.abs(reservationsTrend),
          direction: reservationsTrend >= 0 ? 'up' : 'down',
        },
      },
    ];

    this.generateReservationsEvolutionData(data.reservations_evolution);
    this.generateGamesDistributionData(data.top_games);
    this.generateTicketRevenueData(data.ticket_revenue.current_month, data.ticket_revenue.previous_month);
    this.generateArcadeOccupancyData(data.arcade_occupancy.occupied_arcades, data.arcade_occupancy.total_arcades);
    this.calculateMachineUsage(data.arcade_occupancy.arcades);
    this.calculateDetailedStats(data);
  }

  private generateReservationsEvolutionData(evolution: Array<{ date: string; reservations: number }>): void {
    this.reservationsEvolutionData = {
      labels: evolution.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      }),
      datasets: [{
        label: 'Réservations',
        data: evolution.map(item => item.reservations),
        borderColor: '#0062fe',
        backgroundColor: 'rgba(0,98,254,0.07)',
        tension: 0.4,
      }],
    };
  }

  private generateGamesDistributionData(topGames: Array<{ name: string; play_count: number }>): void {
    this.gamesDistributionData = {
      labels: topGames.map(game => game.name),
      datasets: [{ data: topGames.map(game => game.play_count), backgroundColor: ['#0062fe', '#33b1ff', '#42be65', '#f1c21b', '#878d96'] }]
    };
  }

  private generateTicketRevenueData(currentMonth: number, previousMonth: number): void {
    this.ticketRevenueData = {
      labels: ['Mois précédent', 'Mois courant'],
      datasets: [{
        label: 'Revenus tickets (EUR)',
        data: [previousMonth, currentMonth],
        backgroundColor: ['#8d8d8d', '#0062fe'],
        borderRadius: 8,
      }],
    };
  }

  private generateArcadeOccupancyData(occupiedArcades: number, totalArcades: number): void {
    const freeArcades = Math.max(totalArcades - occupiedArcades, 0);
    this.arcadeOccupancyData = {
      labels: ['Arcades occupées', 'Arcades libres'],
      datasets: [{
        data: [occupiedArcades, freeArcades],
        backgroundColor: ['#42be65', '#8d8d8d'],
      }],
    };
  }

  private calculateMachineUsage(arcades: Array<{ name: string; active_reservations: number }>): void {
    const totalActive = arcades.reduce((acc, arcade) => acc + arcade.active_reservations, 0);
    this.machineUsage = arcades
      .map(arcade => {
        const usagePercentage = totalActive > 0
          ? Math.round((arcade.active_reservations / totalActive) * 100)
          : 0;
        return {
          name: arcade.name,
          activeParties: arcade.active_reservations,
          usagePercentage,
        };
      })
      .sort((a, b) => b.activeParties - a.activeParties);
  }

  private calculateDetailedStats(data: AdminStats): void {
    this.avgGameDuration = 15;
    this.todayTickets = data.reservations_evolution.length > 0
      ? data.reservations_evolution[data.reservations_evolution.length - 1].reservations
      : 0;
    this.monthlyRevenue = data.ticket_revenue.current_month;
    this.peakHour = '14h–16h';
  }

  getWinRateSeverity(winRate: number): TagVariant {
    if (winRate >= 70) return 'success';
    if (winRate >= 50) return 'warning';
    return 'danger';
  }

  getMachineBarClass(percentage: number): string {
    if (percentage >= 70) return 'machine-bar-fill bar-fill--danger';
    if (percentage >= 40) return 'machine-bar-fill bar-fill--warning';
    return 'machine-bar-fill bar-fill--ok';
  }
}
