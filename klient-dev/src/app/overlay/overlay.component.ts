import { Component, OnInit } from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { IpcServiceService } from '../ipc-service.service';

@Component({
  selector: 'app-overlay',
  templateUrl: './overlay.component.html',
  styleUrls: ['./overlay.component.scss']
})
export class OverlayComponent implements OnInit {
  personalForm = new FormGroup({
    password: new FormControl('', [Validators.required])
  })
  enterpriseForm = new FormGroup({
    password: new FormControl('', [Validators.required])
  })

  constructor(public ipc: IpcServiceService) { }

  ngOnInit() {
  }

  connect() {
    if(this.personalForm.valid) {
    this.ipc.send('connect', this.ipc.current, this.personalForm.value.password)
    this.personalForm.reset()
    this.ipc.closeOverlay()
    }
  }

  connectEnterprise() {
    if(this.personalForm.valid) {
      this.ipc.send('connect', this.ipc.current, this.personalForm.value.password)
      this.enterpriseForm.reset()
      this.ipc.closeOverlay()
      }
  }

  closeOverlay() {
    this.personalForm.reset()
    this.enterpriseForm.reset()
    this.ipc.current = {}
    this.ipc.closeOverlay()
  }

}
