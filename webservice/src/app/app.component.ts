import { Component } from '@angular/core';
import { LoginService } from './login.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  beaconsArr: string[];
  constructor(public _loginService: LoginService) {
    this.beaconsArr = Object.keys(_loginService.beacons)
    _loginService.verifySessionId()
    setInterval(() => {_loginService.verifySessionId()}, 2000);
  }

}