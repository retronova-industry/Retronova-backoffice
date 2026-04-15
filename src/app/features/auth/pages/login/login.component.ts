import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
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
