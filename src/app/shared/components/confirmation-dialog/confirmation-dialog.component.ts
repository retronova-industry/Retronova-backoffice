// src/app/shared/components/confirmation-dialog/confirmation-dialog.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonComponent } from '../../ui';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="confirmation-dialog">
      <div class="dialog-icon">
        <i class="pi pi-exclamation-triangle"></i>
      </div>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <div class="confirmation-actions">
        <ui-button label="Annuler" variant="secondary" (clicked)="cancel()"></ui-button>
        <ui-button label="Confirmer" variant="danger" (clicked)="confirm()"></ui-button>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      padding: 1rem;
      text-align: center;
    }
    
    .dialog-icon {
      margin-bottom: 1rem;
      
      i {
        font-size: 3rem;
        color: var(--yellow-40);
      }
    }

    h2 {
      margin: 0 0 var(--space-4) 0;
      font-size: var(--text-xl);
      color: var(--gray-80);
    }

    p {
      margin: 0 0 var(--space-8) 0;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    
    .confirmation-actions {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
    }
  `]
})
export class ConfirmationDialogComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  
  readonly title = this.config.data?.title || 'Confirmation';
  readonly message = this.config.data?.message || 'Êtes-vous sûr ?';
  
  confirm(): void {
    this.ref.close(true);
  }
  
  cancel(): void {
    this.ref.close(false);
  }
}