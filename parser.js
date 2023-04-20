import { argv } from 'node:process';
import fs from 'node:fs';
import ejs from 'ejs';
import { parse } from 'node:path';

var template = fs.readFileSync('templates/template.ejs', 'utf-8');
var choice = fs.readFileSync('templates/choice.ejs', 'utf-8');
var RecursiveChoice = fs.readFileSync('templates/RChoice.ejs', 'utf-8');
var LChoice = fs.readFileSync('templates/LoopChoice.ejs', 'utf-8');
let DAMLFileText = `module Main where\n\nimport DA.List\nimport DA.Optional\nimport DA.Time\nimport Daml.Script\n\n`

///////////////////////////////////// Create the JSON? ///////////////////////////////////////



///////////////////////////////////// Process the JSON //////////////////////////////////////
//Taken from https://stackoverflow.com/questions/24503470/how-to-convert-number-to-3-digit-places
function pad(n, length) {
    var len = length - (''+n).length;
    return (len > 0 ? new Array(++len).join('0') : '') + n;
  }



const json = JSON.parse(fs.readFileSync("order2.json"));


//console.log(json['templates'][0]);


let templates = [];

for (let i = 0; i<Object.keys(json['templates']).length; i++)
{
    let x = pad(i+1, 3);
    templates.push(ejs.render(template, { object: json['templates']['template'+x] }) +"\n");
}

for (let i = 0; i<Object.keys(json['choices']).length; i++)
{
    let x = pad(i+1, 3);

    let owner = json['choices']['choice'+x]["dependency"].split("T")[1];
    let next = json['choices']['choice'+x]["toCreate"].split("T")[1];

    let origParams = json['templates']['template'+owner]["parameters"];
    let withs = [];
    let paramsToUse = [];


    if(next)
    {
        let nextParams = json['templates']['template'+next]["parameters"];

        for (const [key, value] of Object.entries(nextParams)){
            paramsToUse.push([key])
            if(!origParams.hasOwnProperty(key)){
                withs.push([key,value]);
            }
        }
    }
    if(json['choices']['choice'+x]["type"] == "RecursiveChoice")
    {
        templates[parseInt(owner)-1] += ejs.render(RecursiveChoice, { object: json['choices']['choice'+x], extras: withs, params: paramsToUse}) + "\n\n";
    }
    else if(json['choices']['choice'+x]["type"] == "LChoice")
    {
        templates[parseInt(owner)-1] += ejs.render(LChoice, { object: json['choices']['choice'+x], extras: withs, params: paramsToUse}) + "\n\n";
    }
    else
    {
        templates[parseInt(owner)-1] += ejs.render(choice, { object: json['choices']['choice'+x], extras: withs, params: paramsToUse}) + "\n\n";
    }
}

//console.log(templates);

templates.forEach( x =>{
    DAMLFileText += x
});


DAMLFileText += `setup = script do

    alice <- allocatePartyWithHint "Alice" (PartyIdHint "alice")
    hugo <- allocatePartyWithHint "Hugo" (PartyIdHint "hugo")
    bob <- allocatePartyWithHint "Bob" (PartyIdHint "bob")
    paco <- allocatePartyWithHint "Paco" (PartyIdHint "paco")
    luis <- allocatePartyWithHint "Luis" (PartyIdHint "luis")
    aliceId <- validateUserId "alice"
    bobId <- validateUserId "bob"
    hugoId <- validateUserId "hugo"
    pacoId <- validateUserId "paco"
    luisId <- validateUserId "luis"

    createUser (User aliceId (Some alice)) [CanActAs alice] 
    createUser (User bobId (Some bob)) [CanActAs bob]
    createUser (User hugoId (Some hugo)) [CanActAs hugo]
    createUser (User pacoId (Some paco)) [CanActAs paco]
    createUser (User luisId (Some luis)) [CanActAs luis]

    pure ()`


fs.mkdir("daml_output/daml",{ recursive: true }, (err) => {
            if (err){
                throw err;
            }
            else{
                fs.writeFile("daml_output/daml/Step.daml", DAMLFileText, (err2) => {if (err2) throw (err2)})
                fs.writeFile("daml_output/daml.yaml",`sdk-version: 2.1.1
name: project
source: daml
init-script: Main:setup
version: 0.0.1
dependencies:
- daml-prim
- daml-stdlib
- daml-script`, (err2) => {if (err2) throw (err2)})
            }
        })
//exec('sed "s/\r/\n/g" daml_output/daml/Step.daml | sed "s/\t/    /g" > daml_output/daml/Main.daml')