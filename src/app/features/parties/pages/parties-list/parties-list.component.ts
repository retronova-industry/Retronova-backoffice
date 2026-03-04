import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabview';
import { MessageService } from 'primeng/api';
import { PartiesService } from '../../../../core/services/parties.service';
import { UsersService } from '../../../../core/services/users.service';
import { GamesService } from '../../../../core/services/games.service';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { Party } from '../../../../core/models/party.model';
import { User } from '../../../../core/models/user.model';
import { Game } from '../../../../core/models/game.model';
import { Arcade } from '../../../../core/models/arcade.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { forkJoin } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { PartiesDetailsComponent } from '../parties-details/parties-details.component';


interface PartyDisplay extends Party {
  player1_name?: string;
  player2_name?: string;
  game_name?: string;
  machine_name?: string;
}

@Component({
  selector: 'app-parties-list',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    TabViewModule,
    LoaderComponent,
    DynamicDialogModule
  ],
  providers: [MessageService, DialogService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Parties</h1>
      </div>

      <div class="page-content">
        <p-tabView>
          <!-- Parties en cours -->
          <p-tabPanel header="En cours" leftIcon="pi pi-play-circle">
            <ng-template pTemplate="content">
              <div class="search-container">
                <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" placeholder="Rechercher..."
                        (input)="applyFilterGlobal($event, 'active')" />
                </span>
              </div>

              <p-table #dtActive [value]="activeParties" [loading]="loading"
                      [rows]="10" [paginator]="true" [rowHover]="true"
                      [tableStyle]="{'min-width': '70rem'}"
                      [globalFilterFields]="['player1_name', 'player2_name', 'game_name', 'machine_name']">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Joueur 1</th>
                    <th>Joueur 2</th>
                    <th>Jeu</th>
                    <th>Borne</th>
                    <th>Code</th>
                    <th>Bar</th>
                    <th>Début</th>
                    <th>Actions</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-party>
                  <tr>
                    <td>{{ party.player1_name || ('Joueur ' + shortId(party.player1_id)) }}</td>
                    <td>{{ party.player2_name || ('Joueur ' + shortId(party.player2_id)) }}</td>
                    <td>{{ party.game_name || ('Jeu ' + shortId(party.game_id)) }}</td>
                    <td>{{ party.machine_name || ('Borne ' + shortId(party.machine_id)) }}</td>
                    <td>
                      <p-tag [value]="party.password?.toString() || 'N/A'" severity="info"></p-tag>
                    </td>
                    <td>
                      <i class="pi" [ngClass]="party.bar ? 'pi-check text-green-500' : 'pi-times text-red-500'"></i>
                    </td>
                    <td>{{ formatDate(party.created_at) }}</td>
                    <td>
                      <button pButton pRipple type="button" icon="pi pi-eye"
                              class="p-button-rounded p-button-text p-button-info"
                              pTooltip="Détails" tooltipPosition="top"
                              (click)="viewPartyDetails(party)"></button>
                    </td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr>
                    <td colspan="8" class="text-center p-4">
                      <i class="pi pi-info-circle mr-2"></i>
                      Aucune partie en cours
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </ng-template>
          </p-tabPanel>

          <!-- Parties terminées -->
          <p-tabPanel header="Terminées" leftIcon="pi pi-check-circle">
            <ng-template pTemplate="content">
              <div class="search-container">
                <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" placeholder="Rechercher..."
                        (input)="applyFilterGlobal($event, 'completed')" />
                </span>
              </div>

              <p-table #dtCompleted [value]="completedParties" [loading]="loading"
                      [rows]="10" [paginator]="true" [rowHover]="true"
                      [tableStyle]="{'min-width': '80rem'}"
                      [globalFilterFields]="['player1_name', 'player2_name', 'game_name', 'machine_name']">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Joueur 1</th>
                    <th>Score J1</th>
                    <th>Joueur 2</th>
                    <th>Score J2</th>
                    <th>Jeu</th>
                    <th>Borne</th>
                    <th>Score total</th>
                    <th>Date</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-party>
                  <tr>
                    <td>
                      {{ party.player1_name || ('Joueur ' + shortId(party.player1_id)) }}
                      <i *ngIf="isWinner(party, 1)" class="pi pi-trophy text-yellow-500 ml-2"></i>
                    </td>
                    <td class="text-center font-bold">{{ party.p1_score || 0 }}</td>
                    <td>
                      {{ party.player2_name || ('Joueur ' + shortId(party.player2_id)) }}
                      <i *ngIf="isWinner(party, 2)" class="pi pi-trophy text-yellow-500 ml-2"></i>
                    </td>
                    <td class="text-center font-bold">{{ party.p2_score || 0 }}</td>
                    <td>{{ party.game_name || ('Jeu ' + shortId(party.game_id)) }}</td>
                    <td>{{ party.machine_name || ('Borne ' + shortId(party.machine_id)) }}</td>
                    <td class="text-center">
                      <p-tag [value]="(party.total_score || 0).toString()" severity="success"></p-tag>
                    </td>
                    <td>{{ formatDate(party.updated_at) }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr>
                    <td colspan="8" class="text-center p-4">
                      <i class="pi pi-info-circle mr-2"></i>
                      Aucune partie terminée
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </ng-template>
          </p-tabPanel>

          <!-- Toutes les parties -->
          <p-tabPanel header="Toutes" leftIcon="pi pi-list">
            <ng-template pTemplate="content">
              <app-loader *ngIf="loading" size="large"></app-loader>
              <p class="text-center text-muted" *ngIf="!loading">
                Total : {{ allParties.length }} parties
              </p>
            </ng-template>
          </p-tabPanel>
        </p-tabView>
      </div>
    </div>
  `,
  styles: [`
    .search-container {
      margin-bottom: 1.5rem;
    }

    :host ::ng-deep .search-container .pi-search {
      margin-right: 0.5rem;
    }

    .text-green-500 { color: var(--green-500); }
    .text-red-500 { color: var(--red-500); }
    .text-yellow-500 { color: var(--yellow-500); }

    .font-bold { font-weight: 600; }
    .text-center { text-align: center; }
    .text-muted {
      color: var(--text-color-secondary);
      font-style: italic;
    }

    :host ::ng-deep {
      .p-tabview-panels {
        padding-top: 1.5rem;
      }

      .p-tag {
        font-weight: 600;
      }
    }
  `]
})
export class PartiesListComponent implements OnInit {
  @ViewChild('dtActive') dtActive?: Table;
  @ViewChild('dtCompleted') dtCompleted?: Table;

  loading = true;
  allParties: PartyDisplay[] = [];
  activeParties: PartyDisplay[] = [];
  completedParties: PartyDisplay[] = [];

  // Cache pour les entités
  private users: User[] = [];
  private games: Game[] = [];
  private machines: Arcade[] = [];

  constructor(
    private partiesService: PartiesService,
    private usersService: UsersService,
    private gamesService: GamesService,
    private arcadesService: ArcadesService,
    private messageService: MessageService,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Charge toutes les données nécessaires
   */
  private loadData(): void {
    this.loading = true;

    forkJoin({
      parties: this.partiesService.getAllParties(),
      users: this.usersService.getAllUsers(),
      games: this.gamesService.getAllGames(),
      machines: this.arcadesService.getAllArcades()
    }).subscribe({
      next: (data) => {
        this.users = data.users;
        this.games = data.games;
        this.machines = data.machines;

        // Enrichir les parties avec les noms
        this.allParties = this.enrichParties(data.parties);
        this.activeParties = this.allParties.filter(p => !p.done && !p.cancel);
        this.completedParties = this.allParties.filter(p => p.done);

        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les parties'
        });
        this.loading = false;
      }
    });
  }

  /**
   * Enrichit les parties avec les noms des entités liées
   */
  private enrichParties(parties: Party[]): PartyDisplay[] {
    return parties.map(party => {
      const player1 = this.users.find(u => u.id === party.player1_id);
      const player2 = this.users.find(u => u.id === party.player2_id);
      const game = this.games.find(g => g.id === party.game_id);
      const machine = this.machines.find(m => m.id === party.machine_id);

      const getPlayerName = (player: User | undefined): string | undefined => {
        if (!player) return undefined;
        const fullName = `${player.nom || ''} ${player.prenom || ''}`.trim();
        return fullName || player.firebase_uid;
      };

      return {
        ...party,
        player1_name: getPlayerName(player1),
        player2_name: getPlayerName(player2),
        game_name: game?.nom,
        machine_name: machine?.nom || undefined
      };
    });
  }

  shortId(id: string | number | undefined | null): string {
    if (id === null || id === undefined) return 'N/A';
    try {
      const s = id.toString();
      return s.substring(0, 8);
    } catch (e) {
      return 'N/A';
    }
  }

  /**
   * Applique un filtre global sur la table
   */
  applyFilterGlobal(event: Event, tableType: 'active' | 'completed'): void {
    const value = (event.target as HTMLInputElement).value;

    if (tableType === 'active' && this.dtActive) {
      this.dtActive.filterGlobal(value, 'contains');
    } else if (tableType === 'completed' && this.dtCompleted) {
      this.dtCompleted.filterGlobal(value, 'contains');
    }
  }

  /**
   * Formate une date
   */
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Détermine si un joueur est le gagnant
   */
  isWinner(party: Party, player: 1 | 2): boolean {
    const p1Score = party.p1_score || 0;
    const p2Score = party.p2_score || 0;

    if (p1Score === p2Score) return false;

    return player === 1 ? p1Score > p2Score : p2Score > p1Score;
  }

  /**
   * Affiche les détails d'une partie
   */
  viewPartyDetails(party: PartyDisplay): void {
    this.dialogService.open(PartiesDetailsComponent, {
      header: `Détails de la partie ${this.shortId(party.id as unknown as string)}`,
      width: '600px',
      modal: true,
      dismissableMask: true,
      data: { party }
    });
  }
}
