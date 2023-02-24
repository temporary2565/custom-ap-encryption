import { ModalDialogModule, ModalDialogService } from 'ngx-modal-dialog';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

import { StructureService } from './structure.service';
import { LoginService } from './login.service';
import { LoginComponent } from './login/login.component';
import { SubbarComponent } from './subbar/subbar.component';
import { NavigationComponent } from './navigation/navigation.component';
import { SettingsComponent } from './settings/settings.component';
import { StatusComponent } from './status/status.component';
import { ValidationService } from './validation.service';
import { BeaconsSharedService } from './beacons-shared.service';
import { WindowRef } from './winref.service';
import { ScanComponent } from './wireless/scanner/scan/scan.component';
import { SavedComponent } from './wireless/scanner/saved/saved.component';
import { FirmwareComponent } from './management/firmware/firmware.component';
import { ScannerComponent } from './wireless/scanner/scanner.component';
import { AdvertiserComponent } from './wireless/advertiser/advertiser.component';
import { CertUtilComponent } from './management/cert-util/cert-util.component';

import { AppComponent } from './app.component';
import { NotifierComponent } from './notifier/notifier.component';
import { NotificationComponent } from './notification/notification.component';
import { NotificationService } from './notification.service';
import { EmcSettingsComponent } from './emc-settings/emc-settings.component';

// Směrování
const routes: Routes = [
  {path: '', component: StatusComponent},
  {path: 'subbar', component: SubbarComponent}
];

@NgModule({
  declarations: [
    NavigationComponent,
    SettingsComponent,
    SubbarComponent,
    StatusComponent,
    FirmwareComponent,
    ScannerComponent,
    ScanComponent,
    SavedComponent,
    AdvertiserComponent,
    CertUtilComponent,
    AppComponent,
    LoginComponent,
    NotifierComponent,
    NotificationComponent,
    EmcSettingsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    ModalDialogModule.forRoot()
  ],
  providers: [StructureService, ValidationService, WindowRef, BeaconsSharedService, StructureService, ModalDialogService, LoginService, NotificationService],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  entryComponents: [CertUtilComponent, NotificationComponent, EmcSettingsComponent]
})

export class AppModule { }
