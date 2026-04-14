import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonComponent, CardComponent, TagComponent } from '../../../../shared/ui';
import { UsersService } from '../../../../core/services/users.service';
import { PartiesService } from '../../../../core/services/parties.service';
import { User } from '../../../../core/models/user.model';
import { Party } from '../../../../core/models/party.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';

interface UserStats {
  totalParties: number;
  victories: number;
  defeats: number;
  winRate: number;
  totalTicketsUsed: number;
  favoriteGame?: string;
}

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ConfirmDialogModule,
    LoaderComponent,
    ButtonComponent,
    CardComponent,
    TagComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Détails de l'utilisateur</h1>
        <div class="page-actions">
          <ui-button
            icon="pi pi-arrow-left"
            label="Retour"
            variant="ghost"
            (clicked)="router.navigate(['/users'])">
          </ui-button>
        </div>
      </div>

      @if (loading) {
        <app-loader size="large" [fullScreen]="true"></app-loader>
      } @else if (user) {
        <div class="user-detail-content">
          <!-- Informations principales -->
          <ui-card>
            <div class="user-header">
              <div class="user-avatar">
                <i class="pi pi-user"></i>
              </div>
              <div class="user-identity">
                <h2>{{ user.nom || 'Prénom non défini' }} {{ user.prenom || 'Nom non défini' }}</h2>
                <p class="user-id">ID Public: <strong>{{ user.firebase_uid }}</strong></p>
              </div>
              <div class="user-actions">
                <ui-button
                  icon="pi pi-pencil"
                  label="Modifier"
                  variant="primary"
                  (clicked)="router.navigate(['/users/edit', user.id])">
                </ui-button>
                <ui-button
                  icon="pi pi-trash"
                  label="Supprimer"
                  variant="danger"
                  (clicked)="confirmDelete()">
                </ui-button>
              </div>
            </div>

            <hr class="divider" />

            <div class="user-details-grid">
              <div class="detail-item">
                <label>Firebase ID</label>
                <p class="mono">{{ user.firebase_uid }}</p>
              </div>
              <div class="detail-item">
                <label>Tickets disponibles</label>
                <span class="ticket-badge">{{ user.tickets_balance }}</span>
              </div>
              <div class="detail-item">
                <label>Date de création</label>
                <p>{{ formatDate(user.created_at) }}</p>
              </div>
            </div>
          </ui-card>

          <!-- Statistiques -->
          <ui-card>
            <div card-header>
              <h3>Statistiques</h3>
            </div>
            <div class="stats-grid">
              <div class="stat-item">
                <i class="pi pi-ticket stat-icon"></i>
                <div class="stat-content">
                  <h3>{{ stats.totalParties }}</h3>
                  <p>Parties jouées</p>
                </div>
              </div>
              <div class="stat-item">
                <i class="pi pi-trophy stat-icon color-success"></i>
                <div class="stat-content">
                  <h3>{{ stats.victories }}</h3>
                  <p>Victoires</p>
                </div>
              </div>
              <div class="stat-item">
                <i class="pi pi-times-circle stat-icon color-danger"></i>
                <div class="stat-content">
                  <h3>{{ stats.defeats }}</h3>
                  <p>Défaites</p>
                </div>
              </div>
              <div class="stat-item">
                <i class="pi pi-percentage stat-icon color-primary"></i>
                <div class="stat-content">
                  <h3>{{ stats.winRate }}%</h3>
                  <p>Taux de victoire</p>
                </div>
              </div>
            </div>
          </ui-card>

          <!-- Historique des parties -->
          <ui-card>
            <div card-header class="card-header-custom">
              <h3>Historique des parties</h3>
              <ui-tag [label]="userParties.length + ' parties'" variant="info"></ui-tag>
            </div>

            <p-table [value]="userParties" [rows]="10" [paginator]="true"
                     [rowHover]="true" [tableStyle]="{'min-width': '50rem'}"
                     [showCurrentPageReport]="true"
                     currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} parties">
              <ng-template pTemplate="header">
                <tr>
                  <th>Date</th>
                  <th>Jeu</th>
                  <th>Adversaire</th>
                  <th>Score</th>
                  <th>Résultat</th>
                  <th>Statut</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-party>
                <tr>
                  <td>{{ formatDate(party.created_at) }}</td>
                  <td>{{ getGameName(party.game_id) }}</td>
                  <td>{{ getOpponentName(party) }}</td>
                  <td>
                    <span class="score">
                      {{ getUserScore(party) }} - {{ getOpponentScore(party) }}
                    </span>
                  </td>
                  <td>
                    <ui-tag [variant]="getResultSeverity(party)"
                            [label]="getResultLabel(party)"></ui-tag>
                  </td>
                  <td>
                    <ui-tag [variant]="party.done ? 'success' : 'warning'"
                            [label]="party.done ? 'Terminée' : 'En cours'"></ui-tag>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="6" class="empty-message">
                    Aucune partie trouvée
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </ui-card>
        </div>
      }
    </div>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .user-detail-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .user-header {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      margin-bottom: var(--space-4);
    }

    .user-avatar {
      width: 72px;
      height: 72px;
      background-color: var(--blue-60);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      i {
        font-size: 2rem;
        color: white;
      }
    }

    .user-identity {
      flex: 1;

      h2 {
        margin: 0 0 var(--space-1) 0;
        font-size: var(--text-xl);
        font-weight: 600;
        color: var(--gray-80);
      }

      .user-id {
        color: var(--text-secondary);
        margin: 0;
        font-size: var(--text-sm);
      }
    }

    .user-actions {
      display: flex;
      gap: var(--space-3);
    }

    .divider {
      border: none;
      border-top: 1px solid var(--border-default);
      margin: var(--space-4) 0;
    }

    .user-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-6);
    }

    .detail-item {
      label {
        display: block;
        color: var(--text-secondary);
        font-size: var(--text-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: var(--space-1);
      }

      p {
        margin: 0;
        font-weight: 500;
        color: var(--gray-80);
      }

      .mono {
        font-family: var(--font-mono);
        font-size: var(--text-sm);
        word-break: break-all;
      }
    }

    .ticket-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--blue-60);
      color: white;
      font-weight: 700;
      font-family: var(--font-mono);
      font-size: var(--text-lg);
      padding: var(--space-1) var(--space-4);
      border-radius: var(--radius-full);
      min-width: 48px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--space-4);
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--gray-10);
      border-radius: var(--radius-md);

      .stat-icon {
        font-size: 1.75rem;
        color: var(--blue-60);

        &.color-success { color: var(--green-50); }
        &.color-danger  { color: var(--red-50); }
        &.color-primary { color: var(--blue-60); }
      }

      .stat-content {
        h3 {
          margin: 0;
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--gray-80);
          font-family: var(--font-mono);
        }

        p {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }
      }
    }

    .card-header-custom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;

      h3 {
        margin: 0;
        font-size: var(--text-base);
        font-weight: 600;
        color: var(--gray-80);
      }
    }

    .score {
      font-weight: 600;
      font-family: var(--font-mono);
    }

    .empty-message {
      text-align: center;
      padding: var(--space-8);
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      .user-header {
        flex-direction: column;
        text-align: center;
      }

      .user-actions {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class UserDetailComponent implements OnInit {
  user: User | null = null;
  userParties: Party[] = [];
  stats: UserStats = {
    totalParties: 0,
    victories: 0,
    defeats: 0,
    winRate: 0,
    totalTicketsUsed: 0
  };
  loading = true;
  userId?: string;
  
  constructor(
    private route: ActivatedRoute,
    protected router: Router,
    private usersService: UsersService,
    private partiesService: PartiesService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}
  
  ngOnInit(): void {
    this.userId = this.route.snapshot.params['id'];
    if (this.userId) {
      this.loadUserData();
    }
  }
  
  /**
   * Charge les données de l'utilisateur et ses parties
   */
  private loadUserData(): void {
    if (!this.userId) return;
    
    this.loading = true;
    this.usersService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.loadUserParties();
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'utilisateur:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les données de l\'utilisateur'
        });
        this.router.navigate(['/users']);
      }
    });
  }
  
  /**
   * Charge l'historique des parties de l'utilisateur
   */
  private loadUserParties(): void {
    if (!this.user) return;
    
    this.partiesService.getAllParties().subscribe({
      next: (parties) => {
        this.userParties = parties.filter(p => 
          p.player1_id === this.user!.id || p.player2_id === this.user!.id
        );
        this.calculateStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des parties:', error);
        this.loading = false;
      }
    });
  }
  
  /**
   * Calcule les statistiques de l'utilisateur
   */
  private calculateStats(): void {
    if (!this.user) return;
    
    const completedParties = this.userParties.filter(p => p.done);
    this.stats.totalParties = completedParties.length;
    
    completedParties.forEach(party => {
      const isPlayer1 = party.player1_id === this.user!.id;
      const userScore = isPlayer1 ? party.p1_score : party.p2_score;
      const opponentScore = isPlayer1 ? party.p2_score : party.p1_score;
      
      if (userScore && opponentScore) {
        if (userScore > opponentScore) {
          this.stats.victories++;
        } else if (userScore < opponentScore) {
          this.stats.defeats++;
        }
      }
    });
    
    this.stats.winRate = this.stats.totalParties > 0 
      ? Math.round((this.stats.victories / this.stats.totalParties) * 100)
      : 0;
    
    this.stats.totalTicketsUsed = this.stats.totalParties;
  }
  
  /**
   * Affiche la boîte de dialogue de confirmation de suppression
   */
  confirmDelete(): void {
    if (!this.user) return;
    
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer l'utilisateur "${this.user.nom || ''} ${this.user.prenom || ''}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteUser()
    });
  }
  
  /**
   * Supprime l'utilisateur
   */
  private deleteUser(): void {
    if (!this.user) return;
    
    this.usersService.deleteUser(this.userId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'L\'utilisateur a été supprimé avec succès'
        });
        this.router.navigate(['/users']);
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de supprimer l\'utilisateur'
        });
      }
    });
  }
  
  // Méthodes utilitaires pour l'affichage
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  }
  
  getGameName(gameId: string): string {
    return 'Jeu ' + gameId.substring(0, 8);
  }
  
  getOpponentName(party: Party): string {
    if (!this.user) return 'N/A';
    const isPlayer1 = party.player1_id === this.user.id;
    const opponentId = isPlayer1 ? party.player2_id : party.player1_id;
    return 'Joueur ' + opponentId.toString().substring(0, 8);
  }
  
  getUserScore(party: Party): number {
    if (!this.user) return 0;
    const isPlayer1 = party.player1_id === this.user.id;
    return isPlayer1 ? (party.p1_score || 0) : (party.p2_score || 0);
  }
  
  getOpponentScore(party: Party): number {
    if (!this.user) return 0;
    const isPlayer1 = party.player1_id === this.user.id;
    return isPlayer1 ? (party.p2_score || 0) : (party.p1_score || 0);
  }
  
  getResultLabel(party: Party): string {
    if (!party.done) return 'En cours';
    
    const userScore = this.getUserScore(party);
    const opponentScore = this.getOpponentScore(party);
    
    if (userScore > opponentScore) return 'Victoire';
    if (userScore < opponentScore) return 'Défaite';
    return 'Égalité';
  }
  
  getResultSeverity(party: Party): 'success' | 'danger' | 'warning' | 'info' | 'default' {
    const result = this.getResultLabel(party);
    switch (result) {
      case 'Victoire': return 'success';
      case 'Défaite': return 'danger';
      case 'Égalité': return 'warning';
      default: return 'info';
    }
  }
}