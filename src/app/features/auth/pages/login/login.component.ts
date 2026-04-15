import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonComponent } from '../../../../shared/ui';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonComponent],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>Retro Nova - Back Office</h2>
        <h3>Connexion</h3>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" pInputText formControlName="email" 
                  [ngClass]="{'ng-dirty': loginForm.get('email')?.touched && loginForm.get('email')?.invalid}" />
            <small *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.hasError('required')" 
                  class="p-error">Email requis.</small>
            <small *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.hasError('email')" 
                  class="p-error">Email invalide.</small>
          </div>
          
          <div class="field">
            <label for="password">Mot de passe</label>
            <input id="password" type="password" pInputText formControlName="password" 
                  [ngClass]="{'ng-dirty': loginForm.get('password')?.touched && loginForm.get('password')?.invalid}" />
            <small *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.hasError('required')" 
                  class="p-error">Mot de passe requis.</small>
            <small *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.hasError('minlength')" 
                  class="p-error">Le mot de passe doit contenir au moins 6 caractères.</small>
          </div>
          
          <div class="field">
            <ui-button
              type="submit"
              label="Se connecter"
              [disabled]="loginForm.invalid || isLoading"
              [loading]="isLoading" />
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: var(--surface-ground);
    }
    
    .login-card {
      width: 90%;
      max-width: 400px;
      padding: 2rem;
      background-color: var(--surface-card);
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .login-card h2, .login-card h3 {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .field {
      margin-bottom: 1.5rem;
    }
    
    .field label {
      display: block;
      margin-bottom: 0.5rem;
    }
    
    .field input {
      width: 100%;
    }
    
    .field button {
      width: 100%;
      margin-top: 1rem;
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  private returnUrl = '/';
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  
  ngOnInit(): void {
    this.returnUrl = this.getSafeReturnUrl(
      this.route.snapshot.queryParamMap.get('returnUrl')
    );

    this.authService.isAuthenticated().subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.router.navigateByUrl(this.returnUrl);
      }
    });
  }
  
  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    const { email, password } = this.loginForm.value;
    
    this.authService.login(email, password).subscribe({
      next: () => {
        this.notificationService.showSuccess('Connexion réussie');
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.notificationService.showError('Échec de la connexion. Vérifiez vos identifiants.');
        this.isLoading = false;
      }
    });
  }

  private getSafeReturnUrl(returnUrl: string | null): string {
    if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return '/';
    }

    return returnUrl;
  }
}
