// src/app/features/promos/pages/promos-details/promos-details.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { TimelineModule } from 'primeng/timeline';
import { ChipModule } from 'primeng/chip';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { PromosService } from '../../../../core/services/promos.service';
import { PromoCode, PromoHistory } from '../../../../core/models/promo.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { StatsCardComponent, StatsData } from '../../../../shared/components/stats-card/stats-card.component';

interface PromoUsageEvent {
  readonly date: string;
  readonly icon: string;
  readonly color: string;
  readonly title: string;
  readonly subtitle?: string;
}

/**
 * Calculateur de statistiques détaillées
 */
class PromoDetailsStatsCalculator {
  static calculateDetailedStats(promo: PromoCode, history: PromoHistory[]): StatsData[] {
    const status = this.getPromoStatus(promo);
    const usageRate = promo.usage_limit 
      ? Math.round((promo.current_uses / promo.usage_limit) * 100)
      : 0;
    const remainingUses = promo.usage_limit 
      ? Math.max(0, promo.usage_limit - promo.current_uses)
      : null;
    const totalTicketsDistributed = promo.current_uses * promo.tickets_reward;
    
    const stats: StatsData[] = [
      {
        title: 'Utilisations',
        value: promo.current_uses,
        icon: 'pi-users',
        color: 'primary',
        subtitle: promo.usage_limit ? `sur ${promo.usage_limit}` : 'Illimité',
        trend: usageRate > 0 ? { value: usageRate, direction: 'up', period: '% utilisé' } : undefined
      },
      {
        title: 'Tickets distribués',
        value: totalTicketsDistributed,
        icon: 'pi-gift',
        color: 'success',
        format: 'number'
      },
      {
        title: 'Tickets par usage',
        value: promo.tickets_reward,
        icon: 'pi-ticket',
        color: 'warning'
      }
    ];
    
    if (remainingUses !== null) {
      stats.push({
        title: 'Utilisations restantes',
        value: remainingUses,
        icon: 'pi-clock',
        color: remainingUses > 0 ? 'info' : 'danger'
      });
    }
    
    return stats;
  }
  
  static getPromoStatus(promo: PromoCode): string {
    if (promo.usage_limit && promo.current_uses >= promo.usage_limit) {
      return 'exhausted';
    }
    if (promo.is_single_use_global && promo.current_uses > 0) {
      return 'exhausted';
    }
    if (promo.usage_limit && promo.current_uses >= promo.usage_limit * 0.8) {
      return 'limited';
    }
    return 'active';
  }
}

@Component({
  selector: 'app-promos-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    CardModule,
    TagModule,
    TooltipModule,
    DividerModule,
    ProgressBarModule,
    TimelineModule,
    ChipModule,
    RippleModule,
    LoaderComponent,
    StatsCardComponent
  ],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div class="page-title-section">
          <button 
            pButton 
            pRipple 
            icon="pi pi-arrow-left" 
            class="p-button-text p-button-rounded back-button"
            routerLink="/promos"
            pTooltip="Retour à la liste">
          </button>
          <h1 class="page-title">
            <i class="pi pi-ticket neon-glow"></i>
            Détails du code promo
          </h1>
        </div>
        
        @if (!loading() && promo()) {
          <div class="page-actions">
            <button 
              pButton 
              pRipple 
              icon="pi pi-copy" 
              label="Copier" 
              severity="secondary"
              outlined
              (click)="copyPromoCode()"
              pTooltip="Copier le code">
            </button>
            
            <button 
              pButton 
              pRipple 
              icon="pi pi-pencil" 
              label="Modifier" 
              severity="success"
              class="gaming-button"
              [routerLink]="['/promos/edit', promoId()]">
            </button>
          </div>
        }
      </div>

      @if (loading()) {
        <app-loader size="large">
          <div class="loading-content">
            <i class="pi pi-spin pi-cog loading-icon"></i>
            <span>Chargement des détails...</span>
          </div>
        </app-loader>
      } @else if (promo()) {
        <div class="details-content">
          <!-- En-tête avec code et statut -->
          <p-card styleClass="promo-header-card gaming-card">
            <div class="promo-header-content">
              <div class="code-section">
                <div class="code-display-large">
                  <i class="pi pi-ticket code-icon"></i>
                  <span class="code-value">{{ promo()!.code }}</span>
                </div>
                <p-tag 
                  [value]="statusLabel()" 
                  [severity]="statusSeverity()"
                  [icon]="statusIcon()"
                  styleClass="status-tag-large">
                </p-tag>
              </div>
              
              <div class="reward-section">
                <div class="reward-display">
                  <i class="pi pi-gift"></i>
                  <span class="reward-amount">{{ promo()!.tickets_reward }}</span>
                  <span class="reward-label">tickets offerts</span>
                </div>
              </div>
            </div>
            
            @if (promo()!.usage_limit) {
              <div class="usage-progress-section">
                <div class="progress-header">
                  <span class="progress-label">Progression d'utilisation</span>
                  <span class="progress-value">{{ usagePercentage() }}%</span>
                </div>
                <p-progressBar 
                  [value]="usagePercentage()"
                  [showValue]="false"
                  styleClass="usage-progress-large"
                  [style]="{'height': '10px'}">
                </p-progressBar>
                <div class="progress-details">
                  <span>{{ promo()!.current_uses }} utilisations</span>
                  <span>{{ (promo()?.usage_limit || 0) - (promo()?.current_uses || 0) }} restantes</span>
                </div>
              </div>
            }
          </p-card>

          <!-- Statistiques -->
          <div class="stats-section">
            @for (stat of promoStats(); track stat.title) {
              <app-stats-card 
                [data]="stat"
                [animated]="true"
                [gamingStyle]="true">
              </app-stats-card>
            }
          </div>

          <!-- Configuration -->
          <p-card styleClass="config-card gaming-card">
            <ng-template pTemplate="header">
              <div class="card-header">
                <h3 class="card-title">
                  <i class="pi pi-cog"></i>
                  Configuration
                </h3>
              </div>
            </ng-template>
            
            <div class="config-grid">
              <div class="config-item">
                <div class="config-icon-wrapper">
                  <i class="pi pi-users config-icon"></i>
                </div>
                <div class="config-content">
                  <h4>Usage par utilisateur</h4>
                  @if (promo()!.is_single_use_per_user) {
                    <p>Usage unique</p>
                    <small class="config-description">
                      Chaque utilisateur ne peut utiliser ce code qu'une seule fois
                    </small>
                  } @else {
                    <p>Usage multiple</p>
                    <small class="config-description">
                      Les utilisateurs peuvent utiliser ce code plusieurs fois
                    </small>
                  }
                </div>
              </div>

              <div class="config-item">
                <div class="config-icon-wrapper">
                  <i class="pi pi-globe config-icon"></i>
                </div>
                <div class="config-content">
                  <h4>Usage global</h4>
                  @if (promo()!.is_single_use_global) {
                    <p>Usage unique</p>
                    <small class="config-description">
                      Ce code ne peut être utilisé qu'une seule fois au total
                    </small>
                  } @else {
                    <p>Usage multiple</p>
                    <small class="config-description">
                      Ce code peut être utilisé plusieurs fois
                    </small>
                  }
                </div>
              </div>
              
              <div class="config-item">
                <div class="config-icon-wrapper">
                  <i class="pi pi-shield config-icon"></i>
                </div>
                <div class="config-content">
                  <h4>Limite d'utilisation</h4>
                  <p>{{ promo()!.usage_limit || 'Illimitée' }}</p>
                  <small class="config-description">
                    {{ usageLimitDescription() }}
                  </small>
                </div>
              </div>
              
              <div class="config-item">
                <div class="config-icon-wrapper">
                  <i class="pi pi-ticket config-icon"></i>
                </div>
                <div class="config-content">
                  <h4>Récompense</h4>
                  <p>{{ promo()!.tickets_reward }} tickets</p>
                  <small class="config-description">
                    Nombre de tickets crédités à chaque utilisation
                  </small>
                </div>
              </div>
            </div>
          </p-card>

          <!-- Historique d'utilisation -->
          @if (usageHistory().length > 0) {
            <p-card styleClass="history-card gaming-card">
              <ng-template pTemplate="header">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="pi pi-history"></i>
                    Historique d'utilisation
                  </h3>
                  <p-chip 
                    [label]="usageHistory().length + ' événements'" 
                    styleClass="history-count">
                  </p-chip>
                </div>
              </ng-template>
              
              <p-timeline 
                [value]="usageEvents()" 
                align="alternate"
                styleClass="usage-timeline">
                <ng-template pTemplate="marker" let-event>
                  <span class="timeline-marker" [style.backgroundColor]="event.color">
                    <i [class]="event.icon"></i>
                  </span>
                </ng-template>
                <ng-template pTemplate="content" let-event>
                  <div class="timeline-content">
                    <h4 class="timeline-title">{{ event.title }}</h4>
                    @if (event.subtitle) {
                      <p class="timeline-subtitle">{{ event.subtitle }}</p>
                    }
                    <span class="timeline-date">
                      <i class="pi pi-calendar"></i>
                      {{ formatDate(event.date) }}
                    </span>
                  </div>
                </ng-template>
              </p-timeline>
            </p-card>
          }

          <!-- Actions rapides -->
          <div class="quick-actions">
            <p-card styleClass="action-card gaming-card">
              <h4 class="action-title">Actions rapides</h4>
              <div class="action-buttons">
                <button 
                  pButton 
                  pRipple 
                  icon="pi pi-copy" 
                  label="Copier le code" 
                  severity="info"
                  outlined
                  class="action-btn"
                  (click)="copyPromoCode()">
                </button>
                
                <button 
                  pButton 
                  pRipple 
                  icon="pi pi-share-alt" 
                  label="Partager" 
                  severity="secondary"
                  outlined
                  class="action-btn"
                  (click)="sharePromoCode()">
                </button>
                
                @if (canDeactivate()) {
                  <button 
                    pButton 
                    pRipple 
                    icon="pi pi-ban" 
                    label="Désactiver" 
                    severity="danger"
                    outlined
                    class="action-btn"
                    (click)="deactivatePromoCode()">
                  </button>
                }
              </div>
            </p-card>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./promos-details.component.scss']
})
export class PromosDetailsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly promosService = inject(PromosService);
  private readonly messageService = inject(MessageService);
  
  // Signaux
  protected readonly loading = signal(false);
  protected readonly promoId = signal<number | null>(null);
  protected readonly promo = signal<PromoCode | null>(null);
  protected readonly usageHistory = signal<PromoHistory[]>([]);
  
  // Computed values
  protected readonly usageLimitDescription = computed(() => {
  const p = this.promo();
  if (!p) return '';
  return p.usage_limit 
    ? 'Nombre maximum d\'utilisations autorisées' 
    : 'Aucune limite d\'utilisation définie';
});

  protected readonly usagePercentage = computed(() => {
    const p = this.promo();
    if (!p || !p.usage_limit) return 0;
    return Math.min(100, Math.round((p.current_uses / p.usage_limit) * 100));
  });
  
  protected readonly promoStats = computed(() => {
    const p = this.promo();
    if (!p) return [];
    return PromoDetailsStatsCalculator.calculateDetailedStats(p, this.usageHistory());
  });
  
  protected readonly statusLabel = computed(() => {
    const p = this.promo();
    if (!p) return '';
    
    const status = PromoDetailsStatsCalculator.getPromoStatus(p);
    const labels: Record<string, string> = {
      active: 'Actif',
      exhausted: 'Épuisé',
      limited: 'Limité'
    };
    return labels[status] || 'Inactif';
  });
  
  protected readonly statusSeverity = computed((): 'success' | 'warning' | 'danger' => {
    const p = this.promo();
    if (!p) return 'danger';
    
    const status = PromoDetailsStatsCalculator.getPromoStatus(p);
    const severities: Record<string, 'success' | 'warning' | 'danger'> = {
      active: 'success',
      limited: 'warning',
      exhausted: 'danger'
    };
    return severities[status] || 'danger';
  });
  
  protected readonly statusIcon = computed(() => {
    const p = this.promo();
    if (!p) return 'pi-times-circle';
    
    const status = PromoDetailsStatsCalculator.getPromoStatus(p);
    const icons: Record<string, string> = {
      active: 'pi-check-circle',
      limited: 'pi-exclamation-triangle',
      exhausted: 'pi-times-circle'
    };
    return icons[status] || 'pi-ban';
  });
  
  protected readonly canDeactivate = computed(() => {
    const p = this.promo();
    return p && PromoDetailsStatsCalculator.getPromoStatus(p) !== 'exhausted';
  });
  
  protected readonly usageEvents = computed((): PromoUsageEvent[] => {
    const events: PromoUsageEvent[] = [];
    const p = this.promo();
    
    if (!p) return events;
    
    // Création du code
    events.push({
      date: new Date().toISOString(), // Simulé
      icon: 'pi pi-plus-circle',
      color: '#10b981',
      title: 'Code créé',
      subtitle: 'Le code promo a été créé et activé'
    });
    
    // Utilisations
    this.usageHistory().forEach((use, index) => {
      events.push({
        date: use.used_at,
        icon: 'pi pi-user',
        color: '#3b82f6',
        title: `Utilisation #${index + 1}`,
        subtitle: `${use.tickets_received} tickets distribués`
      });
    });
    
    // Si épuisé
    if (PromoDetailsStatsCalculator.getPromoStatus(p) === 'exhausted') {
      events.push({
        date: new Date().toISOString(), // Simulé
        icon: 'pi pi-times-circle',
        color: '#ef4444',
        title: 'Code épuisé',
        subtitle: 'La limite d\'utilisation a été atteinte'
      });
    }
    
    return events;
  });
  
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.promoId.set(+id);
      this.loadPromoDetails(+id);
    } else {
      this.router.navigate(['/promos']);
    }
  }
  
  /**
   * Charge les détails du code promo
   */
  private loadPromoDetails(id: number): void {
    this.loading.set(true);
    
    this.promosService.getPromoById(id).subscribe({
      next: (promo) => {
        this.promo.set(promo);
        this.loadUsageHistory();
      },
      error: (error) => {
        this.handleError('Impossible de charger le code promo', error);
        this.router.navigate(['/promos']);
      }
    });
  }
  
  /**
   * Charge l'historique d'utilisation
   */
  private loadUsageHistory(): void {
    // Simuler l'historique car l'API ne le fournit pas par code
    // Dans une vraie app, on aurait un endpoint /admin/promo-codes/{id}/history
    const mockHistory: PromoHistory[] = [];
    const p = this.promo();
    
    if (p && p.current_uses > 0) {
      for (let i = 0; i < Math.min(p.current_uses, 10); i++) {
        mockHistory.push({
          id: i + 1,
          code: p.code,
          tickets_received: p.tickets_reward,
          used_at: new Date(Date.now() - i * 86400000).toISOString()
        });
      }
    }
    
    this.usageHistory.set(mockHistory);
    this.loading.set(false);
  }

    /**
  * Copie le code promo dans le presse-papiers
  */
  protected copyPromoCode(): void {
    const code = this.promo()?.code;
    if (!code) return;

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
   * Partage le code promo
   */
  protected sharePromoCode(): void {
    const code = this.promo()?.code;
    if (!code) return;
    
    if (navigator.share) {
      navigator.share({
        title: 'Code promo RetroNova',
        text: `Utilisez le code ${code} pour obtenir ${this.promo()?.tickets_reward} tickets gratuits !`,
        url: window.location.href
      });
    } else {
      this.copyPromoCode();
    }
  }
  
  /**
   * Désactive le code promo
   */
  protected deactivatePromoCode(): void {
    // Implémenter la désactivation
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: 'La désactivation sera disponible prochainement'
    });
  }
  
  /**
   * Formate une date
   */
  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  /**
   * Gestion des erreurs
   */
  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: error.message || message,
      life: 5000
    });
    this.loading.set(false);
  }
}