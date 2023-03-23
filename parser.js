import { argv } from 'node:process';
import fs from 'node:fs';
import ejs from 'ejs';

var template = fs.readFileSync('templates/template.ejs', 'utf-8');
//var choice = fs.readFileSync('templates/choice.ejs', 'utf-8');


///////////////////////////////////// Create the JSON? ///////////////////////////////////////



///////////////////////////////////// Process the JSON //////////////////////////////////////
//Taken from https://stackoverflow.com/questions/24503470/how-to-convert-number-to-3-digit-places
function pad(n, length) {
    var len = length - (''+n).length;
    return (len > 0 ? new Array(++len).join('0') : '') + n;
  }



const json = JSON.parse(fs.readFileSync("order.json"));


//console.log(json['templates'][0]);


let templates = [];

for (let i = 0; i<Object.keys(json['templates']).length; i++)
{
    let x = pad(i+1, 3);
    templates.push(ejs.render(template, { object: json['templates']['Template'+x] }) + "\n\n");
}

console.log(templates);