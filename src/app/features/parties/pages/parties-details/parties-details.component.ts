import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { Party } from '../../../../core/models/party.model';

interface PartyDisplay extends Party {
  player1_name?: string;
  player2_name?: string;
  game_name?: string;
  machine_name?: string;
}

@Component({
  selector: 'app-parties-details',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule],
  template: `
    <div class="details">
      <h3 style="margin-top:0;">{{ party.game_name || 'Jeu inconnu' }}</h3>

      <p><b>ID : </b> {{ party.id }}</p>
      <p><b>Joueur 1 : </b> {{ party.player1_name || party.player1_id }}</p>
      <p><b>Joueur 2 : </b> {{ party.player2_name || party.player2_id }}</p>
      <p><b>Borne : </b> {{ party.machine_name || party.machine_id }}</p>

      <p>
        <b>Code : </b>
        <p-tag [value]="party.password?.toString() || 'N/A'" severity="info"></p-tag>
      </p>

      <div class="actions">
        <button pButton type="button" label="Fermer" class="p-button-text" (click)="close()"></button>
      </div>
    </div>
  `,
  styles: [`
    .details {
      padding: 0.25rem;
    }
    .actions {
      margin-top: 1rem;
      display:flex;
      justify-content:flex-end;
    }
  `]
})
export class PartiesDetailsComponent {
  party: PartyDisplay;

  constructor(
    private ref: DynamicDialogRef,
    private config: DynamicDialogConfig
  ) {
    this.party = this.config.data?.party as PartyDisplay;
  }

  close(): void {
    this.ref.close();
  }
}
