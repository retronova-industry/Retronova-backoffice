// src/app/shared/components/sidebar/sidebar.component.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface NavItem {
  label: string;
  icon: string;
  routerLink: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  readonly userName = signal<string>('');
  readonly userInitials = signal<string>('');
  readonly isLoggingOut = signal(false);

  readonly navGroups: NavGroup[] = [
    {
      label: 'Gestion',
      items: [
        { label: "Bornes d'arcade", icon: 'pi pi-desktop',   routerLink: '/arcade-machines' },
        { label: 'Jeux',             icon: 'pi pi-play',      routerLink: '/games' },
        { label: 'Utilisateurs',     icon: 'pi pi-users',     routerLink: '/users' },
      ]
    },
    {
      label: 'Opérations',
      items: [
        { label: 'Parties',       icon: 'pi pi-ticket',    routerLink: '/parties' },
        { label: 'Réservations',  icon: 'pi pi-calendar',  routerLink: '/reservations' },
        { label: 'Promos',        icon: 'pi pi-tag',       routerLink: '/promos' },
        { label: 'Statistiques',  icon: 'pi pi-chart-bar', routerLink: '/statistics' },
      ]
    }
  ];

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      const name = [user.prenom, user.nom]
        .filter(Boolean)
        .join(' ')
        .trim() || user.pseudo || 'Admin';
      this.userName.set(name);

      const initials = [user.prenom?.charAt(0), user.nom?.charAt(0)]
        .filter(Boolean)
        .join('')
        .toUpperCase() || name.charAt(0).toUpperCase();
      this.userInitials.set(initials);
    }
  }

  logout(): void {
    this.isLoggingOut.set(true);
    this.authService.logout().subscribe({
      next: () => {
        this.notificationService.showSuccess('Déconnexion réussie');
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.notificationService.showError('Erreur lors de la déconnexion');
        this.isLoggingOut.set(false);
      }
    });
  }
}
