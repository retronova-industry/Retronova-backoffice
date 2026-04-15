// src/app/features/users/pages/users-list/users-list.component.ts

import { Component, OnInit, inject, signal, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TableModule, Table } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UsersService } from '../../../../core/services/users.service';
import { User } from '../../../../core/models/user.model';
import { ButtonComponent, TagComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ConfirmDialogModule,
    ButtonComponent,
    TagComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss'
})
export class UsersListComponent implements OnInit {
  // Services injectés
  private readonly usersService = inject(UsersService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  readonly router = inject(Router);

  // ViewChild pour la table
  readonly table = viewChild<Table>('dt');

  // Signals pour l'état du composant
  readonly users = signal<User[]>([]);
  readonly filteredUsers = signal<User[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');
  readonly itemsPerPage = signal(10);

  // Configuration de la table
  readonly globalFilterFields = ['nom', 'prenom', 'pseudo', 'email'];

  // Effect pour filtrer les utilisateurs quand la recherche change
  private readonly filterEffect = effect(() => {
    const query = this.searchQuery().toLowerCase();
    const allUsers = this.users();

    if (!query) {
      this.filteredUsers.set(allUsers);
      return;
    }

    const filtered = allUsers.filter(user =>
      user.nom?.toLowerCase().includes(query) ||
      user.prenom?.toLowerCase().includes(query) ||
      user.pseudo?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );

    this.filteredUsers.set(filtered);
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  /**
   * Charge la liste des utilisateurs
   */
  private loadUsers(): void {
    this.loading.set(true);

    this.usersService.getAllUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.filteredUsers.set(users);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les utilisateurs'
        });
        this.loading.set(false);
      }
    });
  }

  /**
   * Actualise la liste des utilisateurs
   */
  refreshUsers(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Actualisation',
      detail: 'Actualisation de la liste des utilisateurs…'
    });

    this.usersService.clearCache();
    this.loadUsers();
  }

  /**
   * Applique un filtre global sur la table
   */
  applyFilterGlobal(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  /**
   * Confirme la suppression d'un utilisateur
   */
  confirmDelete(user: User): void {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.prenom} ${user.nom}" (${user.pseudo}) ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      accept: () => this.deleteUser(user.firebase_uid)
    });
  }

  /**
   * Supprime un utilisateur
   */
  private deleteUser(userId: string): void {
    this.usersService.deleteUser(userId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Utilisateur supprimé avec succès'
        });
        this.loadUsers();
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

  /**
   * Retourne les initiales d'un utilisateur
   */
  getUserInitials(user: User): string {
    const firstName = user.prenom?.charAt(0)?.toUpperCase() || '';
    const lastName = user.nom?.charAt(0)?.toUpperCase() || '';
    return `${firstName}${lastName}` || user.pseudo?.charAt(0)?.toUpperCase() || '?';
  }

  /**
   * Détermine la sévérité du tag tickets
   */
  getTicketsSeverity(balance: number): 'success' | 'warning' | 'danger' | 'info' | 'default' {
    if (balance >= 50) return 'success';
    if (balance >= 10) return 'info';
    if (balance >= 1) return 'warning';
    return 'danger';
  }

  /**
   * Formate une date
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}