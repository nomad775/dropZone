
var isInSidebar;
var serviceWorker;

var activeCollectionName;
var activeRow;

// https://cwiprod.corp.halliburton.com/ematrix/cwi/images/cwisprite07272012.gif

function initialize(){
    console.log("initializing");

    //detectSidebar();
    //initializeServiceWorker();
    initializeEventListeners();

    activeCollectionName = window.localStorage.getItem("activeCollection")
    
    loadFromLocalStorage();
    
}

function detectSidebar(){

    // https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/sidebar#detect-usage-in-the-sidebar

    console.log(navigator.userAgentData);
    const brands = navigator.userAgentData.brands;
    const sidebarBrandInfo = brands.find(b => b.brand === "Edge Side Panel");

    console.log("detecting sidebar");
    console.log(brands);

    if (sidebarBrandInfo) {
        isInSidebar = true;
        console.log(sidebarBrandInfo); // { brand: "Edge Side Panel", version: "1" }
    } else {
        isInSidebar = false;
        console.log("Microsoft Edge sidebar not detected");
    }

}

function initializeServiceWorker(){
    console.log("init service worker")

    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sidebar/serviceWorker.js');
        //removed { scope: '/sidebar/' }
    }
}

function initializeEventListeners(){
    
    // collections sections
    let items = document.getElementById("collections").children;
    for(let item of items){
        item.addEventListener("click", setActiveCollection);
    }

    // make CWI data section a drop target
    let sectionElement = document.getElementById("cwiDataSection");
    sectionElement.addEventListener("dragover", (event) => event.preventDefault());
    sectionElement.addEventListener("dragenter", (event) => event.preventDefault());
    sectionElement.addEventListener("drop", dropDataItem);
    sectionElement.addEventListener("dragend", dropDataItem);

    sectionElement.addEventListener("mousedown", mouseDown);
    //sectionElement.addEventListener("mouseup", mouseUp);

    // set up trash can
    let trashElement = document.getElementById("trashCan");
    trashElement.addEventListener("dragover", (event) => event.preventDefault());
    trashElement.addEventListener("dragenter", (event) => event.preventDefault());
    trashElement.addEventListener("drop", removeDataItem);

    // save button
    document.getElementById("saveIcon").addEventListener("click",saveToLocalStorage);
    document.getElementById("downloadIcon").addEventListener("click", exportToHTML);

    window.addEventListener("beforeunload", saveToLocalStorage)

}

function setActiveCollection(event){
    
    let activeProjects = document.getElementsByClassName("activeProject")

    if(activeProjects){
    for(const active of activeProjects){
        active.classList.remove("activeProject");
    }
}
    

    saveToLocalStorage();
    
    let target = this;
    let name = target.getElementsByTagName("span")[0].textContent;
    console.log("loading " + name);

    //clear current data
    let currentItems = document.getElementById("cwiDataSection").querySelectorAll(".cwiDataItemContainer");
    
    for(const item of currentItems){
        console.log(item);
        item.remove();
    }

    // load data
    activeCollectionName = name;
    loadFromLocalStorage();

    this.classList.add("activeProject");
}

function mouseDown(event){
    // prevents drag on data element if mouse is over text
    // so that text may still be selectable

    let element = event.target;    
    let isContainer = element.classList.contains("cwiDataItem");

    if(activeRow){
        activeRow.classList.remove("activeRow");
        activeRow = null;
    }

    if(isContainer){

        activeRow = element.parentElement;
        element.parentElement.setAttribute("draggable", "true");
        activeRow.classList.add("activeRow");

    }
}

function dataItemClicked(event){
    
    // set row to active for re-ordering or deleting
    
    console.log("clicked")

    return;

    let outerDataItem = event.target.closest(".cwiDataItemContainer");
    let innerDataItem = outerDataItem.children[0];

    if(event.target.className == "cwiDataItem"){

        if(activeRow){
            // clear current activeRow
            activeRow.children[0].style.border = "none";
            activeRow.setAttribute("draggable", false);
            activeRow.addEventListener("dragenter", reorderDataItems, true);  
        }

        if(outerDataItem == activeRow){
            // clear activeRow
            console.log("reset");
            activeRow = null;
            return;
        }

        event.target.style.border = "1px dashed red";

        activeRow = event.target.parentNode;
        activeRow.setAttribute("draggable", "true");
        activeRow.removeEventListener("dragenter", reorderDataItems, true);

    }
}

function dropDataItem(event){
    
    console.log("item dropped");
    
    if(activeRow){
        activeRow.classList.remove("activeRow");
        activeRow.children[0].style.border = "none";
        activeRow.setAttribute("draggable", "false");
        activeRow = null;
        return;
    }

    // prevent default action (open as link for some elements)
    event.preventDefault();
    
    let data = event.dataTransfer;

    let plainText = data.getData("text/plain");
    let htmlText = data.getData("text/html");
    let uriListText = data.getData("text/uri-list");

    // console.log("Plain: ", plainText);
    // console.log("HTML : ", htmlText);
    // console.log("URI list : ", uriListText);

    if(htmlText){
        
        let objData = parseCWIobjinfo(htmlText);
        createNewDataItem(objData);

    }
    
}

function parseCWIobjinfo(htmlText){

    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlText;

    // as a safeguard query the <a> element with the objinfo attribute
    let objInfoElement = tempDiv.querySelector("[objinfo]");

    if(objInfoElement){

        let objInfo = objInfoElement.getAttribute("objinfo");    
        var href = objInfoElement.getAttribute("href");

        // parse objInfo string
        let objParts = objInfo.split("|")
        try{

            var type = objParts[0];
            var name = objParts[1];
            var rev = objParts[2];
            var desc = objParts[3];
            var label = objParts[4];

        }catch(e){

        }

    }else{
        
        let aElement = tempDiv.querySelector("[href]");
        
        name = aElement.textContent;
        href = aElement.getAttribute("href");

        type = "none"
        rev = ""
        desc = href;
        label = "";
    }
    
    return {"type": type, "name": name, "rev": rev, "desc": desc, "href": href, "label": label};
}

function createNewDataItem(objData){
    
    let parent = document.getElementById("cwiDataSection");
    
    let newItem = createNewDataElement(objData);

    parent.insertBefore(newItem, document.getElementById("dropTarget"));

    // add event listeners to data item
    newItem.addEventListener("click", dataItemClicked, true);
    newItem.addEventListener("dragover", (event) => event.preventDefault());
    newItem.addEventListener("dragenter", reorderDataItems);
}

function createNewDataElement(objData){

    let template = document.getElementById("cwiDataItemTemplate").content.firstElementChild;
    let newItem = template.cloneNode(true);
    
    let nameElement = newItem.querySelector(".cwiDataName");
    let descElement = newItem.querySelector(".cwiDataDesc");
    let labelElement = newItem.querySelector(".cwiDataUserLabel");
    
    let typeElement = newItem.querySelector(".cwiDataIcon");
    let linkElement = newItem.querySelector("a");

    linkElement.setAttribute("href", objData.href);
    linkElement.setAttribute("target", "_blank");    
    linkElement.setAttribute("objData", JSON.stringify(objData)) ;

    nameElement.innerHTML = objData.name;
    descElement.innerText= objData.desc;
    descElement.title = objData.desc;

    if(objData.label){
        labelElement.innerText = objData.label;
    }
    
    return newItem;    
}



function reorderDataItems(event){
    // drag enter (data item)

    if(activeRow == null) return;

    event.preventDefault(); 
    event.dataTransfer.dropEffect = "move";
    
    event.stopImmediatePropagation();
    
    console.log("enter");
    //console.log(event.target);

    // section holds all the cwi data items
    // cwiDataItemContainer is the data item and horizontal rule
    // cwiDataItem is icon and text
    let section = document.getElementById("cwiDataSection");
    let dataItems = Array.from(section.querySelectorAll(".cwiDataItemContainer"));

    let enteredDataItem = event.target.closest(".cwiDataItemContainer");
    let enteredDataItemIndex = dataItems.indexOf(enteredDataItem);
    
    let activeRowIndex = dataItems.indexOf(activeRow);

    if(enteredDataItemIndex > activeRowIndex)
         enteredDataItem.after(activeRow);
    else
         enteredDataItem.before(activeRow);
}

function removeDataItem(event){

    console.log("remove", event);

    activeRow.remove();
    activeRow = null;

}



function saveToLocalStorage(){

    console.log("saving");

    let collectionData = new Object;

    let dataSection = document.getElementById("cwiDataSection");
    let dataItems = dataSection.querySelectorAll(".cwiDataItem");

    for(var i=0; i<dataItems.length; i++){

        let item = dataItems[i];
        let dataObj = item.querySelector("[objData]").getAttribute("objData");
        
        // add user label to objData attribute 
        let objDataJSON = JSON.parse(dataObj);
        let label = item.querySelector(".cwiDataUserLabel").textContent;
        objDataJSON.label = label;
    
        collectionData["key" + i] = objDataJSON;
    }
 
    window.localStorage.setItem("activeCollection", activeCollectionName);
    window.localStorage.setItem(activeCollectionName, JSON.stringify(collectionData));

}


function loadFromLocalStorage(){

    console.log("loading saved data");

    let collectionData = window.localStorage.getItem(activeCollectionName);

    if(!collectionData) return;

    let dataItems = JSON.parse(collectionData);

    for(let key in dataItems){
        let objData = dataItems[key];
        createNewDataItem(objData);
    }
}

function exportCurrentCollectionToFile(){
   
    let collectionData = new Object;

    let dataSection = document.getElementById("cwiDataSection");
    let dataItems = dataSection.querySelectorAll(".cwiDataItem");

    for(var i=0; i<dataItems.length; i++){

        let item = dataItems[i];
        let dataObj = item.querySelector("[objData]").getAttribute("objData");
        
        // add user label to objData attribute 
        let objDataJSON = JSON.parse(dataObj);
        let label = item.querySelector(".cwiDataUserLabel").textContent;
        objDataJSON.label = label;
    
        collectionData["key" + i] = objDataJSON;
    }
    
    console.log(JSON.stringify(collectionData));
    json = JSON.stringify(collectionData);
    var a = document.createElement("a")
    a.href = URL.createObjectURL(
        new Blob([json], {type:"application/json"})
    )
    
    a.download = "DZexport.json"
    a.click()

    // window.localStorage.setItem("activeCollection", activeCollectionName);
    // window.localStorage.setItem(activeCollectionName, JSON.stringify(collectionData));
}

function exportToXML(){
   
    console.log("saving");

    let collectionData = new Object;

    let dataSection = document.getElementById("cwiDataSection");
    let dataItems = dataSection.querySelectorAll(".cwiDataItem");

    let parser = new DOMParser;
    let xml  = parser.parseFromString('<?xml version="1.0" encoding="utf-8"?><root></root>', "application/xml");

    for(var i=0; i<dataItems.length; i++){

        let item = dataItems[i];
        let dataAttr = item.querySelector("[objData]").getAttribute("objData");

        let dataObj = JSON.parse(dataAttr);
        let userLabel = item.querySelector(".cwiDataUserLabel").textContent;
        
        let xmlItem = xml.createElement("item");
        xmlItem.setAttribute("name", dataObj.name);  
        xmlItem.setAttribute("rev", dataObj.rev);

        let type = xml.createElement("type");
        let desc = xml.createElement("desc");
        let href = xml.createElement("href");
        let label = xml.createElement("label");

        type.textContent = dataObj.type;
        desc.textContent = dataObj.desc;
        href.textContent = dataObj.href;
        label.textContent = dataObj.label;

        xmlItem.appendChild(type);
        xmlItem.appendChild(desc);
        xmlItem.appendChild(href);
        xmlItem.appendChild(label);

        xml.documentElement.appendChild(xmlItem);
    }
    
    let serializer = new XMLSerializer
    let xmlStr = serializer.serializeToString(xml);
    
    var a = document.createElement("a")
    a.href = URL.createObjectURL(
        new Blob([xmlStr], {type:"text/xml"})
    )
    
    a.download = "DZexport.xml"
    a.click()

}

function z_exportToHTML(){
    
    let dataSection = document.getElementById("cwiDataSection");
    let dataItems = dataSection.querySelectorAll(".cwiDataItem");

    let html = document.implementation.createHTMLDocument();
    let body = html.body;
    
    let style = html.createElement("style");
    style.innerText = "body{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-weight: 500;}"
    //  height: 50px; width: 100%;margin: 1px; padding: 1px; display: grid; grid-template-columns: 40px 150px auto 150px; grid-template-rows: 20px 20px;  row-gap: 3px;column-gap: 10px; cursor: move;"

    html.body.appendChild(style);

    let h1 = html.createElement("H1");
    h1.textContent = activeCollectionName;

    body.appendChild(h1);

    let collectionData = window.localStorage.getItem(activeCollectionName);

    if(!collectionData) return;

    //let dataItems = JSON.parse(collectionData);

    for(let key in dataItems){
        let objData = dataItems[key];
        createNewDataItem(objData);
    }




    for(var i=0; i<dataItems.length; i++){

        let item = dataItems[i];

        let a = item.getElementsByTagName("a");
        let href = a.href;
        let ojbdata = a.getAttribute("a");

        let name = item.querySelector(".cwiDataName").textContent;
        let desc= item.querySelector("cwiDataDesc").textContent;
        let label = item.querySelector("cwiDataUserLabel").textContent;

        let p1 = html.createElement("p");
        let p2 = html.createElement("p");

        p1.innerHTML = `${type} <a>${name}</a> ${desc} <br>${desc}`;
        p2.textContent = label;


        item.querySelector(".cwiDataIcon").innerHTML = "\u{1F517}";
        body.appendChild(item);
    }
    
    console.log(body.innerHTML);

    var a = document.createElement("a")
    a.href = URL.createObjectURL(
        new Blob([html.documentElement.outerHTML], {type:"text/html"})
    )
    
    //a.download = "DZexport.xml"
    a.target = "_blank";
    a.click()

}

function exportToHTML(){

    console.log("exporting saved data");

    // create new HTML documnet
    let exportHTML = document.implementation.createHTMLDocument();
    let exportBody = exportHTML.body;
    
    // heading
    let h1 = exportHTML.createElement("H1");
    h1.textContent = activeCollectionName;
    exportBody.appendChild(h1);

    //data items
    let collectionData = window.localStorage.getItem(activeCollectionName);

    if(!collectionData) return;

    let dataItems = JSON.parse(collectionData);

    for(let key in dataItems){
        
        let objData = dataItems[key];
        let name = objData.name;

        let newElement = createNewDataElement(objData);

        newElement.querySelector(".cwiDataIcon").remove();
        newElement.querySelector(".cwiDataName").remove();

        newElement.getElementsByTagName("a")[0].textContent = name;
        let type = objData.type;

        console.log(newElement);

        exportBody.appendChild(newElement);


    }

    var a = document.createElement("a")
    a.href = URL.createObjectURL(
        new Blob([exportHTML.documentElement.outerHTML], {type:"text/html"})
    )
    
    a.download = "DZexport.html"
    //a.target = "_blank";
    a.click()

}