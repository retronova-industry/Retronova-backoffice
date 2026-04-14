import { Component, input, output } from '@angular/core';

// Classe abstraite pour les variantes
abstract class ButtonVariant {
  abstract getClasses(): string[];
  abstract getAnimationClass(): string;
}

class PrimaryButtonVariant extends ButtonVariant {
  getClasses(): string[] {
    return ['btn-primary', 'neon-glow'];
  }
  
  getAnimationClass(): string {
    return 'pulse-primary';
  }
}

class ArcadeButtonVariant extends ButtonVariant {
  getClasses(): string[] {
    return ['btn-arcade', 'retro-border', 'pixel-text'];
  }
  
  getAnimationClass(): string {
    return 'arcade-press';
  }
}

@Component({
  selector: 'app-gaming-button',
  standalone: true,
  styleUrl: './gaming-button.component.scss',
  template: `
    <button 
      [class]="buttonClasses()"
      [disabled]="disabled()"
      (click)="handleClick()">
      <span class="btn-content">
        @if (loading()) {
          <i class="pi pi-spin pi-spinner"></i>
        } @else if (icon()) {
          <i [class]="'pi pi-' + icon()"></i>
        }
        <ng-content></ng-content>
      </span>
    </button>
  `,
})
export class GamingButtonComponent {
  // Inputs avec signals
  readonly variant = input<'primary' | 'arcade'>('primary');
  readonly icon = input<string>();
  readonly loading = input(false);
  readonly disabled = input(false);
  
  // Output avec signal
  readonly clicked = output<void>();
  
  // Polymorphisme avec factory
  private getVariant(): ButtonVariant {
    const variants = {
      primary: new PrimaryButtonVariant(),
      arcade: new ArcadeButtonVariant()
    };
    
    return variants[this.variant()];
  }
  
  buttonClasses(): string {
    const variant = this.getVariant();
    return [
      'gaming-button',
      ...variant.getClasses(),
      this.loading() ? 'is-loading' : ''
    ].join(' ');
  }
  
  handleClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit();
    }
  }
}