// src/app/features/arcade-machines/pages/machine-form/machine-form.component.ts

import { Component, OnInit, inject, signal, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonComponent, CardComponent } from '../../../../shared/ui';
import { forkJoin } from 'rxjs';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { GamesService } from '../../../../core/services/games.service';
import { Arcade, ArcadeCreate, ArcadeUpdate, ArcadeGameAssignment } from '../../../../core/models/arcade.model';
import { Game } from '../../../../core/models/game.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { toSignal } from '@angular/core/rxjs-interop';

interface GameOption {
  readonly label: string;
  readonly value: number;
  readonly game: Game | null;
}

// --- Validation Strategy ---
abstract class FormValidationStrategy {
  abstract validate(form: FormGroup): boolean;
  abstract getErrors(form: FormGroup): string[];
}

class MachineFormValidationStrategy extends FormValidationStrategy {
  validate(form: FormGroup): boolean {
    return form.valid && this.validateSlots(form);
  }

  getErrors(form: FormGroup): string[] {
    const errors: string[] = [];
    if (form.get('nom')?.hasError('required')) errors.push('Le nom de la borne est requis');
    if (form.get('localisation')?.hasError('required')) errors.push('La localisation est requise');
    
    const slotsErrors = this.validateSlotsErrors(form);
    errors.push(...slotsErrors);
    
    return errors;
  }

  private validateSlots(form: FormGroup): boolean {
    const slotsArray = form.get('slots') as FormArray;
    if (!slotsArray) return true;
    
    const assignedGames = slotsArray.controls
      .map(control => control.get('game_id')?.value)
      .filter(gameId => gameId !== null);
    
    // Vérifier qu'il n'y a pas de doublons
    const uniqueGames = new Set(assignedGames);
    return uniqueGames.size === assignedGames.length;
  }

  private validateSlotsErrors(form: FormGroup): string[] {
    const errors: string[] = [];
    const slotsArray = form.get('slots') as FormArray;
    
    if (slotsArray) {
      const assignedGames = slotsArray.controls
        .map(control => control.get('game_id')?.value)
        .filter(gameId => gameId !== null);
      
      const uniqueGames = new Set(assignedGames);
      if (uniqueGames.size !== assignedGames.length) {
        errors.push('Un même jeu ne peut pas être assigné à plusieurs slots');
      }
    }
    
    return errors;
  }
}

// --- Factory ---
class GameOptionsFactory {
  static createOptions(games: Game[]): GameOption[] {
    return [
      { label: 'Aucun jeu sélectionné', value: 0, game: null },
      ...games.map(game => ({
        label: `${game.nom} (${game.min_players}-${game.max_players} joueurs) - ${game.ticket_cost} tickets`,
        value: game.id,
        game
      }))
    ];
  }
}

@Component({
  selector: 'app-machine-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    DropdownModule,
    ConfirmDialogModule,
    LoaderComponent,
    ButtonComponent,
    CardComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>{{ pageTitle() }}</h1>
          <p class="page-subtitle">{{ pageSubtitle() }}</p>
        </div>
      </div>

      <div class="form-container">
        @if (loading()) {
          <app-loader size="large">
            <span>{{ isEditMode() ? 'Chargement de la borne...' : 'Chargement du formulaire...' }}</span>
          </app-loader>
        } @else {
          <form [formGroup]="machineForm" (ngSubmit)="handleSubmit()" class="machine-form">

            <ui-card styleClass="ui-card--flush">

              <!-- Informations générales -->
              <div class="form-section">
                <p class="section-title">Informations générales</p>
                <div class="form-grid">
                  <div class="form-group col-12">
                    <label for="nom" class="required">Nom de la borne</label>
                    <input
                      id="nom"
                      type="text"
                      formControlName="nom"
                      class="form-input"
                      [class.is-invalid]="isFieldInvalid('nom')"
                      placeholder="Ex: Borne Rétro Zone 1" />
                    @if (isFieldInvalid('nom')) {
                      <small class="field-error">Le nom est requis (minimum 2 caractères)</small>
                    }
                  </div>
                  <div class="form-group col-12">
                    <label for="description">Description</label>
                    <textarea
                      id="description"
                      formControlName="description"
                      class="form-textarea"
                      rows="3"
                      placeholder="Description de la borne (optionnel)">
                    </textarea>
                  </div>
                </div>
              </div>

              <div class="section-sep"></div>

              <!-- Localisation -->
              <div class="form-section">
                <p class="section-title">Localisation</p>
                <div class="form-grid">
                  <div class="form-group col-12">
                    <label for="localisation" class="required">Emplacement</label>
                    <input
                      id="localisation"
                      type="text"
                      formControlName="localisation"
                      class="form-input"
                      [class.is-invalid]="isFieldInvalid('localisation')"
                      placeholder="Ex: Salle principale, près de l'entrée" />
                    @if (isFieldInvalid('localisation')) {
                      <small class="field-error">La localisation est requise</small>
                    }
                  </div>
                  <div class="form-group col-6">
                    <label for="latitude">Latitude</label>
                    <input
                      id="latitude"
                      type="number"
                      formControlName="latitude"
                      class="form-input"
                      [class.is-invalid]="isFieldInvalid('latitude')"
                      step="0.000001"
                      placeholder="48.8566" />
                    @if (isFieldInvalid('latitude')) {
                      <small class="field-error">Entre -90 et 90</small>
                    }
                  </div>
                  <div class="form-group col-6">
                    <label for="longitude">Longitude</label>
                    <input
                      id="longitude"
                      type="number"
                      formControlName="longitude"
                      class="form-input"
                      [class.is-invalid]="isFieldInvalid('longitude')"
                      step="0.000001"
                      placeholder="2.3522" />
                    @if (isFieldInvalid('longitude')) {
                      <small class="field-error">Entre -180 et 180</small>
                    }
                  </div>
                </div>
              </div>

              <div class="section-sep"></div>

              <!-- Configuration des jeux -->
              <div class="form-section">
                <p class="section-title">Configuration des jeux</p>
                <div class="slots-list" formArrayName="slots">
                  @for (slotControl of slotsArray.controls; track $index; let i = $index) {
                    <div [formGroupName]="i" class="slot-row">
                      <span class="slot-num">S{{ i + 1 }}</span>
                      <div class="slot-dropdown-wrap">
                        <p-dropdown
                          [id]="'game_' + i"
                          formControlName="game_id"
                          [options]="gameOptions()"
                          optionLabel="label"
                          optionValue="value"
                          placeholder="Aucun jeu assigné"
                          [showClear]="!!getSelectedGameForSlot(i)"
                                                    styleClass="w-full"
                          (onChange)="onGameSlotChange(i, $event)">
                          <ng-template pTemplate="selectedItem" let-option>
                            @if (option?.game) {
                              <div class="selected-game">
                                <span class="game-name">{{ option.game.nom }}</span>
                                <span class="game-meta">{{ option.game.min_players }}-{{ option.game.max_players }} j · {{ option.game.ticket_cost }} tickets</span>
                              </div>
                            }
                          </ng-template>
                          <ng-template pTemplate="item" let-option>
                            @if (option.game) {
                              <div class="dropdown-item">
                                <div class="item-info">
                                  <span class="item-name">{{ option.game.nom }}</span>
                                  @if (option.game.description) {
                                    <span class="item-desc">{{ option.game.description }}</span>
                                  }
                                </div>
                                <span class="item-meta">{{ option.game.min_players }}-{{ option.game.max_players }} j · {{ option.game.ticket_cost }} t.</span>
                              </div>
                            } @else {
                              <span class="item-empty">Aucun jeu</span>
                            }
                          </ng-template>
                        </p-dropdown>
                        @if (getSelectedGameForSlot(i); as game) {
                          @if (game.description) {
                            <p class="slot-game-hint">{{ game.description }}</p>
                          }
                        }
                      </div>
                      <div class="slot-state">
                        <span class="dot" [class.dot--occupied]="!!getSelectedGameForSlot(i)"></span>
                        <span class="slot-state-label">{{ getSelectedGameForSlot(i) ? 'Occupé' : 'Libre' }}</span>
                      </div>
                    </div>
                  }
                  @if (hasSlotConflicts()) {
                    <div class="slot-error">
                      Un même jeu ne peut pas être assigné à plusieurs slots.
                    </div>
                  }
                </div>
              </div>

            </ui-card>

            <!-- Erreurs de validation -->
            @if (formValidationErrors().length > 0 && machineForm.touched) {
              <div class="validation-errors">
                <ul>
                  @for (error of formValidationErrors(); track error) {
                    <li>{{ error }}</li>
                  }
                </ul>
              </div>
            }

            <!-- Actions -->
            <div class="form-actions">
              <ui-button
                type="button"
                label="Annuler"
                variant="secondary"
                (clicked)="router.navigate(['/arcade-machines'])">
              </ui-button>
              @if (isEditMode()) {
                <ui-button
                  type="button"
                  label="Réinitialiser"
                  variant="ghost-danger"
                  (clicked)="resetForm()">
                </ui-button>
              }
              <ui-button
                type="submit"
                [label]="isEditMode() ? 'Mettre à jour' : 'Créer la borne'"
                variant="primary"
                [loading]="submitting()"
                [disabled]="!canSubmit()">
              </ui-button>
            </div>
          </form>
        }
      </div>
    </div>

    <p-confirmDialog header="Confirmation" icon="pi pi-question-circle"></p-confirmDialog>
  `,
  styleUrls: ['./machine-form.component.scss']
})
export class MachineFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly arcadesService = inject(ArcadesService);
  private readonly gamesService = inject(GamesService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly validationStrategy = new MachineFormValidationStrategy();

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly machineId = signal<number | null>(null);
  readonly currentMachine = signal<Arcade | null>(null);
  readonly games = signal<Game[]>([]);

  // Ces propriétés seront initialisées dans le constructeur
  readonly formStatus!: Signal<string | undefined>;
  readonly canSubmit!: Signal<boolean>;

  readonly isEditMode = computed(() => !!this.machineId());
  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Modifier la borne' : 'Nouvelle borne d\'arcade'
  );

  readonly pageSubtitle = computed(() =>
    this.isEditMode() ? 'Modifiez les informations et la configuration' : 'Créez une nouvelle borne d\'arcade'
  );
  
  readonly gameOptions = computed(() =>
    GameOptionsFactory.createOptions(this.games())
  );

  // Ces propriétés dépendent du formulaire et seront initialisées dans le constructeur
  readonly formValidationErrors!: Signal<string[]>;
  readonly hasSlotConflicts!: Signal<boolean>;

  protected readonly machineForm: FormGroup;
  protected readonly slotsArray: FormArray;

  constructor() {
    // Créer le formulaire d'abord
    this.machineForm = this.createForm();
    this.slotsArray = this.machineForm.get('slots') as FormArray;
    
    // Initialiser les propriétés qui dépendent du formulaire
    this.formStatus = toSignal(this.machineForm.statusChanges, { 
      initialValue: this.machineForm.status 
    });
    
    this.formValidationErrors = computed(() =>
      this.validationStrategy.getErrors(this.machineForm)
    );
    
    this.hasSlotConflicts = computed(() => {
      const slotsArray = this.machineForm.get('slots') as FormArray;
      if (!slotsArray) return false;
      
      const assignedGames = slotsArray.controls
        .map(control => control.get('game_id')?.value)
        .filter(gameId => gameId && gameId !== 0);
      
      const uniqueGames = new Set(assignedGames);
      return uniqueGames.size !== assignedGames.length;
    });
    
    this.canSubmit = computed(() => {
      const isValid = this.formStatus() === 'VALID';
      const notSubmitting = !this.submitting();
      const noConflicts = !this.hasSlotConflicts();
      return isValid && notSubmitting && noConflicts;
    });
  }

  ngOnInit(): void {
    this.initializeComponent();
  }
  
  private initializeComponent(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.machineId.set(+id);
      this.loadMachineData();
    } else {
      this.loadGamesOnly();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      localisation: ['', Validators.required],
      latitude: [null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.min(-180), Validators.max(180)]],
      slots: this.fb.array([
        this.createSlotFormGroup(1),
        this.createSlotFormGroup(2)
      ])
    });
  }

  private createSlotFormGroup(slotNumber: number): FormGroup {
    return this.fb.group({
      slot_number: [slotNumber],
      game_id: [0]
    });
  }

  private loadMachineData(): void {
    const id = this.machineId();
    if (!id) return;
    
    this.loading.set(true);
    
    forkJoin({
      games: this.gamesService.getAllGames(),
      machine: this.arcadesService.getArcadeById(id)
    }).subscribe({
      next: ({ games, machine }) => {
        this.handleDataLoaded(games, machine);
      },
      error: (error) => this.handleLoadError(error)
    });
  }

  private loadGamesOnly(): void {
    this.loading.set(true);
    
    this.gamesService.getAllGames().subscribe({
      next: (games) => {
        this.games.set(games);
        this.loading.set(false);
      },
      error: (error) => this.handleLoadError(error)
    });
  }

  private handleDataLoaded(games: Game[], machine?: Arcade): void {
    this.games.set(games);
    if (machine) {
      this.currentMachine.set(machine);
      this.patchFormWithMachine(machine);
    }
    this.loading.set(false);
  }

  private handleLoadError(error: any): void {
    console.error('Erreur lors du chargement:', error);
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Impossible de charger les données'
    });
    this.router.navigate(['/arcade-machines']);
  }

  private patchFormWithMachine(machine: Arcade): void {
    this.machineForm.patchValue({
      nom: machine.nom,
      description: machine.description || '',
      localisation: machine.localisation,
      latitude: machine.latitude,
      longitude: machine.longitude
    });

    // Réinitialiser les slots
    this.slotsArray.controls.forEach(control => {
      control.patchValue({ game_id: 0 });
    });

    // Patcher les slots avec les jeux assignés
    if (machine.games && machine.games.length > 0) {
      machine.games.forEach(gameAssignment => {
        const slotIndex = gameAssignment.slot_number - 1;
        if (slotIndex >= 0 && slotIndex < this.slotsArray.length) {
          this.slotsArray.at(slotIndex).patchValue({
            game_id: gameAssignment.id
          });
        }
      });
    }
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.machineForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  protected onGameSlotChange(slotIndex: number, event: any): void {
    const gameId = event.value;
    if (!gameId || gameId === 0) return;
    
    const selectedGame = this.games().find(game => game.id === gameId);
    
    if (selectedGame) {
      this.messageService.add({
        severity: 'info',
        summary: 'Jeu assigné',
        detail: `${selectedGame.nom} assigné au slot ${slotIndex + 1}`
      });
    }
  }

  protected getSelectedGameForSlot(slotIndex: number): Game | null {
    const gameId = this.slotsArray.at(slotIndex).get('game_id')?.value;
    if (!gameId || gameId === 0) return null;
    
    return this.games().find(game => game.id === gameId) || null;
  }

  protected getSlotIndicatorClass(slotIndex: number): string {
    const hasGame = !!this.getSelectedGameForSlot(slotIndex);
    return hasGame ? 'occupied' : 'empty';
  }

  protected getSlotIcon(slotIndex: number): string {
    const hasGame = !!this.getSelectedGameForSlot(slotIndex);
    return hasGame ? 'pi pi-check' : 'pi pi-plus';
  }

  protected resetForm(): void {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir réinitialiser le formulaire ? Toutes les modifications seront perdues.',
      header: 'Confirmation de réinitialisation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-warning',
      rejectButtonStyleClass: 'p-button-text',
      acceptLabel: 'Réinitialiser',
      rejectLabel: 'Annuler',
      accept: () => {
        if (this.currentMachine()) {
          this.patchFormWithMachine(this.currentMachine()!);
        } else {
          this.machineForm.reset();
          // Réinitialiser les slots
          this.slotsArray.controls.forEach((control, index) => {
            control.patchValue({ 
              slot_number: index + 1,
              game_id: 0 
            });
          });
        }
        this.messageService.add({
          severity: 'info',
          summary: 'Formulaire réinitialisé',
          detail: 'Le formulaire a été remis à son état initial'
        });
      }
    });
  }

  protected handleSubmit(): void {
    if (!this.canSubmit()) {
      this.markAllFieldsAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulaire invalide',
        detail: 'Veuillez corriger les erreurs avant de continuer'
      });
      return;
    }

    this.submitting.set(true);
    
    if (this.isEditMode()) {
      this.updateMachine();
    } else {
      this.createMachine();
    }
  }

  private markAllFieldsAsTouched(): void {
    this.machineForm.markAllAsTouched();
  }

  private prepareArcadeData(): ArcadeCreate {
    const formValue = this.machineForm.value;
    return {
      nom: formValue.nom.trim(),
      description: formValue.description?.trim() ?? '',
      localisation: formValue.localisation.trim(),
      latitude: formValue.latitude != null ? Number(formValue.latitude) : 0,
      longitude: formValue.longitude != null ? Number(formValue.longitude) : 0,
    };
  }

  private prepareGameAssignments(arcadeId: number): ArcadeGameAssignment[] {
    const formValue = this.machineForm.value;
    
    return formValue.slots
      .filter((slot: any) => slot.game_id && slot.game_id !== 0)
      .map((slot: any) => ({
        arcade_id: arcadeId,
        game_id: Number(slot.game_id),
        slot_number: Number(slot.slot_number)
      }));
  }

  private createMachine(): void {
    const arcadeData = this.prepareArcadeData();

    this.arcadesService.createArcade(arcadeData).subscribe({
      next: (response) => {
        const arcadeId: number = response.arcade_id;
        const gameAssignments = this.prepareGameAssignments(arcadeId);

        if (gameAssignments.length > 0) {
          this.assignGamesToArcade(arcadeId, gameAssignments);
        } else {
          this.handleSubmitSuccess('créée');
        }
      },
      error: (error) => this.handleSubmitError(error)
    });
  }

  private updateMachine(): void {
    const id = this.machineId();
    if (!id) return;

    const arcadeData: ArcadeUpdate = this.prepareArcadeData();
    
    this.arcadesService.updateArcade(id, arcadeData).subscribe({
      next: () => {
        // Gérer les assignations de jeux
        const gameAssignments = this.prepareGameAssignments(id);
        
        // Note: Dans une vraie application, il faudrait gérer la suppression 
        // des anciennes assignations avant d'ajouter les nouvelles
        if (gameAssignments.length > 0) {
          this.assignGamesToArcade(id, gameAssignments);
        } else {
          this.handleSubmitSuccess('modifiée');
        }
      },
      error: (error) => this.handleSubmitError(error)
    });
  }

  private assignGamesToArcade(_arcadeId: number, assignments: ArcadeGameAssignment[]): void {
    // Envoyer chaque assignation séparément ou en lot selon l'API
    const requests = assignments.map(assignment => 
      this.arcadesService.assignGameToArcade(assignment)
    );

    if (requests.length === 0) {
      this.handleSubmitSuccess(this.isEditMode() ? 'modifiée' : 'créée');
      return;
    }

    forkJoin(requests).subscribe({
      next: () => {
        this.handleSubmitSuccess(this.isEditMode() ? 'modifiée' : 'créée');
      },
      error: (error) => this.handleSubmitError(error)
    });
  }

  private handleSubmitSuccess(action: string): void {
    this.submitting.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Succès',
      detail: `La borne a été ${action} avec succès`
    });
    this.router.navigate(['/arcade-machines']);
  }

  private handleSubmitError(error: any): void {
    console.error('Erreur lors de l\'enregistrement:', error);
    this.submitting.set(false);
    
    let errorMessage = 'Impossible d\'enregistrer la borne';
    
    if (error.status === 422) {
      errorMessage = 'Les données envoyées sont invalides. Vérifiez les champs du formulaire.';
      if (error.error?.detail) {
        errorMessage = error.error.detail;
      }
    }
    
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: errorMessage,
      life: 5000
    });
  }
}