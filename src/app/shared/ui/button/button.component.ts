import { Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghost-danger';
export type ButtonSize = 'default' | 'sm';

@Component({
  selector: 'ui-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly label = input<string>();
  readonly icon = input<string>();
  readonly iconPos = input<'left' | 'right'>('left');
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('default');
  readonly rounded = input(false);
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly tooltip = input<string>();

  readonly clicked = output<MouseEvent>();

  protected readonly iconOnly = computed(() => !!this.icon() && !this.label());

  protected readonly hostClass = computed(() =>
    [
      'ui-btn',
      `ui-btn--${this.variant()}`,
      this.size() === 'sm' ? 'ui-btn--sm' : '',
      this.rounded() ? 'ui-btn--rounded' : '',
      this.iconOnly() ? 'ui-btn--icon-only' : '',
      this.loading() ? 'ui-btn--loading' : '',
    ]
      .filter(Boolean)
      .join(' ')
  );

  protected handleClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
