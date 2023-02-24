import { Component, OnInit, ComponentRef } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IModalDialog, IModalDialogOptions, IModalDialogButton } from 'ngx-modal-dialog';
import { LoginService } from 'src/app/login.service';
import { WindowRef } from '../../winref.service';

@Component({
  selector: 'app-cert-util',
  templateUrl: './cert-util.component.html'
})
export class CertUtilComponent implements OnInit, IModalDialog {
  actionButtons: IModalDialogButton[];
  toRetrieve: string[] = ['active', 'httpsonly', 'selfsigned', 'hsts', 'hpkp', 'hpkp_hash'];
  dependencies: any = {
    active: ['httpsonly', 'selfsigned', 'hsts', 'hpkp', 'key', 'cert', 'hpkp_hash'],
    selfsigned: ['key', 'cert', 'hsts', 'hpkp', 'hpkp_hash'],
    hpkp: ['hpkp_hash']
  } // dependency: dependent[]
  certForm = new FormGroup({
    active: new FormControl('true'),
    httpsonly: new FormControl('false'),
    selfsigned: new FormControl('true'),
    key: new FormControl(''),
    cert: new FormControl(''),
    hsts: new FormControl('true'),
    hpkp: new FormControl('false'),
    hpkp_hash: new FormControl(''),
    session: new FormControl('')
  });
  files = {
    key: {},
    cert: {}
  }

  constructor(public _loginService: LoginService, public http: HttpClient, public win: WindowRef) {
    this.getDefaults();
    this.updateDisabled();
    this.actionButtons = [
      { text: "Změnit nastavení", onAction: () => {this.onSubmit();return true} },
      { text: "Zahodit změny", onAction: () => true } 
    ]
  }

  getDefaults() {
    let toPatch: any = {};
    for(let item of this.toRetrieve) {
      if(typeof this._loginService.tls[item] != 'undefined') {
        if(item != 'selfsigned') {
          toPatch[item] = this._loginService.tls[item];
        } else {
          toPatch[item] = this._loginService.tls[item].toString();
        }
      }
    }
    toPatch['session'] = this._loginService._sessionId;
    this.certForm.patchValue(toPatch);
  }

  onFileChange(event) {
    if(event.target.files && event.target.files.length) {
      const [file] = event.target.files;
      if(event.target.name == 'key') {
        this.files.key = file;
      } else if(event.target.name == 'cert') {
        this.files.cert = file;
      }
    }
  }

  onSubmit() {
    let fd: FormData = new FormData() 
    let exclude = ['key', 'cert'];
    for(let formfield of Object.keys(this.certForm.value)) {
      if(!exclude.includes(formfield)) {
        fd.append(formfield, this.certForm.value[formfield]);
      }
    }
    for(let filefield of Object.keys(this.files)) {
      if(typeof this.files[filefield].name != 'undefined') {
        fd.append(filefield, this.files[filefield], this.files[filefield].name);
      }
    }
    this.http.post('/secure', fd).toPromise().then((res) => {if(typeof res['success'] != 'undefined') {this.win.nativeWindow.location.replace('/apply-noredir.html')}});
  }

  updateDisabled(): void {
    let all = Object.assign([], this.toRetrieve).concat(Object.keys(this.files));
    let enabled = Object.assign([], all);
    for(let dependency of Object.keys(this.dependencies)) {
      for(let item of this.dependencies[dependency]) {
        if(((typeof this.certForm.getRawValue()[dependency] == 'string') ? this.certForm.getRawValue()[dependency] == 'true' : !this.certForm.getRawValue()[dependency]) && enabled.includes(item)) {
          enabled.splice(enabled.indexOf(item), 1);
        }
      }
    }
    for(let item of all) {
      if(enabled.includes(item)) {
        this.certForm.controls[item].enable();
      } else {
        this.certForm.controls[item].disable();
      }
    }
  }

  ngOnInit() {
  }

  dialogInit(reference: ComponentRef<IModalDialog>, options: Partial<IModalDialogOptions<any>>) {
  }

}