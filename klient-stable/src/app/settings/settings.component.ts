import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { IpcServiceService } from '../ipc-service.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  

  settingsForm:FormGroup = new FormGroup({
    server: new FormControl(this.ipc.config.server, [Validators.required]),
    interface: new FormControl(this.ipc.interfaces.length > 0 ? this.ipc.interfaces[0] : "", [Validators.required]),
    token: new FormControl(this.ipc.config.token, [Validators.required, Validators.minLength(64), Validators.maxLength(64)]),
    // passwordOld: new FormControl('', [Validators.minLength(5), Validators.maxLength(64)]),
    // password: new FormControl('', [Validators.minLength(5), Validators.maxLength(64)]),
    // password2: new FormControl('', [Validators.minLength(5), Validators.maxLength(64)]),
  })

  

  constructor(public ipc: IpcServiceService) {
  }

  onSubmit() {
    if(!this.settingsForm.valid) {
      alert("Prosím zkontrolujte zadané údaje.")
      return false
    }
    this.ipc.config.server = this.settingsForm.value.server
    this.ipc.config.interface = this.settingsForm.value.interface
    this.ipc.config.token = this.settingsForm.value.token
    this.ipc.saveConfig()
  }

  ngOnInit() {
  }

}
