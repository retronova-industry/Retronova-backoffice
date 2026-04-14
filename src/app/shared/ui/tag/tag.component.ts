import { Component, input } from '@angular/core';

export type TagVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

@Component({
  selector: 'ui-tag',
  standalone: true,
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.scss',
})
export class TagComponent {
  readonly label = input.required<string>();
  readonly variant = input<TagVariant>('default');
  readonly icon = input<string>();
}
