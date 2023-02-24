import { Component, OnInit, OnDestroy, ComponentRef, ChangeDetectorRef } from '@angular/core';
import { IModalDialog, IModalDialogOptions, IModalDialogButton } from 'ngx-modal-dialog';
import { LoginService } from '../login.service';

@Component({
  selector: 'app-emc-settings',
  templateUrl: './emc-settings.component.html',
  styleUrls: ['./emc-settings.component.scss']
})
export class EmcSettingsComponent implements OnInit, OnDestroy {
  ngOnDestroy(): void {
    clearInterval(this.reloadInterval);
  }
  actionButtons: IModalDialogButton[];
  reloadInterval: any

  constructor(public _loginService: LoginService, public _cf: ChangeDetectorRef) {
    this.actionButtons = [
      { text: "Zavřít", onAction: () => true }
    ];
    this.reloadInterval = setInterval(function() { this._loginService.getEMCKeys() }.bind(this), 300);
  }

  delete(key: string) {
    this._loginService.deleteAPIKey(key);
    this._loginService.apiKeys = this._loginService.apiKeys.splice(this._loginService.apiKeys.indexOf(key), 1);
    this._cf.detectChanges();
  }

  getDefaults() {
    
  }

  ngOnInit() {
  }

  dialogInit(reference: ComponentRef<IModalDialog>, options: Partial<IModalDialogOptions<any>>) {
  }

}
