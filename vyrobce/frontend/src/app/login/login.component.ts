import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(32), Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(5), Validators.maxLength(64)])
  })

  constructor(public _a: AuthService) { }

  ngOnInit() {
  }

  onSubmit() {
    this._a.auth(this.loginForm.value.email, this.loginForm.value.password)
    this.loginForm.reset()

    return false
  }

}
