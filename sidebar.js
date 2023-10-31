
var isInSidebar;
var serviceWorker;

var activeCollectionId;

var activeRow;

// https://cwiprod.corp.halliburton.com/ematrix/cwi/images/cwisprite07272012.gif

function initialize(){
    console.log("initializing");

    detectSidebar();
    //initializeServiceWorker();
   
    initializeEventListeners();
    initializeCollections()
}

function detectSidebar(){

    // https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/sidebar#detect-usage-in-the-sidebar

    const brands = navigator.userAgentData.brands;
    const sidebarBrandInfo = brands.find(b => b.brand === "Edge Side Panel");

    if (sidebarBrandInfo) {
        isInSidebar = true;
        console.log("MicroSoft Edge sidebar IS detected!"); // { brand: "Edge Side Panel", version: "1" }
        console.log(brands);
    } else {
        isInSidebar = false;
        console.log("Microsoft Edge sidebar NOT detected");
    }

}

function initializeServiceWorker(){
    //console.log("init service worker")

    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sidebar/serviceWorker.js');
        //removed { scope: '/sidebar/' }
    }
}

function initializeEventListeners(){

    // collections buttons
    document.getElementById("addIcon").addEventListener("click", createNewCollection);
    //document.getElementById("settingsIcon").addEventListener("click", );
    
    // make CWI data section a drop target
    let sectionElement = document.getElementById("cwiDataSection");

    sectionElement.addEventListener("dragover", addClass);
    sectionElement.addEventListener("dragenter",  addClass);
    sectionElement.addEventListener("dragleave", removeClass);
    
    
    sectionElement.addEventListener("drop", dropDataItem);
    sectionElement.addEventListener("dragend", dropDataItem);

    sectionElement.addEventListener("mousedown", mouseDown);

    // data items buttons
    document.getElementById("saveIcon").addEventListener("click",saveToLocalStorage);
    document.getElementById("downloadIcon").addEventListener("click", exportCollectionToHTML);
    document.getElementById("deleteIcon").addEventListener("click", deleteCollection);

     // set up drop trash can
     let trashElement = document.getElementById("trashCan");
     trashElement.addEventListener("dragover", (event) => event.preventDefault());
     trashElement.addEventListener("dragenter", (event) => event.preventDefault());
     trashElement.addEventListener("drop", removeDataItem);

     // set auto-save on shutdown
     window.addEventListener("beforeunload", saveToLocalStorage)
}

function addClass(event){
    event.preventDefault();
    event.target.classList.add("dragOver");
}

function removeClass(event){
    event.preventDefault();

    let el = this;
    console.log(event);
    el.classList.remove("dragOver")
    // event.stopImmediatePropagation();
    // event.bubbles=false;
}

// ============================================================================
//            Collections
// ============================================================================

function initializeCollections(){
    // load collections on load

    let i = window.localStorage.length;
    
    for(let j=0; j<=i-1; j++){
        
        let key = localStorage.key(j);
        
        if(key != "activeCollection"){

            let dataObj = JSON.parse(window.localStorage.getItem(key));
            let title = dataObj.title;
            let desc = dataObj.desc;

            createCollectionElement(key, title, desc);
        }
    }
}

function createNewCollection(){
    // create ID for new collection
    // based on date/time created

    let id;

    id = "ID-";
    id += String.fromCharCode(Math.random()*26 + 65);
    id += String.fromCharCode(Math.random()*26 + 65);
    id += String.fromCharCode(Math.random()*26 + 65);
    id += String.fromCharCode(Math.random()*26 + 65);
    id +="-" + Date.now();

    let title = "New Collection";
    let desc = "Click to enter description";

   let newCollection = createCollectionElement(id, title, desc);
    newCollection.click();
}

function createCollectionElement(id, title, desc){
    // creates new collection icon
    // new or on load

    let parent = document.getElementById("collections");
    let template = document.getElementById("collectionTemplate").content.firstElementChild;

    let newCollection = template.cloneNode(true);
    parent.append(newCollection);

    newCollection.setAttribute("id", id);
    newCollection.title = desc;

    let labelElement = newCollection.getElementsByTagName("span")[0];
    labelElement.textContent = title;
    
    newCollection.addEventListener("click", setActiveCollection);

    return newCollection;
}

function setActiveCollection(event){
    
    // un-set current active collection
    let activeProjects = document.getElementsByClassName("activeProject")

    if(activeProjects){
        for(const active of activeProjects){
            active.classList.remove("activeProject");
            console.log("unset " + active.id);
        }
    }

    saveToLocalStorage();

    //clear current data
    let section = document.getElementById("cwiDataSection");
    let currentItems = section.querySelectorAll(".cwiDataItemContainer");

    document.getElementById("collectionTitle").textContent = "New Collection";
    document.getElementById("collectionDesc").textContent = "Click to add description";

    for(const item of currentItems){
       //console.log("removing " + item.tagName);
        section.removeChild(item);
    }

    // set active collection
    
    // let target = this;
    // let name = target.getElementsByTagName("span")[0].textContent;

    activeCollectionId = this.id;
    // activeCollectionName = name;

    let id = this.id;
    loadFromLocalStorage(id);

    this.classList.add("activeProject");

    console.log("set active: " + activeCollectionId);
}

function saveToLocalStorage(){

    if(!activeCollectionId) return;

    console.log("saving " + activeCollectionId);

    let collectionData = new Object;

    // get title and desc
    let title = document.getElementById("collectionTitle").textContent;
    let desc = document.getElementById("collectionDesc").textContent;

    // get CWI data items
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
    
    if(activeCollectionId && collectionData){

        let dataObj = new Object;

        dataObj.title = title;
        dataObj.desc = desc;
        dataObj.cwiData = collectionData;

        window.localStorage.setItem(activeCollectionId, JSON.stringify(dataObj));

    }
}

function loadFromLocalStorage(id){

    //console.log("loading saved data");

    let collectionData = window.localStorage.getItem(id);

    if(!collectionData) return;

    let dataObj = JSON.parse(collectionData);

    let title = dataObj.title;
    let desc = dataObj.desc;
    let dataItems = dataObj.cwiData;

    // set title and desc in data section
    document.getElementById("collectionTitle").textContent = title;
    document.getElementById("collectionDesc").textContent = desc;
    
    // set CWI data items
    for(let key in dataItems){
        let objData = dataItems[key];
        createNewDataItem(objData);
    }
}

function exportCollectionToHTML(){

    if(!activeCollectionId) return;

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

        //console.log(newElement);

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

function deleteCollection(){

    if(!activeCollectionId) return;

    let msg = "Are you sure you want to delete this collection?     " + activeCollectionId
    msg += " \n\nThis cannot be undone!  Consider exporting the collection before removing."
    msg += "\n\n Click Ok to continue deleting or Cancel to abort."
    
    if (window.confirm(msg)) {
        
        console.log("DELTEING " + activeCollectionId);
        window.localStorage.removeItem(activeCollectionId);
        document.getElementById(activeCollectionId).remove();
        
        activeCollectionId="";

        //document.getElementById("collections").lastElementChild.click();
    }
}


// ============================================================================
//            CWI Data Item (dropped)
// ============================================================================

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
    
    //event.target.classList.remove("dragOver");
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
    
    //console.log("enter");
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

    //console.log("remove", event);

    activeRow.remove();
    activeRow = null;

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
    
}
