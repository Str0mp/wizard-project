import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContratarPageComponent } from './insurance/contratar-page.component';

const routes: Routes = [
  { path: '', redirectTo: '/contratar/salud-familiar', pathMatch: 'full' },
  { path: 'contratar/:productoId', component: ContratarPageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
