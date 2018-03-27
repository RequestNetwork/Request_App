import { NgModule } from '@angular/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
// import { MatCheckboxModule } from '@angular/material/checkbox';
// import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
// import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
// import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
// import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';

import { AccountComponent } from './account/account.component';
import { AllowanceComponent } from './allowance/allowance.component';
import { RouterModule } from '@angular/router';
import { BlockiesModule } from 'angular-blockies';
import { PopoverModule } from 'ngx-popover';



@NgModule({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    BlockiesModule,
    PopoverModule,
    MatButtonModule,
    MatCardModule,
    // MatCheckboxModule,
    // MatChipsModule,
    // MatListModule,
    // MatSidenavModule,
    // MatTabsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatToolbarModule,
    MatTooltipModule
  ],
  declarations: [
    AccountComponent,
    AllowanceComponent,
  ],
  exports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    BlockiesModule,
    PopoverModule,

    AccountComponent,
    AllowanceComponent,
    MatButtonModule,
    MatCardModule,
    // MatCheckboxModule,
    // MatChipsModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatMenuModule,
    MatInputModule,
    // MatListModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    // MatSidenavModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    // MatTabsModule,
    MatToolbarModule,
    MatTooltipModule
  ]
})
export class SharedModule {}
