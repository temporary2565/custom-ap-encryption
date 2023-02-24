import { Injectable } from '@angular/core';

// Služba obsahující  různé funkce pro zpracování struktury na formulář

@Injectable({
  providedIn: 'root'
})
export class FormService {
  public dnsArr: string[];
  public shown: string[][];

  constructor() {
      this.dnsArr = ["8.8.4.4"];
  }

  getType(cfgStructure: any, item: string) {
    return cfgStructure['children'][item]['type'];
  }

  // Metoda pro vrácení pole s položkami selectu
  selectCycle(cfgStructure, item: string) {
    return Object.keys(cfgStructure['children'][item]['select']['children']);
  }

  // Metoda pro zpracování prvku select, kde je zadán místo položek zadán rozsah
  selectRange(cfgStructure, item: string) {
    let arr: string[] = [];
    if(Object.keys(cfgStructure['children'][item]['selectrange']).includes('prepend')) {
      arr = arr.concat(Object.keys(cfgStructure['children'][item]['selectrange']['prepend']));
    }
    let range: string = cfgStructure['children'][item]['selectrange']['range'];
    for(let i=parseInt(range.split("-")[0]); i < parseInt(range.split("-")[1]); i++) {
      arr.push(i.toString());
    }
    if(Object.keys(cfgStructure['children'][item]['selectrange']).includes('append')) {
      arr = arr.concat(Object.keys(cfgStructure['children'][item]['selectrange']['append']));
    }
    return arr;
  }

  getSelectRangeLabel(cfgStructure, item: string, option: string) {
    if(!(typeof cfgStructure['children'][item]['selectrange']['prepend'] == ('undefined' || 'null')) && Object.keys(cfgStructure['children'][item]['selectrange']['prepend']).includes(option)) {
      return cfgStructure['children'][item]['selectrange']['prepend'][option]['label'];
    } else if(!(typeof cfgStructure['children'][item]['selectrange']['append'] == ('undefined' || 'null')) && Object.keys(cfgStructure['children'][item]['selectrange']['append']).includes(option)) {
      return cfgStructure['children'][item]['selectrange']['append'][option]['label'];
    } else {
      return option.toString();
    }
  }

  // Prozatimní metoda pro zpracování pole ve struktuře
  updateArray(operation: string) {
    switch(operation) {
      case "add":
        if(this.dnsArr.length < 3)
          this.dnsArr.push("8.8.8.8");
        break;
      case "remove":
        if(this.dnsArr.length > 1)
          this.dnsArr.pop();
        break;
    }
  }

  // Metoda pro nastavení dynamického skrývání
  findShowon(cfgStructure, item: string) {
    return (typeof cfgStructure['children'][item]['showon'] != 'undefined') ? `showon-${cfgStructure['children'][item]['showon']}` : 'showon-default';
  }
}
