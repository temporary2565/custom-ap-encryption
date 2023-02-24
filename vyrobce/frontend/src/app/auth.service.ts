import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http'
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public isLoggedIn: boolean = false
  _sessionId: string = ""
  public loginError = ""
  public hasConfig: boolean = false
  public loginErrorTimeout
  public serverConfig: any = {}
  public serverConfigBackup: any = {}
  username: any;
  showPwdError: boolean = false
  updatedConfig: boolean = false;

  constructor(public http:HttpClient, public _router: Router) {this.verify()}
  async verify() {
    if(localStorage.getItem("SESSID") != null) this._sessionId = localStorage.getItem("SESSID")
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/verify", { "session":this._sessionId })
          .toPromise()
          .then(
            (res) => {
              jsondata = res;
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut()
            }
          );
        });
      if(jsondata['authenticated']) {
        if(typeof jsondata.success != "undefined" && jsondata.success) {
          this.isLoggedIn = await true
          this.username = jsondata.username
          this._sessionId = jsondata.session
          this.getConfig()
        } else {
          this.kickOut()
        }
      } else {
        this.kickOut()
      }
    }
  }
  async auth(name, pwd) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/login", { username: name, password:pwd })
          .toPromise()
          .then(
            (res) => {
              jsondata = res;
              resolve();
            }
          )
          .catch(
            (err) => {
              this.isLoggedIn = false;
              this._router.navigate(['']);
              this.serverConfig = {};
            }
          );
        });
      if(jsondata['authenticated']) {
        if(typeof jsondata.success != "undefined" && jsondata.success) {
          this._sessionId = jsondata.session
          localStorage.setItem("SESSID", jsondata.session)
          this.username = name
          this.isLoggedIn = true
          this.getConfig()
        } else {
          this.kickOut()
        }
      } else {
        this.kickOut()
      }
  }
  async register(name, pwd) {
    let jsondata;
    await new Promise((resolve, reject) => {
      this.http.post("/register", { username: name, password:pwd })
        .toPromise()
        .then(
          (res) => {
            jsondata = res;
            resolve();
          }
        )
        .catch(
          (err) => {
            this.isLoggedIn = false;
            this._router.navigate(['']);
            this.serverConfig = {};
          }
        );
      });
    if(jsondata['authenticated']) {
      if(typeof jsondata.success != "undefined" && jsondata.success) {
        this._sessionId = jsondata.session
        localStorage.setItem("SESSID", jsondata.session)
        this.isLoggedIn = true
        this.username = name
        this.getConfig()
      } else {
        this.kickOut()
      }
    } else {
      this.kickOut()
    }
  }
  async deauth() {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/login", { session: this._sessionId })
          .toPromise()
          .then(
            (res) => {
              jsondata = res;
              resolve();
            }
          )
          .catch(
            (err) => {
              this.isLoggedIn = false;
              this._router.navigate(['']);
              this.serverConfig = {};
            }
          );
        });
      this.kickOut()
      localStorage.setItem("SESSID", null)
    }
  }
  async getConfig() {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/getconfig", { "session":this._sessionId })
          .toPromise()
          .then(
            (res) => {
              jsondata = res;
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut()
            }
          );
        });
      if(jsondata['authenticated']) {
        if(typeof jsondata.success != "undefined" && jsondata.success) {
          this.serverConfig = Object.assign({}, jsondata.config)
          this.serverConfigBackup = Object.assign({}, jsondata.config)
          //this.username = jsondata.username
          this.hasConfig = true
          this.updatedConfig = true
        } else {
          this.kickOut()
        }
      } else {
        this.kickOut()
      }
    }
  }
  async removeToken(token: string): Promise<void> {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/rm-token", { "session":this._sessionId, "token": token })
          .toPromise()
          .then(
            (res) => {
              jsondata = res;
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut()
            }
          );
        });
      if(jsondata['authenticated']) {
        if(typeof jsondata.success != "undefined" && jsondata.success) {
          this.getConfig()
        } else {
          this.updatedConfig = true
          this.serverConfig = Object.assign({}, this.serverConfigBackup)

        }
      } else {
        this.kickOut()
      }
    }
  }

  async addToken(name): Promise<void> {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/add-token", { "session":this._sessionId, name: name })
          .toPromise()
          .then(
            (res) => {
              jsondata = res;
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut()
            }
          );
        });
      if(jsondata['authenticated']) {
        if(typeof jsondata.success != "undefined" && jsondata.success) {
          this.getConfig()
        }
      } else {
        this.kickOut()
      }
    }
  }

  async changePwd(old: string, newer: string): Promise<void> {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/change-pwd", { "session":this._sessionId, old: old, newer: newer })
          .toPromise()
          .then(
            (res) => {
              jsondata = res;
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut()
            }
          );
        });
      if(jsondata['authenticated']) {
        if(typeof jsondata.success != "undefined" && jsondata.success) {
          this.showPwdError = false
          this.getConfig()
        } else {
          this.showPwdError = true
        }
      } else {
        this.kickOut()
      }
    }
  }
  kickOut() {
    this.isLoggedIn = false;
    this._router.navigate(['']);
    this.serverConfig = {};
  }
}
