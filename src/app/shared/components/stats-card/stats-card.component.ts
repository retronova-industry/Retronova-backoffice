// src/app/shared/components/stats-card/stats-card.component.ts

import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { RippleModule } from 'primeng/ripple';

/**
 * Type pour définir la tendance des statistiques
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * Type pour définir les variantes de couleur
 */
export type ColorVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Interface pour les données de tendance
 */
export interface TrendData {
  readonly value: number;
  readonly direction: TrendDirection;
  readonly period?: string;
}

/**
 * Interface pour les données de statistiques
 */
export interface StatsData {
  readonly title: string;
  readonly value: string | number;
  readonly icon: string;
  readonly color: ColorVariant;
  readonly trend?: TrendData;
  readonly subtitle?: string;
  readonly loading?: boolean;
  readonly format?: 'number' | 'currency' | 'percentage' | 'fileSize' | 'duration' | 'shortNumber';
}

/**
 * Composant moderne de carte de statistiques
 * Utilise les signals d'Angular 19 pour la réactivité
 */
@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule, CardModule, RippleModule],
  template: `
    <div [class]="cardClasses()" (click)="handleClick()">
      @if (data().loading) {
        <!-- État de chargement -->
        <div class="stats-skeleton">
          <div class="skeleton-icon"></div>
          <div class="skeleton-content">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-value"></div>
            <div class="skeleton-line skeleton-trend"></div>
          </div>
        </div>
      } @else {
        <!-- Contenu normal -->
        <div class="stats-content">
          <!-- Icône avec effet de brillance -->
          <div [class]="iconContainerClasses()">
            <i [class]="iconClasses()" [attr.aria-label]="data().title"></i>
            @if (data().trend?.direction === 'up') {
              <div class="pulse-ring"></div>
            }
          </div>

          <!-- Informations principales -->
          <div class="stats-info">
            <h3 class="stats-title">{{ data().title }}</h3>
            <div class="stats-value-container">
              <p [class]="valueClasses()">{{ formattedValue() }}</p>
              @if (data().subtitle) {
                <p class="stats-subtitle">{{ data().subtitle }}</p>
              }
            </div>

            <!-- Tendance -->
            @if (data().trend; as trend) {
              <div [class]="trendClasses()">
                <i [class]="trendIconClasses()"></i>
                <span class="trend-value">
                  {{ Math.abs(data().trend!.value) }}%
                </span>
                @if (trend.period) {
                  <span class="trend-period">{{ trend.period }}</span>
                }
              </div>
            }
          </div>

          <!-- Indicateur d'interaction -->
          @if (clickable()) {
            <div class="interaction-indicator">
              <i class="pi pi-arrow-right"></i>
            </div>
          }
        </div>

        <!-- Effet de brillance au survol -->
        <div class="shimmer-effect"></div>
      }
    </div>
  `,
  styles: [`
    .stats-card {
      @apply relative overflow-hidden cursor-pointer;
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-md);
      transition: all var(--transition-normal);
      min-height: 140px;
      height: 100%;
      
      &:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: var(--shadow-xl);
        border-color: transparent;
      }
      
      &.clickable:hover {
        .shimmer-effect {
          animation: shimmer 1.5s ease-in-out;
        }
        
        .interaction-indicator {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      // Variantes de couleur
      &.primary { --card-color: var(--primary-500); }
      &.success { --card-color: var(--neon-green); }
      &.warning { --card-color: var(--neon-orange); }
      &.danger { --card-color: var(--arcade-red); }
      &.info { --card-color: var(--neon-blue); }
      
      &:hover {
        box-shadow: 
          var(--shadow-xl),
          0 0 30px rgba(var(--card-color), 0.2);
      }
    }

    .stats-content {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      height: 100%;
      // @apply relative flex items-start gap-4 p-6 h-full;
    }

    .stats-icon-container {
      @apply relative flex items-center justify-center rounded-xl;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, var(--card-color), color-mix(in srgb, var(--card-color) 80%, white));
      box-shadow: 
        0 4px 12px rgba(var(--card-color), 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      
      .stats-icon {
        font-size: 1.75rem;
        color: white;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }
      
      .pulse-ring {
        @apply absolute inset-0 rounded-xl;
        border: 2px solid var(--card-color);
        animation: gamepadPulse 2s infinite;
      }
    }

    .stats-info {
      @apply flex-1 flex flex-col justify-between h-full min-h-16;
      
      .stats-title {
        @apply text-sm font-medium mb-2 leading-tight;
        color: var(--text-color-secondary);
        margin: 0;
      }
      
      .stats-value-container {
        @apply mb-3;
        
        .stats-value {
          @apply block text-2xl font-bold leading-none;
          color: var(--text-color);
          
          &.animated {
            background: var(--gaming-gradient-primary);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: gradientShift 3s ease infinite;
          }
        }
        
        .stats-subtitle {
          @apply block text-xs mt-1;
          color: var(--text-color-muted);
        }
      }
      
      .stats-trend {
        @apply flex items-center gap-2 text-sm;
        
        &.positive {
          color: var(--neon-green);
        }
        
        &.negative {
          color: var(--arcade-red);
        }
        
        &.stable {
          color: var(--text-color-muted);
        }
        
        .trend-icon {
          font-size: 0.875rem;
          
          &.positive {
            animation: bounce 2s infinite;
          }
        }
        
        .trend-value {
          @apply font-semibold;
        }
        
        .trend-period {
          @apply text-xs;
          color: var(--text-color-muted);
        }
      }
    }

    .interaction-indicator {
      @apply absolute top-4 right-4 flex items-center justify-center;
      width: 24px;
      height: 24px;
      color: var(--text-color-muted);
      opacity: 0;
      transform: translateX(10px);
      transition: all var(--transition-normal);
      
      i {
        font-size: 0.875rem;
      }
    }

    .shimmer-effect {
      @apply absolute inset-0 opacity-0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.4),
        transparent
      );
      transform: translateX(-100%);
      transition: opacity var(--transition-normal);
    }

    .stats-skeleton {
      @apply flex items-start gap-4 p-6;
      
      .skeleton-icon {
        @apply rounded-xl;
        width: 60px;
        height: 60px;
        background: var(--skeleton-loading);
      }
      
      .skeleton-content {
        @apply flex-1 space-y-3;
        
        .skeleton-line {
          @apply rounded;
          background: var(--skeleton-loading);
          
          &.skeleton-title {
            height: 16px;
            width: 60%;
          }
          
          &.skeleton-value {
            height: 24px;
            width: 40%;
          }
          
          &.skeleton-trend {
            height: 14px;
            width: 50%;
          }
        }
      }
    }

    // Animations spéciales pour les gaming stats
    .stats-card.gaming-style {
      &::before {
        content: '';
        @apply absolute inset-0 rounded-xl opacity-0;
        background: var(--gaming-gradient-primary);
        transition: opacity var(--transition-normal);
      }
      
      &:hover::before {
        opacity: 0.05;
      }
    }

    // Mode sombre
    [data-theme="dark"] .stats-card {
      .stats-icon-container {
        box-shadow: 
          0 4px 12px rgba(var(--card-color), 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }
    }

    // Responsive
    @media (max-width: 768px) {
      .stats-content {
        @apply p-4 gap-3;
      }
      
      .stats-icon-container {
        width: 48px;
        height: 48px;
        
        .stats-icon {
          font-size: 1.5rem;
        }
      }
      
      .stats-value {
        @apply text-xl;
      }
    }
  `]
})
export class StatsCardComponent {
  // Inputs avec les nouveaux signals d'Angular 19
  readonly data = input.required<StatsData>();
  readonly clickable = input(false);
  readonly animated = input(false);
  readonly gamingStyle = input(false);

  // Outputs avec la nouvelle API
  readonly cardClick = output<StatsData>();

  // Référence à Math pour le template
  protected readonly Math = Math;

  /**
   * Classes CSS calculées pour la carte
   */
  protected readonly cardClasses = computed(() => {
    const classes = ['stats-card'];
    const data = this.data();
    
    classes.push(data.color);
    
    if (this.clickable()) classes.push('clickable');
    if (this.gamingStyle()) classes.push('gaming-style');
    if (this.animated()) classes.push('animated');
    
    return classes.join(' ');
  });

  /**
   * Classes CSS pour le conteneur d'icône
   */
  protected readonly iconContainerClasses = computed(() => {
    return ['stats-icon-container'];
  });

  /**
   * Classes CSS pour l'icône
   */
  protected readonly iconClasses = computed(() => {
    return ['stats-icon', 'pi', this.data().icon];
  });

  /**
   * Classes CSS pour la valeur
   */
  protected readonly valueClasses = computed(() => {
    const classes = ['stats-value'];
    if (this.animated()) classes.push('animated');
    return classes.join(' ');
  });

  /**
   * Classes CSS pour la tendance
   */
  protected readonly trendClasses = computed(() => {
    const trend = this.data().trend;
    if (!trend) return '';
    
    const classes = ['stats-trend'];
    classes.push(trend.direction);
    
    return classes.join(' ');
  });

  /**
   * Classes CSS pour l'icône de tendance
   */
  protected readonly trendIconClasses = computed(() => {
    const trend = this.data().trend;
    if (!trend) return '';
    
    const classes = ['trend-icon'];
    
    switch (trend.direction) {
      case 'up':
        classes.push('pi', 'pi-arrow-up', 'positive');
        break;
      case 'down':
        classes.push('pi', 'pi-arrow-down', 'negative');
        break;
      case 'stable':
        classes.push('pi', 'pi-minus', 'stable');
        break;
    }
    
    return classes.join(' ');
  });

  /**
   * Valeur formatée avec animations
   */
  protected readonly formattedValue = computed(() => {
    const value = this.data().value;
    
    // Si c'est un nombre, on peut le formater
    if (typeof value === 'number') {
      return this.formatNumber(value);
    }
    
    return value.toString();
  });

  /**
   * Formate un nombre avec les unités appropriées
   */
  private formatNumber(value: number): string {
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1) + 'M';
    }
    
    if (value >= 1_000) {
      return (value / 1_000).toFixed(1) + 'k';
    }
    
    return value.toLocaleString('fr-FR');
  }

  /**
   * Gère le clic sur la carte
   */
  protected handleClick(): void {
    if (this.clickable()) {
      this.cardClick.emit(this.data());
    }
  }
}