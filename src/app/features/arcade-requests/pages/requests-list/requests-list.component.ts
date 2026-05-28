import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ArcadeRequestsService, ArcadeRequest } from '../../../../core/services/arcade-requests.service';
import { RoleService } from '../../../../core/services/role.service';
import { ButtonComponent, TagComponent } from '../../../../shared/ui';

type StatusVariant = 'success' | 'info' | 'warning' | 'danger' | 'default';

@Component({
  selector: 'app-requests-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogModule, DialogModule, ButtonComponent, TagComponent],
  providers: [ConfirmationService],
  templateUrl: './requests-list.component.html',
  styleUrl: './requests-list.component.scss'
})
export class RequestsListComponent implements OnInit {
  private readonly requestsService = inject(ArcadeRequestsService);
  private readonly roleService = inject(RoleService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  goToNewRequest(): void {
    this.router.navigate(['/arcade-machines/new']);
  }

  readonly requests = signal<ArcadeRequest[]>([]);
  readonly loading = signal(false);

  readonly isSuperAdmin = computed(() => this.roleService.isSuperAdmin());

  readonly rejectDialogOpen = signal(false);
  readonly rejectTarget = signal<ArcadeRequest | null>(null);
  readonly rejecting = signal(false);
  readonly rejectForm = this.fb.group({ reason: [''] });

  readonly pending = computed(() => this.requests().filter(r => r.status === 'pending'));
  readonly archived = computed(() => this.requests().filter(r => r.status !== 'pending'));

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.requestsService.list().subscribe({
      next: list => { this.requests.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  approve(req: ArcadeRequest): void {
    this.confirmationService.confirm({
      message: `Approuver la création de la borne "${req.nom}" pour ${req.requester?.email} ? La borne sera créée et assignée immédiatement.`,
      header: 'Approuver la demande',
      icon: 'pi pi-check',
      acceptLabel: 'Approuver',
      rejectLabel: 'Annuler',
      accept: () => {
        this.requestsService.approve(req.id).subscribe({ next: () => this.refresh() });
      }
    });
  }

  openReject(req: ArcadeRequest): void {
    this.rejectTarget.set(req);
    this.rejectForm.reset();
    this.rejectDialogOpen.set(true);
  }

  closeReject(): void {
    this.rejectDialogOpen.set(false);
    this.rejectTarget.set(null);
  }

  submitReject(): void {
    const target = this.rejectTarget();
    if (!target) return;
    const reason = this.rejectForm.value.reason?.trim() || undefined;
    this.rejecting.set(true);
    this.requestsService.reject(target.id, reason).subscribe({
      next: () => {
        this.rejecting.set(false);
        this.closeReject();
        this.refresh();
      },
      error: () => this.rejecting.set(false)
    });
  }

  statusLabel(s: ArcadeRequest['status']): string {
    return { pending: 'En attente', approved: 'Approuvée', rejected: 'Rejetée' }[s];
  }

  statusVariant(s: ArcadeRequest['status']): StatusVariant {
    return { pending: 'warning', approved: 'success', rejected: 'danger' }[s] as StatusVariant;
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
