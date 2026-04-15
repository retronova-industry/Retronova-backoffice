import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { ButtonComponent, TagComponent } from '../../../../shared/ui';
import { PartiesService } from '../../../../core/services/parties.service';
import { UsersService } from '../../../../core/services/users.service';
import { GamesService } from '../../../../core/services/games.service';
import { ArcadesService } from '../../../../core/services/arcades.service';
import { Party } from '../../../../core/models/party.model';
import { User } from '../../../../core/models/user.model';
import { Game } from '../../../../core/models/game.model';
import { Arcade } from '../../../../core/models/arcade.model';
import { forkJoin } from 'rxjs';
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
    DynamicDialogModule,
    ButtonComponent,
    TagComponent,
  ],
  providers: [MessageService, DialogService],
  templateUrl: './parties-list.component.html',
  styleUrl: './parties-list.component.scss',
})
export class PartiesListComponent implements OnInit {
  @ViewChild('dtActive')    dtActive?: Table;
  @ViewChild('dtCompleted') dtCompleted?: Table;

  loading = true;
  activeTab: 'active' | 'completed' = 'active';

  allParties: PartyDisplay[] = [];
  activeParties: PartyDisplay[] = [];
  completedParties: PartyDisplay[] = [];
  cancelledCount = 0;

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

  loadData(): void {
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
        this.allParties = this.enrichParties(data.parties);
        this.activeParties = this.allParties.filter(p => !p.done && !p.cancel);
        this.completedParties = this.allParties.filter(p => p.done);
        this.cancelledCount = this.allParties.filter(p => p.cancel).length;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les parties' });
        this.loading = false;
      }
    });
  }

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
      return id.toString().substring(0, 8);
    } catch {
      return 'N/A';
    }
  }

  applyFilterGlobal(event: Event, tableType: 'active' | 'completed'): void {
    const value = (event.target as HTMLInputElement).value;
    if (tableType === 'active' && this.dtActive) {
      this.dtActive.filterGlobal(value, 'contains');
    } else if (tableType === 'completed' && this.dtCompleted) {
      this.dtCompleted.filterGlobal(value, 'contains');
    }
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  isWinner(party: Party, player: 1 | 2): boolean {
    const p1 = party.p1_score || 0;
    const p2 = party.p2_score || 0;
    if (p1 === p2) return false;
    return player === 1 ? p1 > p2 : p2 > p1;
  }

  viewPartyDetails(party: PartyDisplay): void {
    this.dialogService.open(PartiesDetailsComponent, {
      header: `Partie · ${party.game_name || shortId(party.id as unknown as string)}`,
      width: '520px',
      modal: true,
      dismissableMask: true,
      data: { party }
    });
  }
}

function shortId(id: string | number | undefined | null): string {
  if (id === null || id === undefined) return 'N/A';
  try { return id.toString().substring(0, 8); } catch { return 'N/A'; }
}
