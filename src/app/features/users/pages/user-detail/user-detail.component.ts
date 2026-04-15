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

interface UserStats {
  totalParties: number;
  victories: number;
  defeats: number;
  winRate: number;
}

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ConfirmDialogModule,
    ButtonComponent,
    CardComponent,
    TagComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent implements OnInit {
  user: User | null = null;
  userParties: Party[] = [];
  stats: UserStats = { totalParties: 0, victories: 0, defeats: 0, winRate: 0 };
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
    if (this.userId) this.loadUserData();
  }

  private loadUserData(): void {
    if (!this.userId) return;
    this.loading = true;
    this.usersService.getUserById(this.userId).subscribe({
      next: (user) => { this.user = user; this.loadUserParties(); },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger l\'utilisateur' });
        this.router.navigate(['/users']);
      }
    });
  }

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
      error: () => { this.loading = false; }
    });
  }

  private calculateStats(): void {
    if (!this.user) return;
    const completed = this.userParties.filter(p => p.done);
    this.stats.totalParties = completed.length;
    completed.forEach(party => {
      const isP1 = party.player1_id === this.user!.id;
      const userScore = isP1 ? party.p1_score : party.p2_score;
      const oppScore  = isP1 ? party.p2_score : party.p1_score;
      if (userScore != null && oppScore != null) {
        if (userScore > oppScore) this.stats.victories++;
        else if (userScore < oppScore) this.stats.defeats++;
      }
    });
    this.stats.winRate = this.stats.totalParties > 0
      ? Math.round((this.stats.victories / this.stats.totalParties) * 100)
      : 0;
  }

  confirmDelete(): void {
    if (!this.user) return;
    this.confirmationService.confirm({
      message: `Supprimer "${this.user.nom || ''} ${this.user.prenom || ''}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteUser()
    });
  }

  private deleteUser(): void {
    if (!this.user) return;
    this.usersService.deleteUser(this.userId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur supprimé' });
        this.router.navigate(['/users']);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer l\'utilisateur' });
      }
    });
  }

  getUserInitials(user: User): string {
    const f = user.prenom?.charAt(0)?.toUpperCase() || '';
    const l = user.nom?.charAt(0)?.toUpperCase() || '';
    return `${f}${l}` || user.pseudo?.charAt(0)?.toUpperCase() || '?';
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getGameName(gameId: string): string {
    return 'Jeu ' + gameId.substring(0, 8);
  }

  getOpponentName(party: Party): string {
    if (!this.user) return 'N/A';
    const isP1 = party.player1_id === this.user.id;
    const oppId = isP1 ? party.player2_id : party.player1_id;
    return 'Joueur ' + oppId.toString().substring(0, 8);
  }

  getUserScore(party: Party): number {
    if (!this.user) return 0;
    return party.player1_id === this.user.id ? (party.p1_score || 0) : (party.p2_score || 0);
  }

  getOpponentScore(party: Party): number {
    if (!this.user) return 0;
    return party.player1_id === this.user.id ? (party.p2_score || 0) : (party.p1_score || 0);
  }

  getResultLabel(party: Party): string {
    if (!party.done) return 'En cours';
    const u = this.getUserScore(party);
    const o = this.getOpponentScore(party);
    if (u > o) return 'Victoire';
    if (u < o) return 'Défaite';
    return 'Égalité';
  }

  getResultSeverity(party: Party): 'success' | 'danger' | 'warning' | 'info' {
    const r = this.getResultLabel(party);
    if (r === 'Victoire') return 'success';
    if (r === 'Défaite')  return 'danger';
    if (r === 'Égalité')  return 'warning';
    return 'info';
  }
}
