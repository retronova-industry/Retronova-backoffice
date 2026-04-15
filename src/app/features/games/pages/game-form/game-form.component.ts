import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { ButtonComponent, CardComponent } from '../../../../shared/ui';
import { GamesService } from '../../../../core/services/games.service';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputNumberModule,
    ButtonComponent,
    CardComponent,
  ],
  templateUrl: './game-form.component.html',
  styleUrl: './game-form.component.scss',
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

  private createForm(): FormGroup {
    return this.fb.group({
      nom: ['', Validators.required],
      description: [''],
      min_players: [1, [Validators.required, Validators.min(1)]],
      max_players: [1, [Validators.required, Validators.min(1)]],
      ticket_cost: [0, [Validators.required, Validators.min(0)]]
    }, { validators: this.playerCountValidator });
  }

  private playerCountValidator(group: FormGroup): {[key: string]: boolean} | null {
    const min = group.get('min_players')?.value;
    const max = group.get('max_players')?.value;
    if (min && max && max < min) {
      group.get('max_players')?.setErrors({ minPlayers: true });
      return { minPlayers: true };
    }
    const errors = group.get('max_players')?.errors;
    if (errors?.['minPlayers']) {
      delete errors['minPlayers'];
      const hasErrors = Object.keys(errors).length > 0;
      group.get('max_players')?.setErrors(hasErrors ? errors : null);
    }
    return null;
  }

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
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données du jeu' });
        this.router.navigate(['/games']);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.gameForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

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
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: `Le jeu a été ${this.isEditMode ? 'modifié' : 'créé'} avec succès` });
        this.router.navigate(['/games']);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'enregistrer le jeu' });
        this.submitting = false;
      }
    });
  }
}
