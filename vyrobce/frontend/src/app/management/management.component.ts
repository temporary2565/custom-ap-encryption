import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-management',
  templateUrl: './management.component.html',
  styleUrls: ['./management.component.scss']
})
export class ManagementComponent implements OnInit {
  error: boolean = false
  keyName: string = ""
  pwdForm = new FormGroup({
    old: new FormControl('', Validators.required),
    new: new FormControl('', [Validators.required, Validators.minLength(5), Validators.maxLength(64)]),
    r: new FormControl('', [Validators.required])
  })

  get status(): string {
    return this.isUndefined(this._a.serverConfig.prohibited) || !this._a.serverConfig.prohibited ? "Aktivní" : "S dočasným omezením"
  }

  constructor(public _a: AuthService) { }

  ngOnInit() {
  }

  onSubmit() {
    if(this.pwdForm.value.new != this.pwdForm.value.r) {
      this._a.showPwdError = true
      return
    }
    this._a.changePwd(this.pwdForm.value.old, this.pwdForm.value.new)
  }

  isUndefined(item) {
    return typeof item == "undefined";
  }

  rmToken(token) {
    this._a.serverConfig.tokens.splice(this._a.serverConfig.tokens.map(x=>x.value).indexOf(token), 1)
    this._a.removeToken(token)
    this._a.updatedConfig = false;
    setTimeout(function() {
      if(!this._a.updatedConfig) {
        this._a.serverConfig = Object.assign({}, this._a.serverConfigBackup);
        this.error = true
      }
    }.bind(this), 6000)
  }

  addToken() {
    this._a.addToken(this.keyName)
    setTimeout(function() {
      this._a.serverConfig = Object.assign({}, this._a.serverConfigBackup);
      this.error = true
    }.bind(this), 6000)
  }
}
