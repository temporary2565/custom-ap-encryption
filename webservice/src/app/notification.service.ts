import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LoginService } from './login.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public mainArr: string[] = [];
  public mainNameArr: string[] = [];
  public mainMessageArr: string[] = [];

  public PendingRequests = new BehaviorSubject<any[]>([]);
  public PendingRequestsObs = this.PendingRequests.asObservable();

  AddPendingRequest(id: string, name: string, message: string, status: string) {
    let objarr: any[] = [];
    let obj: any = {};
    let tmpMessage: string = "";
    let unique: boolean = true;
    switch(message) {
      case "--d":
        tmpMessage = `Received a new pairing request`;
        break;
      case "--e":
        tmpMessage = `Paired device`;
        break;
      default:
        tmpMessage = message;
        break;
    }
    obj.name = name;
    obj.message = tmpMessage;
    obj.id = id;
    obj.status = status;
    let sub = this.PendingRequestsObs.subscribe(x => {objarr = Object.assign([], x)});
    sub.unsubscribe();
    for(let item of objarr) {
      if(item.id == id) unique = false;
    }
    if(unique) {
      objarr.push(obj);
      this.PendingRequests.next(objarr);
    }
  }

  RemovePendingRequest(id: string) {
    let objarr: any[];
    let index: number = 0;
    let sub = this.PendingRequestsObs.subscribe(x => {objarr = Object.assign([], x)});
    sub.unsubscribe();
    for(let item of objarr) {
      if(item.id) {
        delete objarr[index];
      }
      index++;
    }
    this.PendingRequests.next(objarr);
  }

  reject(device: string): void {
    this._loginService.modifyPairings(device, "reject");
  }

  accept(device: string): void {
    this._loginService.modifyPairings(device, "accept");
  }

  delete(device: string) {
    this._loginService.modifyPairings(device, "delete");
  }

  constructor(public _loginService: LoginService) {
    this._loginService.pairPendingObs.subscribe((x) => {
      let objarr: any[];
      let sub = this.PendingRequestsObs.subscribe(y => {objarr = Object.assign([], y)});
      sub.unsubscribe();
      let idArr: string[] = [];
      let idArrNew: string[] = [];
      for(let item of objarr) {
        idArr.push(item.id);
      }
      for(let item of x) {
        idArrNew.push(item.id);
        if(!idArr.includes(item.id))
          this.AddPendingRequest(item.id, item.name, (item.status == "paired") ? "--e" : "--d", item.status);
      }
      for(let item of idArr) {
        if(!idArrNew.includes(item)) {
          this.RemovePendingRequest(item);
        }
      }
    });
  }
}
