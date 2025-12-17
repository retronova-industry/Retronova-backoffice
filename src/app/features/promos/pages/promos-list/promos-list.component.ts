// src/app/features/promos/pages/promos-list/promos-list.component.ts

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
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PromosService } from '../../../../core/services/promos.service';
import { PromoCode } from '../../../../core/models/promo.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { StatsCardComponent, StatsData } from '../../../../shared/components/stats-card/stats-card.component';
import { forkJoin } from 'rxjs';

interface EnrichedPromoCode extends PromoCode {
  readonly status: PromoStatus;
  readonly usage_percentage: number;
  readonly remaining_uses: number;
  readonly is_expired: boolean;
  readonly priority_level: number;
}

type PromoStatus = 'active' | 'exhausted' | 'limited' | 'single_use' | 'inactive';
type ViewMode = 'table' | 'grid';

/**
 * Strategy Pattern pour les différents modes d'affichage
 */
abstract class PromoViewStrategy {
  abstract render(promos: EnrichedPromoCode[]): any;
}

class TablePromoViewStrategy extends PromoViewStrategy {
  render(promos: EnrichedPromoCode[]) {
    return promos.sort((a, b) => b.priority_level - a.priority_level);
  }
}

class GridPromoViewStrategy extends PromoViewStrategy {
  render(promos: EnrichedPromoCode[]) {
    return promos.map(promo => ({
      ...promo,
      displayTitle: promo.code,
      displaySubtitle: `${promo.tickets_reward} tickets`
    })).sort((a, b) => b.priority_level - a.priority_level);
  }
}

/**
 * Factory pour les stratégies de vue
 */
class PromoViewStrategyFactory {
  static create(mode: ViewMode): PromoViewStrategy {
    switch (mode) {
      case 'table':
        return new TablePromoViewStrategy();
      case 'grid':
        return new GridPromoViewStrategy();
      default:
        return new TablePromoViewStrategy();
    }
  }
}

/**
 * Service de calcul des statistiques des promos
 */
class PromoStatsCalculator {
  static calculateStats(promos: EnrichedPromoCode[]): StatsData[] {
    const total = promos.length;
    const active = promos.filter(p => p.status === 'active').length;
    const totalUses = promos.reduce((sum, p) => sum + p.current_uses, 0);
    const totalTicketsDistributed = promos.reduce((sum, p) => sum + (p.current_uses * p.tickets_reward), 0);
    const exhausted = promos.filter(p => p.status === 'exhausted').length;

    return [
      {
        title: 'Codes totaux',
        value: total,
        icon: 'pi-ticket',
        color: 'primary',
        trend: { value: 8, direction: 'up', period: 'ce mois' }
      },
      {
        title: 'Codes actifs',
        value: active,
        icon: 'pi-check-circle',
        color: 'success',
        subtitle: `${Math.round((active / total) * 100) ? Math.round((active / total) * 100): 0 }% du total`
      },
      {
        title: 'Utilisations totales',
        value: totalUses,
        icon: 'pi-users',
        color: 'info',
        trend: { value: 15, direction: 'up', period: 'cette semaine' }
      },
      {
        title: 'Tickets distribués',
        value: totalTicketsDistributed,
        icon: 'pi-gift',
        color: 'warning',
        format: 'number'
      }
    ];
  }
}

@Component({
  selector: 'app-promos-list',
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
    ProgressBarModule,
    LoaderComponent,
    StatsCardComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './promos-list.component.html',
  styleUrls: ['./promos-list.component.scss']
})
export class PromosListComponent implements OnInit {
  // Services injectés
  private readonly promosService = inject(PromosService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // ViewChild
  private readonly table = viewChild<Table>('dt');
  
  // Signaux
  protected readonly loading = signal(false);
  protected readonly promos = signal<PromoCode[]>([]);
  protected readonly viewMode = signal<ViewMode>('table');
  protected readonly searchQuery = signal('');
  protected readonly itemsPerPage = signal(10);
  
  // Computed values
  protected readonly enrichedPromos = computed(() => {
    return this.promos().map(promo => this.enrichPromo(promo));
  });
  
  protected readonly displayedPromos = computed(() => {
    const strategy = PromoViewStrategyFactory.create(this.viewMode());
    return strategy.render(this.filteredPromos());
  });
  
  protected readonly filteredPromos = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const promos = this.enrichedPromos();
    
    if (!query) return promos;
    
    return promos.filter(promo => 
      promo.code.toLowerCase().includes(query) ||
      promo.tickets_reward.toString().includes(query)
    );
  });
  
  protected readonly filteredCount = computed(() => this.filteredPromos().length);
  
  protected readonly promoStats = computed(() => 
    PromoStatsCalculator.calculateStats(this.enrichedPromos())
  );
  
  // Configuration
  protected readonly globalFilterFields = ['code', 'tickets_reward'];

  // Effect pour la recherche
  private readonly searchEffect = effect(() => {
    const query = this.searchQuery();
    this.table()?.filterGlobal(query, 'contains');
  });

  ngOnInit(): void {
    this.loadPromos();
  }

  /**
   * Charge les codes promos
   */
  private loadPromos(): void {
    this.loading.set(true);
    
    this.promosService.getAllPromos().subscribe({
      next: (promos) => {
        this.promos.set(promos);
        this.loading.set(false);
      },
      error: (error) => this.handleError('chargement', error)
    });
  }

  /**
   * Enrichit un code promo avec des métadonnées
   */
  private enrichPromo(promo: PromoCode): EnrichedPromoCode {
    const usagePercentage = this.promosService.calculateUsagePercentage(promo);
    const status = this.promosService.getPromoStatus(promo);
    const remainingUses = promo.usage_limit ? Math.max(0, promo.usage_limit - promo.current_uses) : Infinity;
    const priorityLevel = this.calculatePriorityLevel(promo, status);
    
    return {
      ...promo,
      status,
      usage_percentage: usagePercentage,
      remaining_uses: remainingUses === Infinity ? 0 : remainingUses,
      is_expired: status === 'exhausted',
      priority_level: priorityLevel
    };
  }

  /**
   * Calcule le niveau de priorité d'affichage
   */
  private calculatePriorityLevel(promo: PromoCode, status: PromoStatus): number {
    let priority = 0;
    
    // Plus de tickets = plus de priorité
    priority += promo.tickets_reward * 0.1;
    
    // Status influence la priorité
    switch (status) {
      case 'active': priority += 100; break;
      case 'limited': priority += 80; break;
      case 'single_use': priority += 60; break;
      case 'exhausted': priority += 20; break;
      case 'inactive': priority += 10; break;
    }
    
    // Plus d'utilisations récentes = plus de priorité
    priority += promo.current_uses * 0.5;
    
    return Math.round(priority);
  }

  /**
   * Actualise les promos
   */
  protected refreshPromos(): void {
    this.promosService.clearCache();
    this.loadPromos();
  }

  /**
   * Change le mode d'affichage
   */
  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  /**
   * Gère le filtre de recherche
   */
  protected handleGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  /**
   * Copie un code promo dans le presse-papiers
   */
  protected copyPromoCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Code copié',
        detail: `Le code "${code}" a été copié dans le presse-papiers`,
        life: 3000
      });
    }).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de copier le code',
        life: 3000
      });
    });
  }

  /**
   * Exporte les codes promos
   */
  protected exportPromos(): void {
    this.promosService.exportPromos().subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `codes_promos_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Export réussi',
          detail: 'Les codes promos ont été exportés avec succès'
        });
      },
      error: (error:any) => this.handleError('export', error)
    });
  }

  /**
   * Gère le clic sur une statistique
   */
  protected handleStatClick(statData: StatsData): void {
    console.log('Stat clicked:', statData);
  }

  /**
   * Confirme la suppression d'un code
   */
  protected confirmDelete(promo: EnrichedPromoCode): void {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer le code "${promo.code}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      accept: () => this.executeDelete(promo.id)
    });
  }

  /**
   * Exécute la suppression
   */
  private executeDelete(id: number): void {
    this.promosService.deletePromo(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Code promo supprimé avec succès'
        });
        this.refreshPromos();
      },
      error: (error: any) => this.handleError('suppression', error)
    });
  }

  /**
   * Gestion des erreurs
   */
  private handleError(operation: string, error: any): void {
    console.error(`Erreur lors du ${operation}:`, error);
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: error.message || `Impossible de ${operation === 'chargement' ? 'charger les données' : 'effectuer l\'opération'}`
    });
    this.loading.set(false);
  }

  // Méthodes utilitaires pour l'affichage
  protected getStatusLabel(status: PromoStatus): string {
    const labels = {
      active: 'Actif',
      exhausted: 'Épuisé',
      limited: 'Limité', 
      single_use: 'Usage unique',
      inactive: 'Inactif'
    };
    return labels[status];
  }

  protected getStatusSeverity(status: PromoStatus): 'success' | 'warning' | 'danger' | 'info' {
    const severities = {
      active: 'success' as const,
      limited: 'warning' as const,
      exhausted: 'danger' as const,
      single_use: 'info' as const,
      inactive: 'danger' as const
    };
    return severities[status];
  }

  protected getStatusIcon(status: PromoStatus): string {
    const icons = {
      active: 'pi-check-circle',
      limited: 'pi-exclamation-triangle',
      exhausted: 'pi-times-circle',
      single_use: 'pi-user',
      inactive: 'pi-ban'
    };
    return icons[status];
  }
}