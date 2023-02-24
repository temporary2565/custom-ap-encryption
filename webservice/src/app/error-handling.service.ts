import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  public currentObserver = new BehaviorSubject<any>({});
  public timeout: any = {value: 0, active: false};
  public currentObs = this.currentObserver.asObservable();
  public log: string[];

  constructor() {
    this.currentObs.subscribe((e) => {
      if(typeof e.error != 'undefined') {
        if(typeof e.timeout == 'undefined') {
          this.timeout = {value: 0, active: false};
        } else {
          this.timeout = {value: e.timeout, active: true};
        }
        this.log.push(e.error + ": " + e.message);
      }
    })
    setInterval(() => this.Expire(), 1000);
  }

  public Expire(): void {
    if(this.timeout.value < 1) {
      this.timeout = {value: 0, active: false};
    }
    if(this.timeout.active) {
      this.timeout.value--;
    }
  }

  public except(err: string, txt: string, _timeout: number): void {
    let timeout = _timeout || 0;
    if(timeout < 1) {
      this.currentObserver.next({
        error: err,
        message: txt
      })
    } else {
      this.currentObserver.next({
        error: err,
        message: txt,
        timeout: timeout
      })
    }
  }

  public clear(): void {
    this.currentObserver.next({})
  }

}
