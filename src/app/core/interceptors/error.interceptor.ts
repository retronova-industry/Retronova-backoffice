import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { catchError, switchMap, take, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const firebaseAuth = inject(AngularFireAuth);
  
  return next(req).pipe(
    catchError(error => {
      if (error.status === 401) {
        return firebaseAuth.authState.pipe(
          take(1),
          switchMap(user => {
            if (!user) {
              const browserUrl = `${globalThis.location?.pathname ?? '/'}${globalThis.location?.search ?? ''}${globalThis.location?.hash ?? ''}`;
              const currentUrl = router.url && router.url !== '/' ? router.url : browserUrl;
              const returnUrl = currentUrl.startsWith('/auth/login') ? '/' : currentUrl;

              router.navigate(['/auth/login'], {
                queryParams: { returnUrl }
              });
            }

            return throwError(() => error);
          })
        );
      }
      
      return throwError(() => error);
    })
  );
};
