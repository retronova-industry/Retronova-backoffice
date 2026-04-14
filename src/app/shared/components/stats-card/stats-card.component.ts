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
  styleUrl: './stats-card.component.scss',
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