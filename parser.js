import { argv } from 'node:process';
import fs from 'node:fs';
import ejs from 'ejs';
import { parse } from 'node:path';

var template = fs.readFileSync('templates/template.ejs', 'utf-8');
var choice = fs.readFileSync('templates/choice.ejs', 'utf-8');
var RecursiveChoice = fs.readFileSync('templates/RChoice.ejs', 'utf-8');
var LChoice = fs.readFileSync('templates/LoopChoice.ejs', 'utf-8');
var IfChoice = fs.readFileSync('templates/IfChoice.ejs', 'utf-8');
var ExerciseChoice = fs.readFileSync('templates/ExerciseChoice.ejs', 'utf-8');
var nomnoml = fs.readFileSync('test.nomnoml', 'utf-8');
let jsonFile = {
    "name" : "",
    "templates" : {},
    "choices" : {},
    "parameters" : 
    {
        "public" : false
    }
}
let DAMLFileText = `module Main where\n\nimport DA.List\nimport DA.Optional\nimport DA.Time\nimport DA.Text as T\nimport DA.Foldable\nimport Daml.Script\n`


///////////////////////////////////// Create the JSON from nomnoml ///////////////////////////////////////

function isAlphaNumeric(str) {
    var code, i, len;
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
    return false;
    }
    return true;
  };



let elements = nomnoml.replace(/ /g,"").split("\n");
jsonFile.name = elements[0]
elements = elements.filter(x => x.includes("["));
let flowElements = elements.filter(x => !x.includes("[<"));
for(let i = 0; i < flowElements.length; i++){elements.pop()}
let flow = ""
flowElements.forEach(x => flow+=x)

while(true){
    let old = flow;
    flow = flow.replace("] ", "]").replace(" [", "[")
    let changed = flow;
    if (old === changed){
        break;
    }
}

elements.forEach(x => 
{
    let object = x;
    let type = object.split("<")[1].split(">")[0];
    let name = object.split(">")[1].split("|")[0];
    if(type === "template")
    {
        let signatory = object.split("\u{270D}")[1].split(";")[0];
        let observer = object.split("\u{1F50E}")[1].split(";")[0];
        let number = Object.keys(jsonFile.templates).length+1;
        let params = object.split("|")[1].split(";\u{270D}")[0].split(";\u{1F50E}")[0].split(";");
        params = params.map(x => [x.split("(")[0], x.split("(")[1].split(")")[0]]);
        let jsonParams = {}
        for(let i = 0; i<params.length;i++){
            jsonParams[params[i][0]] = params[i][1];
        }
        jsonFile.templates["template00" + number] = {};
        jsonFile.templates["template00" + number].id = "T" + number;
        jsonFile.templates["template00" + number].name = name;
        jsonFile.templates["template00" + number].parameters = jsonParams;
        jsonFile.templates["template00" + number].type = type;
        jsonFile.templates["template00" + number].signatory = signatory;
        jsonFile.templates["template00" + number].observer = observer;
    }
    else
    {
        let controller = object.split("\u{1F449}")[1].split(";")[0];
        let dependency = flow.split("]->["+name)[0].split("[");
        dependency = dependency[dependency.length-1];
        let toCreate = flow.split(name+"]");
        let jsonCreates = []
        for(let i = 1; i<toCreate.length;i++){
            x = toCreate[i].split("]")[0].split("[")[1]
            if (elements.find(y => y.includes(x+"|"))) jsonCreates.push(x)       
        }
        let number = Object.keys(jsonFile.choices).length+1;
        let consuming = !(type === "ncchoice")
        jsonFile.choices["choice00" + number] = {};
        jsonFile.choices["choice00" + number].id = "C" + number;
        jsonFile.choices["choice00" + number].name = name
        jsonFile.choices["choice00" + number].type = type
        jsonFile.choices["choice00" + number].controller = controller;
        jsonFile.choices["choice00" + number].dependency = dependency;
        jsonFile.choices["choice00" + number].consuming = consuming;
        jsonFile.choices["choice00" + number].toCreate = jsonCreates;
        if(type === "cchoice")
        {
            let parameter = object.split("|")[2].split("<")[0].split(">")[0];
            let condition = ""
            let text = object.split(parameter)[1];
            isAlphaNumeric(text[1])? condition = text[0] : condition = text[0] + text[1]
            let compare = object.split(condition);
            compare = compare[compare.length-1].split(";")[0];
            let def = flow.split(name+"]+->[")[1].split("]")[0];
            jsonCreates.splice(jsonCreates.indexOf(def),1);
            jsonFile.choices["choice00" + number].parameter = parameter;
            jsonFile.choices["choice00" + number].ifType = condition;
            jsonFile.choices["choice00" + number].compare = compare;
            jsonFile.choices["choice00" + number].default = def;
            jsonFile.choices["choice00" + number].toCreate = jsonCreates;
        }
        else if(type === "EChoice")
        {
            let params = object.split("|")[1].split(";\u{1F449}")[0].split(";");
            let jsonParams = {};
            for(let i = 0; i<params.length;i++){
                jsonParams[params[i][0]] = params[i][1];
            }
            let choice = toCreate.filter(x => !jsonCreates.includes(x))[0];
            let jsonCreates = toCreate.filter(x => !jsonCreates.includes(x))[0];
            jsonFile.choices["choice00" + number].parameters = params;
            jsonFile.choices["choice00" + number].choice = choice;
            jsonFile.choices["choice00" + number].toCreate = jsonCreates;
        }
    }

});

console.log(jsonFile)



///////////////////////////////////// Process the JSON //////////////////////////////////////
/*
const json = JSON.parse(fs.readFileSync("AuctionOrder.json"));

if(json['parameters']['public']){
    DAMLFileText += "import PublicSetup\n\n" 
}
else{
    DAMLFileText += "\n"
}


//console.log(json['templates'][0]);

let templates = [];

for (let i = 0; i<Object.keys(json['templates']).length; i++)
{
    let x = json['templates'][Object.keys(json["templates"])[i]]
    templates.push([json["templates"][Object.keys(json["templates"])[i]]["id"], ejs.render(template, { object: x }) +"\n"]);
}

for (let i = 0; i<Object.keys(json['choices']).length; i++)
{
    let x = json['choices'][Object.keys(json["choices"])[i]]
    let owner = x["dependency"];
    let next = x["toCreate"];

    let origParams = json["templates"][Object.keys(json['templates']).find(k => json['templates'][k].id === owner)]["parameters"];

    let withs = [];
    let paramsToUse = [];


    if(next)
    {
        let nextParams = json["templates"][Object.keys(json['templates']).find(k => json['templates'][k].id === next)]["parameters"];

        for (const [key, value] of Object.entries(nextParams)){
            paramsToUse.push([key])
            if(!origParams.hasOwnProperty(key)){
                withs.push([key,value]);
            }
        }
    }
    if(x["type"] == "RecursiveChoice")
    {
        templates.find(x => x[0] === owner)[1] += ejs.render(RecursiveChoice, { object: x, extras: withs, params: paramsToUse}) + "\n\n";
    }
    else if(x["type"] == "LChoice")
    {
        templates.find(x => x[0] === owner)[1] += ejs.render(LChoice, { object: x, extras: withs, params: paramsToUse}) + "\n\n";
    }
    else if(x["type"] == "IfChoice")
    {
        templates.find(x => x[0] === owner)[1] += ejs.render(IfChoice, { object: x, extras: withs, params: paramsToUse}) + "\n\n";
    }
    else if(x["type"] == "ExerciseChoice")
    {
        let name = json["choices"][Object.keys(json['choices']).find(k => json['choices'][k].id === x.choice)]["name"];
        templates.find(x => x[0] === owner)[1] += ejs.render(ExerciseChoice, { object: x, extras: withs, params: paramsToUse, name: name}) + "\n\n";
    }
    else
    {
        templates.find(x => x[0] === owner)[1] += ejs.render(choice, { object: x, extras: withs, params: paramsToUse}) + "\n\n";
    }
}

//console.log(templates);

templates.forEach( x =>{
    DAMLFileText += x[1]
});

if(json['parameters']['public'])
{
    DAMLFileText += `setup = script do

    PublicSetup.setup


    bobId <- validateUserId $ toUserId "bob"
    bobUser <- getUser bobId
    let Some bob = bobUser.primaryParty
    
    bobRights <- listUserRights bobId
    let readAs = [p | CanReadAs p <- bobRights]
    let bobPublic = head readAs

    aliceId <- validateUserId $ toUserId "alice"
    aliceUser <- getUser aliceId
    let Some alice = aliceUser.primaryParty
  
    aliceRights <- listUserRights aliceId
    let readAs = [p | CanReadAs p <- aliceRights]
    let alicePublic = head readAs

    paco <- allocatePartyWithHint "Paco" (PartyIdHint "paco")
    luis <- allocatePartyWithHint "Luis" (PartyIdHint "luis")
    pacoId <- validateUserId "paco"
    luisId <- validateUserId "luis"
    createUser (User pacoId (Some paco)) [CanActAs paco]
    createUser (User luisId (Some luis)) [CanActAs luis]

    pure ()`
}
else
{
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
}




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
                if (json['parameters']['public'])
                {
                    fs.writeFile("daml_output/daml/PublicSetup.daml",`module PublicSetup where

import DA.Foldable (forA_)
import DA.Optional (fromSomeNote)
import qualified DA.Text as T
import Daml.Script

-- | A test user for the create-daml-app network.
data TestUser = TestUser with
  alias : Text
  public : Party

-- | Create a public party, then create three test users.
setup : Script ()
setup = do
  public <- createPublic
  let aliases = ["Alice", "Bob", "Charlie"]
  forA_ aliases $ \\alias -> createTestUser $ TestUser alias public

-- | Create a test user.
createTestUser : TestUser -> Script Party
createTestUser TestUser{alias, public} = do
  u <- getOrCreateUser alias (Some public)
  let p = getPrimaryParty u
  pure p

-- | Create the public party.
createPublic : Script Party
createPublic = do
  publicUser <- getOrCreateUser "Public" None
  pure $ getPrimaryParty publicUser


-- | Get a user by their id. If the user doesn't exist, it is created.
getOrCreateUser : Text -> Optional Party -> Script User
getOrCreateUser alias publicM = do
  userId <- validateUserId $ toUserId alias
  try
    getUser userId
  catch
    UserNotFound _ -> do
      p <- allocateParty alias
      let u = User userId (Some p)
      createUser u $ CanActAs p :: [CanReadAs public | Some public <- [publicM]]
      pure u

-- | Convert a text to a valid user id.
toUserId : Text -> Text
toUserId = T.asciiToLower

-- | Try to get the primary party of a user and fail if the user has no associated primary party.
getPrimaryParty : User -> Party
getPrimaryParty u = fromSomeNote ("User " <> userIdToText u.userId <> " is missing a primary party.") u.primaryParty`, (err2) => {if (err2) throw (err2)}) 
                }
            }
        })
//exec('sed "s/\r/\n/g" daml_output/daml/Step.daml | sed "s/\t/    /g" > daml_output/daml/Main.daml')

*/