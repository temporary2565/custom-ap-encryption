import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../login.service';

@Component({
  selector: 'app-firmware',
  templateUrl: './firmware.component.html'
})
export class FirmwareComponent implements OnInit {

  constructor(public _loginService: LoginService) { }

  ngOnInit() {

  }

}
