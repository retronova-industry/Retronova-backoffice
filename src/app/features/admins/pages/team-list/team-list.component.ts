import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminListItem } from '../../../../core/models/admin.model';
import { ButtonComponent, TagComponent } from '../../../../shared/ui';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TagComponent, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './team-list.component.html',
  styleUrl: './team-list.component.scss'
})
export class TeamListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  readonly admins = signal<AdminListItem[]>([]);
  readonly loading = signal(false);
  readonly showInviteForm = signal(false);
  readonly inviting = signal(false);
  readonly inviteSuccess = signal<string | null>(null);
  readonly inviteError = signal<string | null>(null);

  readonly inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins(): void {
    this.loading.set(true);
    this.adminService.listAdmins('super_admin').subscribe({
      next: admins => { this.admins.set(admins); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  toggleInviteForm(): void {
    this.showInviteForm.update(v => !v);
    this.inviteSuccess.set(null);
    this.inviteError.set(null);
    this.inviteForm.reset();
  }

  submitInvite(): void {
    if (this.inviteForm.invalid) return;
    this.inviting.set(true);
    this.inviteSuccess.set(null);
    this.inviteError.set(null);

    const { email } = this.inviteForm.value;
    this.adminService.inviteSuperAdmin(email!).subscribe({
      next: () => {
        this.inviting.set(false);
        this.inviteSuccess.set(`Invitation envoyée à ${email}`);
        this.inviteForm.reset();
        this.loadAdmins();
      },
      error: (err: any) => {
        this.inviting.set(false);
        this.inviteError.set(err?.error?.detail ?? "Erreur lors de l'envoi de l'invitation");
      }
    });
  }

  confirmDelete(admin: AdminListItem): void {
    this.confirmationService.confirm({
      message: `Supprimer le compte super_admin de ${admin.email} ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.adminService.deleteAdmin(admin.id).subscribe({
          next: () => this.loadAdmins()
        });
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
