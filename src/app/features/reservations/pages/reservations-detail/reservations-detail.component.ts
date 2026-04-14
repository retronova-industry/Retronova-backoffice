import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ReservationsService } from '../../../../core/services/reservations.service';
import { ReservationResponse, ReservationStatus } from '../../../../core/models/reservation.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-reservations-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    TagModule,
    ButtonModule,
    DividerModule,
    LoaderComponent
  ],
  templateUrl: './reservations-detail.component.html',
  styleUrl: './reservations-detail.component.scss'
})
export class ReservationsDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationsService = inject(ReservationsService);
  private readonly notificationService = inject(NotificationService);

  readonly loading = signal(false);
  readonly reservation = signal<ReservationResponse | null>(null);

  readonly ReservationStatus = ReservationStatus;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadReservation(id);
    }
  }

  private loadReservation(id: number): void {
    this.loading.set(true);
    this.reservationsService.getReservationById(id).subscribe({
      next: (data) => {
        this.reservation.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.showError('Réservation introuvable');
        this.loading.set(false);
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
}
