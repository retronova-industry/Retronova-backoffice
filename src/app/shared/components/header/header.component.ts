// src/app/shared/components/header/header.component.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonComponent } from '../../ui';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  template: `
    <div class="header-container">
      <div class="logo">
        <a [routerLink]="'/'">
          <h1>Retro Nova - Back Office</h1>
        </a>
      </div>
      <div class="user-info">
        <span>{{ userName() }}</span>
        <ui-button
          icon="pi pi-sign-out"
          variant="ghost-danger"
          size="sm"
          [rounded]="true"
          [loading]="isLoggingOut()"
          tooltip="Se déconnecter"
          (clicked)="logout()">
        </ui-button>
      </div>
    </div>
  `,
  styles: [`
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 1.5rem;
      height: 60px;
      background-color: var(--surface-card);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      border-bottom: 1px solid var(--surface-border);
    }
    
    .logo a {
      text-decoration: none;
      color: var(--text-color);
    }
    
    .logo h1 {
      margin: 0;
      font-size: 1.375rem;
      font-weight: 600;
      letter-spacing: -0.025em;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .user-info span {
      font-weight: 500;
      color: var(--text-color);
      font-size: 0.875rem;
    }
    
  `]
})
export class HeaderComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  readonly userName = signal<string>('');
  readonly isLoggingOut = signal(false);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName.set(user.nom || user.prenom)
    }
  }

  logout(): void {
    this.isLoggingOut.set(true);
    
    this.authService.logout().subscribe({
      next: () => {
        this.notificationService.showSuccess('Déconnexion réussie');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors de la déconnexion');
        console.error('Logout error:', error);
        this.isLoggingOut.set(false);
      }
    });
  }
}