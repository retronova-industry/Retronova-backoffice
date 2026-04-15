// src/app/features/promos/pages/promos-list/promos-list.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PromosService } from '../../../../core/services/promos.service';
import { PromoCode } from '../../../../core/models/promo.model';
import { ButtonComponent, TagComponent } from '../../../../shared/ui';

interface EnrichedPromoCode extends PromoCode {
  readonly status: PromoStatus;
  readonly usage_percentage: number;
  readonly remaining_uses: number;
  readonly is_expired: boolean;
  readonly priority_level: number;
}

type PromoStatus = 'active' | 'exhausted' | 'limited' | 'single_use' | 'inactive';

@Component({
  selector: 'app-promos-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ConfirmDialogModule,
    ButtonComponent,
    TagComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './promos-list.component.html',
  styleUrls: ['./promos-list.component.scss']
})
export class PromosListComponent implements OnInit {
  protected readonly router = inject(Router);
  private readonly promosService = inject(PromosService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  protected readonly loading = signal(false);
  protected readonly promos = signal<PromoCode[]>([]);
  protected readonly searchQuery = signal('');

  protected readonly enrichedPromos = computed(() =>
    this.promos().map(promo => this.enrichPromo(promo))
  );

  protected readonly filteredPromos = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const promos = this.enrichedPromos();
    if (!query) return promos;
    return promos.filter(p =>
      p.code.toLowerCase().includes(query) ||
      p.tickets_reward.toString().includes(query)
    );
  });

  protected readonly displayedPromos = computed(() =>
    [...this.filteredPromos()].sort((a, b) => b.priority_level - a.priority_level)
  );

  protected readonly filteredCount = computed(() => this.filteredPromos().length);

  ngOnInit(): void {
    this.loadPromos();
  }

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

  private enrichPromo(promo: PromoCode): EnrichedPromoCode {
    const usagePercentage = this.promosService.calculateUsagePercentage(promo);
    const status = this.promosService.getPromoStatus(promo);
    const remainingUses = promo.usage_limit
      ? Math.max(0, promo.usage_limit - promo.current_uses)
      : Infinity;
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

  private calculatePriorityLevel(promo: PromoCode, status: PromoStatus): number {
    let priority = promo.tickets_reward * 0.1 + promo.current_uses * 0.5;
    const boost: Record<PromoStatus, number> = {
      active: 100, limited: 80, single_use: 60, exhausted: 20, inactive: 10
    };
    return Math.round(priority + (boost[status] ?? 0));
  }

  protected refreshPromos(): void {
    this.promosService.clearCache();
    this.loadPromos();
  }

  protected handleGlobalFilter(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

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
      error: (error: any) => this.handleError('export', error)
    });
  }

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

  private handleError(operation: string, error: any): void {
    console.error(`Erreur lors du ${operation}:`, error);
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: error.message || `Impossible d'effectuer l'opération`
    });
    this.loading.set(false);
  }

  protected getStatusLabel(status: PromoStatus): string {
    const labels: Record<PromoStatus, string> = {
      active: 'Actif',
      exhausted: 'Épuisé',
      limited: 'Limité',
      single_use: 'Usage unique',
      inactive: 'Inactif'
    };
    return labels[status];
  }

  protected getStatusSeverity(status: PromoStatus): 'success' | 'warning' | 'danger' | 'info' {
    const severities: Record<PromoStatus, 'success' | 'warning' | 'danger' | 'info'> = {
      active: 'success',
      limited: 'warning',
      exhausted: 'danger',
      single_use: 'info',
      inactive: 'danger'
    };
    return severities[status];
  }
}
