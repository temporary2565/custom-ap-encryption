import { Component, OnInit } from '@angular/core';
import { LoginService } from '../login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['../../styles/login.scss']
})
export class LoginComponent implements OnInit {
  constructor(public _loginService: LoginService) { }

  ngOnInit() {
  }

}
