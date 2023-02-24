import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {HttpClient} from '@angular/common/http'
import { IpcServiceService } from './ipc-service.service';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public statusSubject = new BehaviorSubject("prohibited")
  public statusObs = this.statusSubject.asObservable()
  authenticated: boolean = false
  error: boolean = true
  errorTimeout = null
  username: string = ""

  constructor(public http: HttpClient, public ipc: IpcServiceService) {
    this.ipc.on('hasConfig', (event, ...a) => {
      this.loginWithToken(this.ipc.config.token, true)
    })
  }

  async login(username, password) {
    // Přihlášení k serveru
    let jsondata;
    await new Promise((resolve, reject) => {
      this.http.post(this.ipc.config.server+'/add-token', { "username": username, client: true, "password": password })
        .toPromise()
        .then(
          (res) => {
            jsondata = res;
            resolve();
          }
        )
        .catch(
          (err) => {
            this.authenticated = false;
          }
        );
        ;
      });
    if(typeof jsondata['authenticated'] == "undefined" || !jsondata['authenticated'] || !jsondata['success']) {
      this.authenticated = false
      this.ipc.config.token = ""
      this.ipc.saveConfig()
      this.error = true
      this.errorTimeout = setTimeout(function() {
        this.error = false
        clearTimeout(this.errorTimeout)
        this.errorTimeout = null
      }.bind(this), 4000)
    } else {
      this.authenticated = true
      this.ipc.config.token = jsondata['token']
      this.username = username
      this.ipc.saveConfig()
      this.error = false
    }
  }

  async loginWithToken(token, initial = false) {
    // Přihlášení k serveru
    let jsondata;
    await new Promise((resolve, reject) => {
      this.http.post(this.ipc.config.server+'/add-token', { "key": token, client: true })
        .toPromise()
        .then(
          (res) => {
            jsondata = res;
            resolve();
          }
        )
        .catch(
          (err) => {
            this.authenticated = false;
          }
        );
        ;
      });
    if(typeof jsondata['authenticated'] == "undefined" || !jsondata['authenticated'] || !jsondata['success']) {
      this.authenticated = false
      this.ipc.config.token = ""
      this.ipc.saveConfig()
      this.error = true
      if(!initial) {
        this.errorTimeout = setTimeout(function() {
          this.error = false
          clearTimeout(this.errorTimeout)
          this.errorTimeout = null
        }.bind(this), 4000)
      }
    } else {
      this.authenticated = true
      this.ipc.config.token = token
      this.username = jsondata['username']
      this.ipc.saveConfig()
      this.error = false
    }
  }

  logOut() {
    this.username = ""
    this.authenticated = false
    this.ipc.config.token = ""
    this.ipc.saveConfig()
  }
}
