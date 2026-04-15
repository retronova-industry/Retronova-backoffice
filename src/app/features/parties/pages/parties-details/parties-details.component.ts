import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonComponent, TagComponent, CardComponent } from '../../../../shared/ui';
import { Party } from '../../../../core/models/party.model';

interface PartyDisplay extends Party {
  player1_name?: string;
  player2_name?: string;
  game_name?: string;
  machine_name?: string;
}

@Component({
  selector: 'app-parties-details',
  standalone: true,
  imports: [CommonModule, ButtonComponent, TagComponent, CardComponent],
  template: `
    <div class="details-content">

      <!-- Identité -->
      <ui-card>
        <div class="status-stripe"
          [class.status-stripe--done]="party.done"
          [class.status-stripe--active]="!party.done && !party.cancel"
          [class.status-stripe--cancelled]="party.cancel">
        </div>
        <div class="party-identity">
          <div class="party-identity-top">
            <span class="party-game">{{ party.game_name || 'Jeu inconnu' }}</span>
            <ui-tag
              [label]="getStatusLabel()"
              [variant]="getStatusVariant()" />
          </div>
          <span class="party-id">ID {{ party.id }}</span>
        </div>
      </ui-card>

      <!-- Métriques (si terminée) -->
      @if (party.done) {
        <div class="metrics-strip">
          <div class="metric">
            <span class="metric-value">{{ party.p1_score || 0 }}</span>
            <span class="metric-label">Score J1</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric">
            <span class="metric-value">{{ party.p2_score || 0 }}</span>
            <span class="metric-label">Score J2</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric">
            <span class="metric-value">{{ party.total_score || 0 }}</span>
            <span class="metric-label">Total</span>
          </div>
        </div>
      }

      <!-- Configuration -->
      <ui-card>
        <div class="section-label">Détails</div>
        <div class="config-rows">
          <div class="config-row">
            <span class="config-key">Joueur 1</span>
            <span class="config-val">{{ party.player1_name || party.player1_id }}</span>
          </div>
          <div class="config-row">
            <span class="config-key">Joueur 2</span>
            <span class="config-val">{{ party.player2_name || party.player2_id || '—' }}</span>
          </div>
          <div class="config-row">
            <span class="config-key">Borne</span>
            <span class="config-val">{{ party.machine_name || party.machine_id }}</span>
          </div>
          <div class="config-row">
            <span class="config-key">Code</span>
            <span class="config-val mono">{{ party.password?.toString() || 'N/A' }}</span>
          </div>
          <div class="config-row">
            <span class="config-key">Bar</span>
            <span class="config-val">{{ party.bar ? 'Oui' : 'Non' }}</span>
          </div>
          <div class="config-row">
            <span class="config-key">Début</span>
            <span class="config-val mono">{{ formatDate(party.created_at) }}</span>
          </div>
          @if (party.done) {
            <div class="config-row config-row--last">
              <span class="config-key">Fin</span>
              <span class="config-val mono">{{ formatDate(party.updated_at) }}</span>
            </div>
          }
        </div>
      </ui-card>

      <!-- Action -->
      <div class="dialog-actions">
        <ui-button label="Fermer" variant="ghost" (clicked)="close()" />
      </div>

    </div>
  `,
  styles: [`
    .details-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-2) 0 var(--space-2);
    }

    /* Identity card */
    .status-stripe {
      height: 3px;
      &--active    { background: var(--green-40); }
      &--done      { background: var(--blue-40); }
      &--cancelled { background: var(--gray-30); }
    }

    .party-identity {
      padding: var(--space-4) var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .party-identity-top {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .party-game {
      font-size: var(--text-xl);
      font-weight: var(--weight-bold);
      color: var(--text-body);
    }

    .party-id {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--text-muted);
      letter-spacing: 0.06em;
    }

    /* Metrics strip */
    .metrics-strip {
      display: flex;
      align-items: stretch;
      background: var(--white);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .metric {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-4) var(--space-5);
      cursor: default;
      &:hover .metric-value { color: var(--blue-60); }
    }

    .metric-value {
      font-family: var(--font-mono);
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-body);
      line-height: 1;
      transition: color var(--duration-fast) var(--ease-default);
    }

    .metric-label {
      font-size: var(--text-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .metric-divider {
      width: 1px;
      background: var(--border-subtle);
      flex-shrink: 0;
    }

    /* Config rows */
    .section-label {
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: var(--space-3);
      padding: var(--space-4) var(--space-5) 0;
    }

    .config-rows {
      display: flex;
      flex-direction: column;
      padding: 0 var(--space-5) var(--space-2);
    }

    .config-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border-subtle);

      &--last { border-bottom: none; }
    }

    .config-key {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .config-val {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-body);

      &.mono {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        letter-spacing: 0.04em;
      }
    }

    /* Actions */
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class PartiesDetailsComponent {
  party: PartyDisplay;

  constructor(
    private ref: DynamicDialogRef,
    private config: DynamicDialogConfig
  ) {
    this.party = this.config.data?.party as PartyDisplay;
  }

  getStatusLabel(): string {
    if (this.party.cancel) return 'Annulée';
    if (this.party.done) return 'Terminée';
    return 'En cours';
  }

  getStatusVariant(): 'success' | 'info' | 'default' {
    if (this.party.cancel) return 'default';
    if (this.party.done) return 'info';
    return 'success';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  close(): void {
    this.ref.close();
  }
}
