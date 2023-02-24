import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {RouterModule} from '@angular/router'
import {FormsModule, ReactiveFormsModule} from '@angular/forms'
import {HttpClientModule} from '@angular/common/http'

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MenuComponent } from './menu/menu.component';
import { ConnectComponent } from './connect/connect.component';
import { AccountComponent } from './account/account.component';
import { AboutComponent } from './about/about.component';
import { SettingsComponent } from './settings/settings.component';
import { IpcServiceService } from './ipc-service.service';
import { SavedComponent } from './saved/saved.component';
import { OverlayComponent } from './overlay/overlay.component';

const routes = [
  {path: "", component: ConnectComponent, terminal: false},
  {path: "connect", component: ConnectComponent},
  {path: "account", component: AccountComponent},
  {path: "saved", component: SavedComponent},
  {path: "settings", component: SettingsComponent},
  {path: "about", component: AboutComponent},
]

@NgModule({
  declarations: [
    AppComponent,
    MenuComponent,
    ConnectComponent,
    AccountComponent,
    AboutComponent,
    SettingsComponent,
    SavedComponent,
    OverlayComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    RouterModule.forRoot(routes),
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [IpcServiceService],
  bootstrap: [AppComponent]
})
export class AppModule { }
