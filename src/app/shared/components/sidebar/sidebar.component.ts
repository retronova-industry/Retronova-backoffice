import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RoleService, AdminRole } from '../../../core/services/role.service';
import { ArcadeRequestsService } from '../../../core/services/arcade-requests.service';

interface NavItem {
  label: string;
  icon: string;
  routerLink: string;
  roles?: AdminRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ALL_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Gestion',
    items: [
      { label: "Bornes d'arcade", icon: 'pi pi-desktop',  routerLink: '/arcade-machines', roles: ['super_admin', 'arcade_owner'] },
      { label: 'Jeux',            icon: 'pi pi-play',     routerLink: '/games',           roles: ['super_admin'] },
      { label: 'Utilisateurs',    icon: 'pi pi-users',    routerLink: '/users',           roles: ['super_admin'] },
    ]
  },
  {
    label: 'Opérations',
    items: [
      { label: 'Parties',      icon: 'pi pi-ticket',    routerLink: '/parties',      roles: ['arcade_owner'] },
      { label: 'Réservations', icon: 'pi pi-calendar',  routerLink: '/reservations', roles: ['arcade_owner'] },
      { label: 'Promos',       icon: 'pi pi-tag',       routerLink: '/promos',       roles: ['arcade_owner'] },
      { label: 'Statistiques', icon: 'pi pi-chart-bar', routerLink: '/statistics',   roles: ['super_admin', 'arcade_owner'] },
    ]
  },
  {
    label: 'Administration',
    items: [
      { label: 'Demandes',      icon: 'pi pi-inbox',  routerLink: '/arcade-requests', roles: ['super_admin'] },
      { label: 'Propriétaires', icon: 'pi pi-users',  routerLink: '/owners',          roles: ['super_admin'] },
      { label: 'Équipe',        icon: 'pi pi-shield', routerLink: '/team',            roles: ['super_admin'] },
    ]
  },
  {
    label: 'Mon espace',
    items: [
      { label: 'Mes demandes', icon: 'pi pi-inbox', routerLink: '/arcade-requests', roles: ['arcade_owner'] },
    ]
  }
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly arcadeRequestsService = inject(ArcadeRequestsService);
  readonly roleService = inject(RoleService);

  readonly userName = signal<string>('');
  readonly userInitials = signal<string>('');
  readonly isLoggingOut = signal(false);
  readonly pendingRequestsCount = signal<number>(0);
  private pendingPollHandle: ReturnType<typeof setInterval> | null = null;

  readonly navGroups = computed<NavGroup[]>(() => {
    const role = this.roleService.role();
    return ALL_NAV_GROUPS
      .map(group => ({
        ...group,
        items: group.items.filter(item =>
          !item.roles || item.roles.includes(role as AdminRole)
        )
      }))
      .filter(group => group.items.length > 0);
  });

  ngOnInit(): void {
    const admin = this.authService.getCurrentUser();
    if (admin) {
      const name = admin.email;
      this.userName.set(name);
      this.userInitials.set(name.charAt(0).toUpperCase());
    }

    if (admin?.role === 'super_admin') {
      this.refreshPendingRequestsCount();
      this.pendingPollHandle = setInterval(() => this.refreshPendingRequestsCount(), 60_000);
    }
  }

  ngOnDestroy(): void {
    if (this.pendingPollHandle) {
      clearInterval(this.pendingPollHandle);
      this.pendingPollHandle = null;
    }
  }

  private refreshPendingRequestsCount(): void {
    this.arcadeRequestsService.pendingCount().subscribe({
      next: ({ count }) => this.pendingRequestsCount.set(count),
      error: () => this.pendingRequestsCount.set(0)
    });
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
