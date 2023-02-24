import { Injectable } from '@angular/core';
import { StructureService } from './structure.service';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  appStructure: any;
  valid: any;
  constructor(public _structureService: StructureService) {
    this.appStructure = _structureService.appStructure;
    this.valid = {};
  }

  // Metoda, která vrátí popis podle maximální povolené délky, hodnoty a typu
  // Používám metodu, protože direktivy se neumí automaticky aktualizovat pomocí objektů
  public getRangeDescription(category: string, subcategory: string, item: string) {
    if(!((typeof this.appStructure[category] || typeof this.appStructure[category]['children'] || typeof this.appStructure[category]['children'][subcategory]) == 'undefined')) {
      let cfgStructure: any = this.appStructure[category]['children'][subcategory];
      let toReturn: string;
      let type: string;
      if(typeof cfgStructure['children'][item] != 'undefined' && typeof cfgStructure['children'][item]['type'] && typeof cfgStructure['children'][item][cfgStructure['children'][item]['type']] != 'undefined') {
        type = cfgStructure['children'][item]['type'];
        if(cfgStructure['children'][item]['type'] == "textfield" || cfgStructure['children'][item]['type'] == "password") {
          if(typeof cfgStructure['children'][item][type]['minLen'] != 'undefined' && typeof cfgStructure['children'][item][type]['maxLen'] != 'undefined') {
            toReturn = "Zadejte " + ((type == 'textfield') ? "text" : "heslo") + " o délce od " + cfgStructure['children'][item][type]['minLen'].toString() + " do " + cfgStructure['children'][item][type]['maxLen'].toString() + " znaků";
          } else if(typeof cfgStructure['children'][item][type]['minLen'] != 'undefined') {
            toReturn = "Zadejte " + ((type == 'textfield') ? "text" : "heslo") + " alespoň " + cfgStructure['children'][item][type]['minLen'].toString() + " znaků " + ((type == 'textfield') ? "dlouhou" : "dlouhé");
          } else if(typeof cfgStructure['children'][item][type]['maxLen'] != 'undefined') {
            toReturn = "Zadejte " + ((type == 'textfield') ? "text" : "heslo") + " kratší než " + cfgStructure['children'][item][type]['maxLen'].toString() + " znaků ";
          } else if(typeof cfgStructure['children'][item][type]['type'] != 'undefined') {
            switch(cfgStructure['children'][item][type]['type']) {
              case "number":
                if(typeof cfgStructure['children'][item][type]['minValue'] != 'undefined' && typeof cfgStructure['children'][item][type]['maxValue'] != 'undefined') {
                  toReturn = "Zadejte číslo od " + cfgStructure['children'][item][type]['minValue'].toString() + " do " + cfgStructure['children'][item][type]['maxValue'].toString();
                } else if(typeof cfgStructure['children'][item][type]['minValue'] != 'undefined') {
                  toReturn = "Zadejte číslo větší než " + cfgStructure['children'][item][type]['minValue'].toString();
                } else if(typeof cfgStructure['children'][item][type]['maxValue'] != 'undefined') {
                  toReturn = "Zadejte číslo menší než " + cfgStructure['children'][item][type]['maxValue'].toString();
                }
                break;
              case "ip":
                toReturn = "IP adresa verze 4 ve tvaru X.X.X.X"
                break;
              case "subnet":
                toReturn = "Maska podsítě ve tvaru X.X.X.X"
                break;
            }
          }
        }
      }
      return toReturn;
    }
  }

  // Metoda, která zjstí, zda je zadaný text ve správném formátu
  public validate(category: string, subcategory: string, item: string, event) {
    if(!((typeof this.appStructure[category] || typeof this.appStructure[category]['children'] || typeof this.appStructure[category]['children'][subcategory]) == 'undefined')) {
      let cfgStructure: any = this.appStructure[category]['children'][subcategory];
      let type: string;
      let invalid: boolean = false;
      if(typeof cfgStructure['children'][item] != 'undefined' && typeof cfgStructure['children'][item]['type'] && typeof cfgStructure['children'][item][cfgStructure['children'][item]['type']] != 'undefined') {
        type = cfgStructure['children'][item]['type'];
        if(cfgStructure['children'][item]['type'] == "textfield" || cfgStructure['children'][item]['type'] == "password") {
          if(typeof cfgStructure['children'][item][type]['minLen'] != 'undefined' || typeof cfgStructure['children'][item][type]['maxLen'] != 'undefined') {
            if(event.target.value.toString().length < parseInt(cfgStructure['children'][item][type]['minLen']) || event.target.value.toString().length > parseInt(cfgStructure['children'][item][type]['maxLen'])) {invalid = true;}
          } else if(typeof cfgStructure['children'][item][type]['type'] != 'undefined') {
            let regex: RegExp;
            switch(cfgStructure['children'][item][type]['type']) {
              case "number":
                regex = new RegExp('^\\d+$');
                if(!regex.test(event.target.value)) {invalid = true;} else if(parseInt(event.target.value) < parseInt(cfgStructure['children'][item][type]['minValue']) || parseInt(event.target.value) > parseInt(cfgStructure['children'][item][type]['maxValue'])) {invalid = true;}
                break;
              case "ip":
                regex = new RegExp('^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$');
                if(!regex.test(event.target.value.toString())) {invalid = true;}
            }
          }
        }
      }
      this.valid[item] = !invalid;
    }
  }

  // Vrátí, zda má být text označen za chybně napsaný
  public isValid(item) {
    return (typeof this.valid[item] != 'undefined') ? this.valid[item] : true;
  }

  // Vrátí, zda jsou ve formuláři nějaké chyby
  public isThereProblem() {
    let invalid: boolean = false;
    for(let item of Object.keys(this.valid)) {
      if(!this.valid[item]) {
        invalid = true
      }
    }
    return invalid;
  }

  public flush() {
    this.valid = {};
  }
}
