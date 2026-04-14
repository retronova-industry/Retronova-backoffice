import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="layout-container">
      <app-sidebar></app-sidebar>
      <main class="content-container">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout-container {
      display: flex;
      min-height: 100vh;
    }

    .content-container {
      flex: 1;
      min-width: 0;
      padding: var(--content-padding);
      background-color: var(--surface-page);
      overflow-y: auto;
      height: 100vh;
    }
  `]
})
export class LayoutComponent {}