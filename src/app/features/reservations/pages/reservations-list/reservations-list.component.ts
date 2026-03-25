import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { ReservationsService } from '../../../../core/services/reservations.service';
import { ReservationResponse, ReservationStatus } from '../../../../core/models/reservation.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-reservations-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TagModule,
    ConfirmDialogModule,
    TooltipModule,
    SelectButtonModule,
    LoaderComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './reservations-list.component.html',
  styleUrl: './reservations-list.component.scss'
})
export class ReservationsListComponent implements OnInit {
  private readonly reservationsService = inject(ReservationsService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly notificationService = inject(NotificationService);

  readonly loading = signal(false);
  readonly reservations = signal<ReservationResponse[]>([]);
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<string>('all');

  readonly statusOptions = [
    { label: 'Toutes', value: 'all' },
    { label: 'En attente', value: ReservationStatus.WAITING },
    { label: 'En cours', value: ReservationStatus.PLAYING },
    { label: 'Terminées', value: ReservationStatus.COMPLETED },
    { label: 'Annulées', value: ReservationStatus.CANCELLED }
  ];

  readonly filteredReservations = computed(() => {
    let result = this.reservations();
    const query = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();

    if (query) {
      result = result.filter(r =>
        r.arcade_name.toLowerCase().includes(query) ||
        r.game_name.toLowerCase().includes(query) ||
        r.player_pseudo.toLowerCase().includes(query) ||
        (r.player2_pseudo?.toLowerCase().includes(query) ?? false)
      );
    }

    if (status !== 'all') {
      result = result.filter(r => r.status === status);
    }

    return result;
  });

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.loading.set(true);
    this.reservationsService.getMyReservations().subscribe({
      next: (data) => {
        this.reservations.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.showError('Impossible de charger les données');
        this.loading.set(false);
      }
    });
  }

  cancelReservation(reservation: ReservationResponse): void {
    this.confirmationService.confirm({
      message: `Annuler la réservation #${reservation.id} pour "${reservation.game_name}" sur "${reservation.arcade_name}" ?`,
      header: 'Confirmer l\'annulation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Annuler la réservation',
      rejectLabel: 'Garder',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.reservationsService.cancelReservation(reservation.id).subscribe({
          next: () => {
            this.notificationService.showSuccess('Réservation annulée, tickets remboursés');
            this.loadReservations();
          },
          error: () => {
            this.notificationService.showError('Impossible d\'annuler la réservation');
          }
        });
      }
    });
  }

  getStatusSeverity(status: ReservationStatus): string {
    switch (status) {
      case ReservationStatus.WAITING:    return 'warn';
      case ReservationStatus.PLAYING:    return 'success';
      case ReservationStatus.COMPLETED:  return 'info';
      case ReservationStatus.CANCELLED:  return 'danger';
    }
  }

  getStatusLabel(status: ReservationStatus): string {
    switch (status) {
      case ReservationStatus.WAITING:    return 'En attente';
      case ReservationStatus.PLAYING:    return 'En cours';
      case ReservationStatus.COMPLETED:  return 'Terminée';
      case ReservationStatus.CANCELLED:  return 'Annulée';
    }
  }

  readonly ReservationStatus = ReservationStatus;
}
