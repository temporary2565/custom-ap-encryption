import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registrationForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(32), Validators.email]),
    password: new FormControl('', [Validators.required,Validators.minLength(5), Validators.maxLength(64)])
  })

  constructor(public _a:AuthService) { }

  ngOnInit() {
  }

  onSubmit() {
    
    this._a.register(this.registrationForm.value.email, this.registrationForm.value.password)
    this.registrationForm.reset()
    return false
  }

}
