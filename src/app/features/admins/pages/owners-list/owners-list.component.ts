import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { OwnerListItem, UnassignedArcade } from '../../../../core/models/admin.model';
import { ButtonComponent } from '../../../../shared/ui';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-owners-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, ConfirmDialogModule, DialogModule],
  providers: [ConfirmationService],
  templateUrl: './owners-list.component.html',
  styleUrl: './owners-list.component.scss'
})
export class OwnersListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  readonly owners = signal<OwnerListItem[]>([]);
  readonly unassigned = signal<UnassignedArcade[]>([]);
  readonly loading = signal(false);

  readonly showInviteForm = signal(false);
  readonly inviting = signal(false);
  readonly inviteSuccess = signal<string | null>(null);
  readonly inviteError = signal<string | null>(null);

  readonly assignDialogOpen = signal(false);
  readonly assignTargetOwner = signal<OwnerListItem | null>(null);
  readonly assigning = signal(false);
  readonly assignError = signal<string | null>(null);

  readonly inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    arcade_id: [null as number | null],
  });

  readonly assignForm = this.fb.group({
    arcade_id: [null as number | null, Validators.required],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.adminService.listOwners().subscribe({
      next: list => { this.owners.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.adminService.listUnassignedArcades().subscribe(a => this.unassigned.set(a));
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

    const { email, arcade_id } = this.inviteForm.value;
    this.adminService.inviteArcadeOwner(email!, arcade_id ?? null).subscribe({
      next: () => {
        this.inviting.set(false);
        this.inviteSuccess.set(`Invitation envoyée à ${email}`);
        this.inviteForm.reset();
        this.refresh();
      },
      error: (err: any) => {
        this.inviting.set(false);
        this.inviteError.set(err?.error?.detail ?? "Erreur lors de l'envoi de l'invitation");
      }
    });
  }

  openAssignDialog(owner: OwnerListItem): void {
    this.assignTargetOwner.set(owner);
    this.assignForm.reset();
    this.assignError.set(null);
    this.assignDialogOpen.set(true);
  }

  closeAssignDialog(): void {
    this.assignDialogOpen.set(false);
    this.assignTargetOwner.set(null);
  }

  submitAssign(): void {
    const owner = this.assignTargetOwner();
    const arcadeId = this.assignForm.value.arcade_id;
    if (!owner || arcadeId == null) return;
    this.assigning.set(true);
    this.assignError.set(null);
    this.adminService.assignArcadeToOwner(owner.id, arcadeId).subscribe({
      next: () => {
        this.assigning.set(false);
        this.closeAssignDialog();
        this.refresh();
      },
      error: (err: any) => {
        this.assigning.set(false);
        this.assignError.set(err?.error?.detail ?? "Erreur lors de l'assignation");
      }
    });
  }

  confirmUnassign(owner: OwnerListItem, arcadeId: number, arcadeName: string): void {
    this.confirmationService.confirm({
      message: `Désassigner la borne ${arcadeName} de ${owner.email} ?`,
      header: 'Confirmer la désassignation',
      icon: 'pi pi-times',
      acceptLabel: 'Désassigner',
      rejectLabel: 'Annuler',
      accept: () => {
        this.adminService.unassignArcadeFromOwner(owner.id, arcadeId).subscribe({
          next: () => this.refresh()
        });
      }
    });
  }

  confirmDeleteOwner(owner: OwnerListItem): void {
    this.confirmationService.confirm({
      message: `Supprimer le propriétaire ${owner.email} ? Ses bornes seront désassignées.`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.adminService.deleteAdmin(owner.id).subscribe({
          next: () => this.refresh()
        });
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
