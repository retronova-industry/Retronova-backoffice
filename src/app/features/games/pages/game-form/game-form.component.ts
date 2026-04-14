import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { ButtonComponent, CardComponent } from '../../../../shared/ui';
import { GamesService } from '../../../../core/services/games.service';
import { Game } from '../../../../core/models/game.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputNumberModule,
    LoaderComponent,
    ButtonComponent,
    CardComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>{{ isEditMode ? 'Modifier le jeu' : 'Nouveau jeu' }}</h1>
      </div>
      
      <div class="form-container">
        <ui-card>
          @if (loading) {
            <app-loader></app-loader>
          } @else {
            <form [formGroup]="gameForm" (ngSubmit)="onSubmit()">
              <div class="form-grid">
                <!-- Nom du jeu -->
                <div class="form-group col-12">
                  <label for="nom" class="required">Nom du jeu</label>
                  <input id="nom" type="text" formControlName="nom"
                         class="form-input"
                         [class.is-invalid]="isFieldInvalid('nom')"
                         placeholder="Ex: Street Fighter II" />
                  @if (isFieldInvalid('nom')) {
                    <small class="field-error">Le nom du jeu est requis</small>
                  }
                </div>

                <!-- Description -->
                <div class="form-group col-12">
                  <label for="description">Description</label>
                  <textarea id="description" formControlName="description"
                            class="form-textarea"
                            rows="4" placeholder="Description du jeu (optionnel)">
                  </textarea>
                </div>

                <!-- Nombre de joueurs -->
                <div class="form-group col-6">
                  <label for="min_players" class="required">Nombre minimum de joueurs</label>
                  <p-inputNumber id="min_players" formControlName="min_players"
                                 [min]="1" [max]="10" [showButtons]="true"
                                 [class.ng-invalid]="isFieldInvalid('min_players')">
                  </p-inputNumber>
                  @if (isFieldInvalid('min_players')) {
                    <small class="field-error">
                      @if (gameForm.get('min_players')?.hasError('required')) { Ce champ est requis }
                      @if (gameForm.get('min_players')?.hasError('min')) { La valeur minimale est 1 }
                    </small>
                  }
                </div>

                <div class="form-group col-6">
                  <label for="max_players" class="required">Nombre maximum de joueurs</label>
                  <p-inputNumber id="max_players" formControlName="max_players"
                                 [min]="1" [max]="10" [showButtons]="true"
                                 [class.ng-invalid]="isFieldInvalid('max_players')">
                  </p-inputNumber>
                  @if (isFieldInvalid('max_players')) {
                    <small class="field-error">
                      @if (gameForm.get('max_players')?.hasError('required')) { Ce champ est requis }
                      @if (gameForm.get('max_players')?.hasError('min')) { La valeur minimale est 1 }
                      @if (gameForm.get('max_players')?.hasError('minPlayers')) { Le nombre max doit être ≥ au nombre min }
                    </small>
                  }
                </div>

                <!-- Coût en tickets -->
                <div class="form-group col-6">
                  <label for="ticket_cost" class="required">Coût en tickets</label>
                  <p-inputNumber id="ticket_cost" formControlName="ticket_cost"
                                 [min]="0" [max]="100" [showButtons]="true"
                                 [class.ng-invalid]="isFieldInvalid('ticket_cost')">
                  </p-inputNumber>
                  @if (isFieldInvalid('ticket_cost')) {
                    <small class="field-error">
                      @if (gameForm.get('ticket_cost')?.hasError('required')) { Ce champ est requis }
                      @if (gameForm.get('ticket_cost')?.hasError('min')) { La valeur minimale est 0 }
                    </small>
                  }
                </div>
              </div>

              <!-- Actions -->
              <div class="form-actions">
                <ui-button
                  label="Annuler"
                  variant="ghost"
                  type="button"
                  (clicked)="router.navigate(['/games'])">
                </ui-button>
                <ui-button
                  label="Enregistrer"
                  variant="primary"
                  type="submit"
                  [loading]="submitting"
                  [disabled]="gameForm.invalid">
                </ui-button>
              </div>
            </form>
          }
        </ui-card>
      </div>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: var(--space-6);
    }

    .form-group {
      &.col-12 { grid-column: span 12; }
      &.col-6  { grid-column: span 6; }

      label {
        display: block;
        margin-bottom: var(--space-2);
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--gray-80);

        &.required::after {
          content: ' *';
          color: var(--red-50);
        }
      }

      .form-input,
      .form-textarea {
        width: 100%;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        background: var(--white);
        font-size: var(--text-sm);
        color: var(--gray-80);
        font-family: var(--font-sans);
        outline: none;
        transition: border-color var(--duration-fast) var(--ease-default);

        &:focus {
          border-color: var(--blue-60);
          box-shadow: 0 0 0 2px rgba(0, 98, 254, 0.15);
        }

        &.is-invalid {
          border-color: var(--red-50);
        }
      }

      .form-input  { height: 36px; }
      .form-textarea { resize: vertical; }

      .field-error {
        display: block;
        margin-top: var(--space-1);
        font-size: var(--text-xs);
        color: var(--red-50);
      }

      :host ::ng-deep p-inputNumber {
        width: 100%;
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-8);
      padding-top: var(--space-6);
      border-top: 1px solid var(--border-default);
    }

    @media (max-width: 768px) {
      .form-group.col-6 { grid-column: span 12; }
    }
  `]
})
export class GameFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly gamesService = inject(GamesService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  gameForm: FormGroup;
  isEditMode = false;
  loading = false;
  submitting = false;
  gameId?: string;

  constructor() {
    this.gameForm = this.createForm();
  }
  
  ngOnInit(): void {
    this.gameId = this.route.snapshot.params['id'];
    this.isEditMode = !!this.gameId;
    
    if (this.isEditMode && this.gameId) {
      this.loadGame(this.gameId);
    }
  }
  
  /**
   * Crée le formulaire réactif avec validations
   */
  private createForm(): FormGroup {
    return this.fb.group({
      nom: ['', Validators.required],
      description: [''],
      min_players: [1, [Validators.required, Validators.min(1)]],
      max_players: [1, [Validators.required, Validators.min(1)]],
      ticket_cost: [0, [Validators.required, Validators.min(0)]]
    }, { validators: this.playerCountValidator });
  }
  
  /**
   * Validateur personnalisé pour vérifier la cohérence des nombres de joueurs
   */
  private playerCountValidator(group: FormGroup): {[key: string]: boolean} | null {
    const min = group.get('min_players')?.value;
    const max = group.get('max_players')?.value;
    
    if (min && max && max < min) {
      group.get('max_players')?.setErrors({ minPlayers: true });
      return { minPlayers: true };
    }
    
    // Nettoyer l'erreur si elle n'est plus valide
    const errors = group.get('max_players')?.errors;
    if (errors?.['minPlayers']) {
      delete errors['minPlayers'];
      const hasErrors = Object.keys(errors).length > 0;
      group.get('max_players')?.setErrors(hasErrors ? errors : null);
    }
    
    return null;
  }
  
  /**
   * Charge les données du jeu en mode édition
   */
  private loadGame(id: string): void {
    this.loading = true;
    this.gamesService.getGameById(id).subscribe({
      next: (game) => {
        this.gameForm.patchValue({
          nom: game.nom,
          description: game.description,
          min_players: game.min_players,
          max_players: game.max_players,
          ticket_cost: game.ticket_cost ?? 0
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du jeu:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les données du jeu'
        });
        this.router.navigate(['/games']);
      }
    });
  }
  
  /**
   * Vérifie si un champ est invalide et a été touché
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.gameForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  
  /**
   * Soumet le formulaire
   */
  onSubmit(): void {
    if (this.gameForm.invalid) {
      Object.keys(this.gameForm.controls).forEach(key => {
        this.gameForm.get(key)?.markAsTouched();
      });
      return;
    }
    
    this.submitting = true;
    const gameData = this.gameForm.value;
    
    const request$ = this.isEditMode && this.gameId
      ? this.gamesService.updateGame(this.gameId, gameData)
      : this.gamesService.createGame(gameData);
    
    request$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `Le jeu a été ${this.isEditMode ? 'modifié' : 'créé'} avec succès`
        });
        this.router.navigate(['/games']);
      },
      error: (error) => {
        console.error('Erreur lors de l\'enregistrement:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible d\'enregistrer le jeu'
        });
        this.submitting = false;
      }
    });
  }
}