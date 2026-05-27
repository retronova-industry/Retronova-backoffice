// src/app/features/arcade-machines/pages/machines-list/machines-list.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { GamesService } from '../../../../core/services/games.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RoleService } from '../../../../core/services/role.service';
import { Arcade, GameOnArcade } from '../../../../core/models/arcade.model';
import { Game } from '../../../../core/models/game.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ButtonComponent, TagComponent, CardComponent } from '../../../../shared/ui';
import { forkJoin, of } from 'rxjs';

interface EnrichedArcade extends Arcade {
  readonly games_count: number;
  readonly status: MachineStatus;
  readonly game1_name?: string;
  readonly game2_name?: string;
  readonly utilization_rate: number;
  readonly has_both_slots: boolean;
  readonly active_slots: number;
}

type MachineStatus = 'active' | 'inactive' | 'maintenance' | 'partial';


@Component({
  selector: 'app-machines-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InputTextModule,
    ConfirmDialogModule,
    DialogModule,
    DropdownModule,
    TooltipModule,
    LoaderComponent,
    ButtonComponent,
    TagComponent,
    CardComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-section">
          <h1 class="page-title">Bornes d'arcade</h1>
          <p class="page-subtitle">Gestion et monitoring de vos bornes d'arcade</p>
        </div>

        <div class="search-wrapper">
          <i class="pi pi-search search-icon"></i>
          <input
            pInputText
            type="text"
            placeholder="Rechercher une borne..."
            (input)="handleGlobalFilter($event)"
            class="search-input" />
        </div>
      </div>

      <div class="fab-container">
        <ui-button
          icon="pi pi-plus"
          label="Nouvelle borne"
          (clicked)="router.navigate(['/arcade-machines/new'])" />
      </div>

      <div class="page-content">
        @if (loading()) {
          <app-loader size="large">
            <div class="loading-content">
              <i class="pi pi-spin pi-cog loading-icon"></i>
              <span>Chargement des bornes d'arcade...</span>
            </div>
          </app-loader>
        } @else {

          @if (filteredMachines().length === 0) {
            <div class="empty-state">
              <i class="pi pi-desktop empty-icon"></i>
              <h3>Aucune borne trouvée</h3>
              <p>Aucune borne d'arcade ne correspond à vos critères.</p>
              <ui-button
                label="Créer une borne"
                icon="pi pi-plus"
                (clicked)="router.navigate(['/arcade-machines/new'])" />
            </div>
          } @else {
            <div class="machines-grid">
              @for (machine of filteredMachines(); track machine.id) {
                <ui-card styleClass="machine-card ui-card--divided">

                  <div card-header class="card-header">
                    <div class="status-stripe status-stripe--{{ machine.status }}"></div>
                    <div class="card-top">
                      <div class="card-identity">
                        <span class="machine-name">{{ machine.nom }}</span>
                        @if (machine.description) {
                          <span class="machine-desc">{{ machine.description }}</span>
                        }
                      </div>
                      <ui-tag
                        [label]="getStatusLabel(machine.status)"
                        [variant]="getStatusSeverity(machine.status)" />
                    </div>
                  </div>

                  <div class="card-body">
                    <div class="info-row">
                      <i class="pi pi-map-marker"></i>
                      <span>{{ machine.localisation || 'Non défini' }}</span>
                    </div>

                    <div class="slots-section">
                      <span class="slots-label">
                        Jeux&nbsp;<span class="slots-count">{{ machine.games_count }}/2</span>
                      </span>
                      @for (slot of [1, 2]; track slot) {
                        <div class="slot-row">
                          @if (getGameForSlot(machine, slot); as game) {
                            <span class="slot-dot slot-dot--occupied"></span>
                            <span class="slot-num">S{{ slot }}</span>
                            <span class="slot-game-name">{{ game.nom }}</span>
                            <span class="slot-players">{{ game.min_players }}-{{ game.max_players }}p</span>
                          } @else {
                            <span class="slot-dot slot-dot--empty"></span>
                            <span class="slot-num">S{{ slot }}</span>
                            <span class="slot-empty-label">Libre</span>
                          }
                        </div>
                      }
                    </div>
                  </div>

                  <div card-footer class="card-footer">
                    <ui-button
                      label="Détails"
                      icon="pi pi-eye"
                      variant="secondary"
                      size="sm"
                      (clicked)="router.navigate(['/arcade-machines', machine.id])" />
                    <ui-button
                      label="Jeux"
                      icon="pi pi-gamepad"
                      variant="secondary"
                      size="sm"
                      (clicked)="configureGames(machine)" />
                    <ui-button
                      icon="pi pi-pencil"
                      variant="ghost"
                      size="sm"
                      tooltip="Éditer"
                      (clicked)="router.navigate(['/arcade-machines/edit', machine.id])" />
                    <ui-button
                      icon="pi pi-trash"
                      variant="ghost-danger"
                      size="sm"
                      tooltip="Supprimer"
                      (clicked)="confirmDelete(machine)" />
                  </div>

                </ui-card>
              }
            </div>
          }
        }
      </div>
    </div>


    <p-dialog
      [(visible)]="gamesDialogVisible"
      [header]="'Jeux — ' + (gamesDialogMachine()?.nom ?? '')"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      styleClass="games-dialog"
      [style]="{ width: '420px' }">

      @if (gamesDialogMachine(); as machine) {
        <div class="games-dialog-body">
          <div class="dialog-slot-row">
            <span class="dialog-slot-label">Slot 1</span>
            <p-dropdown
              [options]="gameDropdownOptions()"
              [ngModel]="dialogSlot1()"
              (ngModelChange)="dialogSlot1.set($event)"
              optionLabel="label"
              optionValue="value"
              placeholder="Libre"
              [showClear]="dialogSlot1() !== 0"
              styleClass="w-full">
            </p-dropdown>
          </div>
          <div class="dialog-slot-row">
            <span class="dialog-slot-label">Slot 2</span>
            <p-dropdown
              [options]="gameDropdownOptions()"
              [ngModel]="dialogSlot2()"
              (ngModelChange)="dialogSlot2.set($event)"
              optionLabel="label"
              optionValue="value"
              placeholder="Libre"
              [showClear]="dialogSlot2() !== 0"
              styleClass="w-full">
            </p-dropdown>
          </div>
          @if (dialogSlotConflict()) {
            <p class="dialog-conflict">Un même jeu ne peut pas occuper les deux slots.</p>
          }
        </div>
        <div class="games-dialog-footer">
          <ui-button label="Annuler" variant="secondary" (clicked)="closeGamesDialog()" />
          <ui-button
            label="Enregistrer"
            variant="primary"
            [loading]="savingGames()"
            [disabled]="dialogSlotConflict()"
            (clicked)="saveGameSlots(machine)" />
        </div>
      }
    </p-dialog>

    <p-confirmDialog
      header="Confirmation de suppression"
      icon="pi pi-exclamation-triangle"
      styleClass="gaming-confirm-dialog">
    </p-confirmDialog>
  `,
  styleUrls: ['./machines-list.component.scss']
})
export class MachinesListComponent implements OnInit {
  protected readonly router = inject(Router);
  private readonly arcadesService = inject(ArcadesService);
  private readonly gamesService = inject(GamesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);

  protected readonly loading = signal(false);
  protected readonly machines = signal<Arcade[]>([]);
  protected readonly games = signal<Game[]>([]);
  protected readonly searchQuery = signal('');

  protected readonly gamesDialogVisible = signal(false);
  protected readonly gamesDialogMachine = signal<EnrichedArcade | null>(null);
  protected readonly savingGames = signal(false);
  protected readonly dialogSlot1 = signal<number>(0);
  protected readonly dialogSlot2 = signal<number>(0);

  protected readonly gameDropdownOptions = computed(() => [
    { label: 'Libre', value: 0 },
    ...this.games().map(g => ({
      label: `${g.nom} — ${g.min_players}-${g.max_players}p · ${g.ticket_cost} tickets`,
      value: g.id
    }))
  ]);

  protected readonly dialogSlotConflict = computed(() => {
    const s1 = this.dialogSlot1();
    const s2 = this.dialogSlot2();
    return s1 !== 0 && s1 === s2;
  });

  protected readonly enrichedMachines = computed(() =>
    this.machines().map(machine => this.enrichMachine(machine))
  );

  protected readonly filteredMachines = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const machines = this.enrichedMachines();

    if (!query) return machines;

    return machines.filter(machine =>
      machine.nom.toLowerCase().includes(query) ||
      machine.description?.toLowerCase().includes(query) ||
      machine.localisation?.toLowerCase().includes(query) ||
      machine.games?.some(game => game.nom.toLowerCase().includes(query))
    );
  });

  protected readonly filteredCount = computed(() => this.filteredMachines().length);


  ngOnInit(): void {
    this.loadInitialData();
  }

  /**
   * Charge les données initiales (machines et jeux)
   */
  private loadInitialData(): void {
    this.loading.set(true);

    forkJoin({
      machines: this.arcadesService.getAllArcades(),
      games: this.gamesService.getAllGames()
    }).subscribe({
      next: ({ machines, games }) => {
        const isOwner = this.roleService.isArcadeOwner();
        const ownedIds = this.authService.getCurrentUser()?.arcade_ids ?? [];
        const visible = isOwner
          ? machines.filter(m => ownedIds.includes(m.id))
          : machines;
        this.machines.set(visible);
        this.games.set(games);
        this.loading.set(false);
      },
      error: (error) => this.handleError('chargement', error)
    });
  }

  /**
   * Enrichit une machine avec des métadonnées calculées (amélioré)
   */
  private enrichMachine(machine: Arcade): EnrichedArcade {
    const gamesCount = machine.games?.length || 0;
    const activeSlots = machine.games?.length || 0;
    const hasBothSlots = activeSlots === 2;
    const status = this.calculateMachineStatus(machine, activeSlots);
    const utilizationRate = this.calculateUtilizationRate(machine);

    return {
      ...machine,
      games_count: gamesCount,
      status,
      utilization_rate: utilizationRate,
      game1_name: machine.games?.find(g => g.slot_number === 1)?.nom,
      game2_name: machine.games?.find(g => g.slot_number === 2)?.nom,
      has_both_slots: hasBothSlots,
      active_slots: activeSlots
    };
  }

  /**
   * Calcule le statut d'une machine selon la logique métier améliorée
   */
  private calculateMachineStatus(_machine: Arcade, activeSlots: number): MachineStatus {
    if (activeSlots === 0) {
      return 'inactive';
    } else if (activeSlots === 1) {
      return 'partial';
    } else if (activeSlots === 2) {
      return 'active';
    }

    // Logique additionnelle pour maintenance si nécessaire
    return 'active';
  }

  /**
   * Calcule le taux d'utilisation d'une machine
   */
  private calculateUtilizationRate(_machine: Arcade): number {
    // Simulation - dans un vrai système, ceci viendrait des données d'usage
    return Math.random() * 100;
  }

  /**
   * Actualise les données des machines
   */
  refreshMachines(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Actualisation',
      detail: 'Actualisation des bornes d\'arcade…'
    });
    this.arcadesService.clearCache();
    this.gamesService.clearCache();
    this.loadInitialData();
  }

  /**
   * Gère le filtre global de recherche
   */
  protected handleGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  protected configureGames(machine: EnrichedArcade): void {
    this.gamesDialogMachine.set(machine);
    this.dialogSlot1.set(machine.games?.find(g => g.slot_number === 1)?.id ?? 0);
    this.dialogSlot2.set(machine.games?.find(g => g.slot_number === 2)?.id ?? 0);
    this.gamesDialogVisible.set(true);
  }

  protected closeGamesDialog(): void {
    this.gamesDialogVisible.set(false);
    this.gamesDialogMachine.set(null);
  }

  protected saveGameSlots(machine: EnrichedArcade): void {
    if (this.dialogSlotConflict()) return;
    this.savingGames.set(true);

    const slotValues = [this.dialogSlot1(), this.dialogSlot2()];
    const ops = [1, 2].map(slot => {
      const newGameId = slotValues[slot - 1];
      const currentGameId = machine.games?.find(g => g.slot_number === slot)?.id ?? 0;

      if (newGameId === currentGameId) return of(null);

      if (newGameId === 0) {
        return this.arcadesService.removeGameFromSlot(machine.id, slot);
      }
      return this.arcadesService.assignGameToArcade({
        arcade_id: machine.id,
        game_id: newGameId,
        slot_number: slot
      });
    });

    forkJoin(ops).subscribe({
      next: () => {
        this.savingGames.set(false);
        this.closeGamesDialog();
        this.arcadesService.clearCache();
        this.gamesService.clearCache();
        this.loadInitialData();
        this.messageService.add({
          severity: 'success',
          summary: 'Jeux mis à jour',
          detail: `Configuration de "${machine.nom}" sauvegardée`
        });
      },
      error: (err) => {
        this.savingGames.set(false);
        this.handleError('configuration des jeux', err);
      }
    });
  }

  /**
   * Confirme la suppression d'une machine
   */
  protected confirmDelete(machine: EnrichedArcade): void {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer la borne "${machine.nom}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      accept: () => this.executeDeletion(machine.id)
    });
  }

  /**
   * Exécute la suppression d'une machine
   */
  private executeDeletion(id: number): void {
    this.arcadesService.deleteArcade(id).subscribe({
      next: () => {
        this.machines.update(list => list.filter(m => m.id !== id));
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Borne supprimée avec succès'
        });
      },
      error: (error) => this.handleError('suppression', error)
    });
  }

  /**
   * Gère les erreurs de manière centralisée
   */
  private handleError(operation: string, error: any): void {
    console.error(`Erreur lors du ${operation}:`, error);
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: `Impossible de ${operation === 'chargement' ? 'charger les données' : 'effectuer l\'opération'}`
    });
    this.loading.set(false);
  }

  protected getStatusLabel(status: MachineStatus): string {
    const labels: Record<MachineStatus, string> = {
      active: 'Active',
      inactive: 'Inactive',
      maintenance: 'Maintenance',
      partial: 'Partielle'
    };
    return labels[status];
  }

  protected getStatusSeverity(status: MachineStatus): 'success' | 'warning' | 'danger' | 'info' {
    const severities: Record<MachineStatus, 'success' | 'warning' | 'danger' | 'info'> = {
      active: 'success',
      maintenance: 'warning',
      inactive: 'danger',
      partial: 'info'
    };
    return severities[status];
  }

  protected getGameForSlot(machine: EnrichedArcade, slotNumber: number): GameOnArcade | undefined {
    return machine.games?.find(game => game.slot_number === slotNumber);
  }
}
