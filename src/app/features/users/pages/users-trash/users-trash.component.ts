import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AdminService } from '../../../../core/services/admin.service';
import { User } from '../../../../core/models/user.model';
import { ButtonComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-users-trash',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmDialogModule, ButtonComponent],
  providers: [ConfirmationService],
  templateUrl: './users-trash.component.html',
  styleUrl: './users-trash.component.scss'
})
export class UsersTrashComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly users = signal<User[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.adminService.getDeletedUsers().subscribe({
      next: list => { this.users.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  confirmRestore(user: User): void {
    this.confirmationService.confirm({
      message: `Restaurer l'utilisateur ${user.pseudo} ?`,
      header: 'Confirmer la restauration',
      icon: 'pi pi-undo',
      acceptLabel: 'Restaurer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.adminService.restoreUser(user.id).subscribe({
          next: () => this.refresh()
        });
      }
    });
  }

  formatDate(date?: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
