// src/app/features/promos/pages/promos-details/promos-details.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MessageService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { PromosService } from '../../../../core/services/promos.service';
import { PromoCode, PromoHistory } from '../../../../core/models/promo.model';
import { ButtonComponent, CardComponent, TagComponent } from '../../../../shared/ui';

function getPromoStatus(promo: PromoCode): string {
  if (promo.usage_limit && promo.current_uses >= promo.usage_limit) return 'exhausted';
  if (promo.is_single_use_global && promo.current_uses > 0) return 'exhausted';
  if (promo.usage_limit && promo.current_uses >= promo.usage_limit * 0.8) return 'limited';
  return 'active';
}

@Component({
  selector: 'app-promos-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    TagComponent,
    MenuModule
  ],
  templateUrl: './promos-details.component.html',
  styleUrls: ['./promos-details.component.scss']
})
export class PromosDetailsComponent implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly promosService = inject(PromosService);
  private readonly messageService = inject(MessageService);
  
  // Signaux
  protected readonly loading = signal(false);
  protected readonly promoId = signal<number | null>(null);
  protected readonly promo = signal<PromoCode | null>(null);
  protected readonly usageHistory = signal<PromoHistory[]>([]);
  
  // Computed values
  protected readonly usagePercentage = computed(() => {
    const p = this.promo();
    if (!p || !p.usage_limit) return 0;
    return Math.min(100, Math.round((p.current_uses / p.usage_limit) * 100));
  });
  
  protected readonly statusLabel = computed(() => {
    const p = this.promo();
    if (!p) return '';

    if (!p.is_active) return 'Inactif';

    const status = getPromoStatus(p);
    const labels: Record<string, string> = {
      active: 'Actif',
      exhausted: 'Épuisé',
      limited: 'Limité'
    };
    return labels[status] || 'Inactif';
  });
  
  protected readonly statusSeverity = computed((): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
    const p = this.promo();
    if (!p) return 'danger';

    if (!p.is_active) return 'danger';

    const status = getPromoStatus(p);
    const severities: Record<string, 'success' | 'warning' | 'danger'> = {
      active: 'success',
      limited: 'warning',
      exhausted: 'danger'
    };
    return severities[status] || 'danger';
  });
  
  protected readonly canDeactivate = computed(() => {
    const p = this.promo();
    return p && p.is_active && getPromoStatus(p) !== 'exhausted';
  });

  protected readonly canActivate = computed(() => {
    const p = this.promo();
    return p && !p.is_active;
  });
  
  ngOnInit(): void {
    this.buildShareMenu();
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
   * Items du menu de partage
   */
  protected shareMenuItems: MenuItem[] = [];

  /**
   * Construit dynamiquement le menu de partage selon les capacités de la plateforme
   */
  private buildShareMenu(): void {
    const items: MenuItem[] = [];

    // Partage web / liens directs qui ouvrent l'app si elle est installée
    items.push(
      { label: 'WhatsApp', icon: 'pi pi-whatsapp', command: () => this.shareToWhatsApp() },
      { label: 'Facebook', icon: 'pi pi-facebook', command: () => this.shareToFacebook() },
      { label: 'X (Twitter)', icon: 'pi pi-twitter', command: () => this.shareToX() },
      { label: 'Gmail', icon: 'pi pi-envelope', command: () => this.shareToGmail() },
      { label: 'Outlook', icon: 'pi pi-envelope', command: () => this.shareToOutlook() }
    );

    items.push({ separator: true }, { label: 'Envoyer par email', icon: 'pi pi-envelope', command: () => this.shareViaEmail() });

    this.shareMenuItems = items;
  }

  private getShareText(): { text: string; url: string; subject: string } {
    const code = this.promo()?.code || '';
    const tickets = this.promo()?.tickets_reward ?? '';
    const text = `Utilisez le code ${code} pour obtenir ${tickets} tickets gratuits sur RetroNova !`;
    return { text, url: window.location.href, subject: 'Code promo RetroNova' };
  }

  protected shareToWhatsApp(): void {
    const { text } = this.getShareText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  protected shareToFacebook(): void {
    const { text, url } = this.getShareText();
    const q = encodeURIComponent(text);
    const u = encodeURIComponent(url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${q}`, '_blank');
  }

  protected shareToX(): void {
    const { text, url } = this.getShareText();
    const t = encodeURIComponent(text);
    const u = encodeURIComponent(url);
    window.open(`https://twitter.com/intent/tweet?text=${t}&url=${u}`, '_blank');
  }

  protected shareToGmail(): void {
    const { text, subject } = this.getShareText();
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(text);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${s}&body=${b}`, '_blank');
  }

  protected shareToOutlook(): void {
    const { text, subject } = this.getShareText();
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(text);
    window.open(`https://outlook.live.com/owa/?path=/mail/action/compose&subject=${s}&body=${b}`, '_blank');
  }

  /**
   * Partage par email via mailto (corps maîtrisé)
   */
  protected shareViaEmail(): void {
    const code = this.promo()?.code;
    const tickets = this.promo()?.tickets_reward;
    if (!code) return;

    const subject = encodeURIComponent('Code promo RetroNova');
    const body = encodeURIComponent(
      `Utilisez le code ${code} pour obtenir ${tickets} tickets gratuits sur RetroNova !`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }
  
  /**
   * Active ou désactive le code promo
   */
  protected togglePromoActive(): void {
    const id = this.promoId();
    const p = this.promo();
    if (!id || !p) return;

    const isCurrentlyActive = p.is_active;

    this.promosService.togglePromoActive(id).subscribe({
      next: () => {
        // Recharger le promo depuis l'API pour avoir les données à jour
        this.promosService.getPromoById(id).subscribe({
          next: (fresh) => this.promo.set(fresh),
          error: () => {
            // En cas d'échec du rechargement, mettre à jour is_active manuellement
            this.promo.set({ ...p, is_active: !isCurrentlyActive });
          }
        });
        this.messageService.add({
          severity: isCurrentlyActive ? 'warn' : 'success',
          summary: isCurrentlyActive ? 'Code désactivé' : 'Code activé',
          detail: isCurrentlyActive
            ? `Le code "${p.code}" a été désactivé`
            : `Le code "${p.code}" a été activé`,
          life: 3000
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.message || 'Impossible de modifier le statut du code promo',
          life: 5000
        });
      }
    });
  }

  /**
   * Désactive le code promo (kept for legacy calls)
   */
  protected deactivatePromoCode(): void {
    this.togglePromoActive();
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