import { Component, OnInit, OnDestroy, ViewContainerRef } from '@angular/core';
import { ModalDialogService } from 'ngx-modal-dialog';
import { StructureService } from '../structure.service';
import { FormService } from '../form.service';
import { LoginService } from '../login.service';
import { ValidationService } from '../validation.service';
import { Subscription } from 'rxjs';
import { CertUtilComponent } from '../management/cert-util/cert-util.component';
import { EmcSettingsComponent } from '../emc-settings/emc-settings.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit, OnDestroy {
  public category: string;
  public subcategory: string;
  public cfgStructure: any;
  public settingsStructure: string[];
  public categorySub: Subscription;

  constructor(public _loginService: LoginService, public _structureService: StructureService, public _formService: FormService, public _validationService: ValidationService,
    public _modal: ModalDialogService, public _viewRef: ViewContainerRef) {
    this.categorySub = this._structureService.highlightedObs.subscribe(msg => {
      this.category = msg.split(" ")[0];
      this.subcategory = msg.split(" ")[1];
      _validationService.flush();
      this.cfgStructure = (!(this._structureService.appStructure[this.category]['children'][this.subcategory] == ('undefined' || 'null'))) ? this._structureService.appStructure[this.category]['children'][this.subcategory] : {};
      this.settingsStructure = (!(typeof this.cfgStructure['children'] == ('undefined' || 'null'))) ? Object.keys(this.cfgStructure['children']) : [];
    });
    // Zjištění skrytých objektů
    for(let element of Object.keys(this._structureService.elementArr)) {
      for(let item of Object.keys(this.cfgStructure['children'])) {
        this._structureService.preloadHiding(item, this.cfgStructure['children'][item]['type'], this._loginService.getDefault(item));
      }
    }
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.categorySub.unsubscribe();
  }

  showModal(item) {
    switch(item) {
      case "firewall_tls":
        this._modal.openDialog(this._viewRef, {
          title: 'Nastavení TLS',
          childComponent: CertUtilComponent
        });
        break;
      case "wifi-proj-esetup":
        this._modal.openDialog(this._viewRef, {
          title: 'Nastavení pro EMC API',
          childComponent: EmcSettingsComponent
        });
        break;
    }
  }

}
