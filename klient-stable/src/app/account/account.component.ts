import { Component, OnInit } from '@angular/core';
import {FormGroup, FormControl, Validators} from '@angular/forms';
import {Router} from '@angular/router'
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  coldLoginE: boolean = false
  loginForm: FormGroup = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(32), Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(64)])
  })

  tokenForm = new FormGroup({
    token: new FormControl('', [Validators.required,Validators.minLength(64), Validators.maxLength(64)])
  })

  onSubmit(act = false) {
    if(act) this.auth.loginWithToken(this.tokenForm.value.token)
    else this.auth.login(this.loginForm.value.username, this.loginForm.value.username)
  }

  constructor(public router: Router, public auth: AuthService) { }

  ngOnInit() {
  }

  coldLogin(event) {
    this.coldLoginE = event.target.checked
  }

}
