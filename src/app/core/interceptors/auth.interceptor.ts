import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { from, of, switchMap, take } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const firebaseAuth = inject(AngularFireAuth);
  
  return firebaseAuth.authState.pipe(
    take(1),
    switchMap(user => user ? from(user.getIdToken()) : of(null)),
    switchMap(token => {
      if (token) {
        const authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        return next(authReq);
      }
      return next(req);
    })
  );
};
