import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BeaconsSharedService {
  public scannerObserver = new BehaviorSubject<any>({});
  public scannerObs = this.scannerObserver.asObservable();
  public savedObserver = new BehaviorSubject<any>({});
  public savedObs = this.savedObserver.asObservable();
  constructor() { }
}
