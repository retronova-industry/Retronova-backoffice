// src/app/features/promos/pages/promo-form/promo-form.component.ts

import { Component, OnInit, inject, signal, computed, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Message, MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { PromosService } from '../../../../core/services/promos.service';
import { PromoCode, CreatePromoCodeRequest } from '../../../../core/models/promo.model';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';

type FormMode = 'create' | 'edit';

/**
 * Validateur personnalisé pour le code promo
 */
class PromoCodeValidators {
  static promoCodePattern(control: any): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null;
    
    // Le code doit contenir uniquement des lettres, chiffres et tirets
    const pattern = /^[A-Z0-9\-_]+$/;
    return pattern.test(value.toUpperCase()) ? null : { invalidFormat: true };
  }
  
  static minTickets(control: any): { [key: string]: any } | null {
    const value = control.value;
    return value && value > 0 ? null : { minTickets: true };
  }
}

@Component({
  selector: 'app-promo-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    ButtonModule,
    CardModule,
    MessageModule,
    MessagesModule,
    RippleModule,
    TooltipModule,
    DividerModule,
    TagModule,
    LoaderComponent
  ],
  providers: [MessageService],
  templateUrl: './promo-form.component.html',
  styleUrls: ['./promo-form.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PromoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly promosService = inject(PromosService);
  private readonly messageService = inject(MessageService);
  
  // Signaux
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly mode = signal<FormMode>('create');
  protected readonly promoId = signal<number | null>(null);
  protected readonly currentPromo = signal<PromoCode | null>(null);
  protected readonly codePreview = signal('');
  protected readonly errorMessages = signal<Message[]>([]);
  
  // Computed values
  protected readonly pageTitle = computed(() => 
    this.mode() === 'create' ? 'Nouveau code promo' : 'Modifier le code promo'
  );
  
  protected readonly submitLabel = computed(() => 
    this.mode() === 'create' ? 'Créer le code' : 'Enregistrer les modifications'
  );
  
  protected readonly submitIcon = computed(() => 
    this.mode() === 'create' ? 'pi pi-plus' : 'pi pi-save'
  );
  
  protected readonly loadingMessage = computed(() => 
    this.mode() === 'create' ? 'Préparation du formulaire...' : 'Chargement du code promo...'
  );
  
  protected readonly ticketsValue = computed(() => 
    this.promoForm.get('tickets_reward')?.value || 0
  );
  
  protected readonly configSummary = computed(() => {
    const summary: string[] = [];
    const form = this.promoForm.value;
    
    if (form.is_single_use_global) {
      summary.push('Ce code ne pourra être utilisé qu\'une seule fois au total');
    } else if (form.is_single_use_per_user) {
      summary.push('Chaque utilisateur ne pourra utiliser ce code qu\'une seule fois');
    }
    
    if (form.usage_limit && !form.is_single_use_global) {
      summary.push(`Limité à ${form.usage_limit} utilisations au total`);
    }
    
    if (!form.is_single_use_global && !form.usage_limit) {
      summary.push('Utilisation illimitée');
    }
    
    summary.push(`${form.tickets_reward || 0} tickets seront crédités à chaque utilisation`);
    
    return summary;
  });
  
  // Formulaire
  protected readonly promoForm: FormGroup;
  
  constructor() {
    this.promoForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(3), PromoCodeValidators.promoCodePattern]],
      tickets_reward: [10, [Validators.required, PromoCodeValidators.minTickets]],
      is_single_use_global: [false],
      is_single_use_per_user: [true],
      usage_limit: [null]
    });
    
    // Effet pour gérer la logique du formulaire
    effect(() => {
      const singleUseGlobal = this.promoForm.get('is_single_use_global')?.value;
      
      if (singleUseGlobal) {
        this.promoForm.patchValue({
          is_single_use_per_user: false,
          usage_limit: null
        });
        this.promoForm.get('is_single_use_per_user')?.disable();
        this.promoForm.get('usage_limit')?.disable();
      } else {
        this.promoForm.get('is_single_use_per_user')?.enable();
        this.promoForm.get('usage_limit')?.enable();
      }
    });
  }
  
  ngOnInit(): void {
    // Vérifier si on est en mode édition
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mode.set('edit');
      this.promoId.set(+id);
      this.loadPromo(+id);
    }
  }
  
  /**
   * Charge un code promo existant
   */
  private loadPromo(id: number): void {
    this.loading.set(true);
    
    this.promosService.getPromoById(id).subscribe({
      next: (promo) => {
        this.currentPromo.set(promo);
        this.promoForm.patchValue({
          code: promo.code,
          tickets_reward: promo.tickets_reward,
          is_single_use_global: promo.is_single_use_global,
          is_single_use_per_user: promo.is_single_use_per_user,
          usage_limit: promo.usage_limit
        });
        this.updateCodePreview();
        this.loading.set(false);
      },
      error: (error) => {
        this.handleError('Impossible de charger le code promo', error);
        this.router.navigate(['/promos']);
      }
    });
  }
  
  /**
   * Met à jour l'aperçu du code
   */
  protected updateCodePreview(): void {
    const code = this.promoForm.get('code')?.value;
    this.codePreview.set(code ? code.toUpperCase() : '');
  }
  
  /**
   * Vérifie si un champ est invalide
   */
  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.promoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  
  /**
   * Soumet le formulaire
   */
  protected onSubmit(): void {
    if (!this.promoForm.valid) {
      this.markFormGroupTouched(this.promoForm);
      return;
    }
    
    this.submitting.set(true);
    this.errorMessages.set([]);
    
    const formData: CreatePromoCodeRequest = {
      ...this.promoForm.value,
      code: this.promoForm.value.code.toUpperCase()
    };
    
    const request$ = this.mode() === 'create'
      ? this.promosService.createPromoCode(formData)
      : this.promosService.updatePromo(this.promoId()!, formData);
    
    request$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: this.mode() === 'create' 
            ? 'Code promo créé avec succès' 
            : 'Code promo modifié avec succès',
          life: 3000
        });
        this.router.navigate(['/promos']);
      },
      error: (error) => this.handleError('Impossible de sauvegarder le code promo', error)
    });
  }
  
  /**
   * Marque tous les champs comme touchés
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
  
  /**
   * Gestion des erreurs
   */
  private handleError(message: string, error: any): void {
    console.error(message, error);
    
    // Utiliser le MessageService au lieu du signal errorMessages
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: error.message || message,
      life: 5000
    });
    
    this.loading.set(false);
    this.submitting.set(false);
  }
}