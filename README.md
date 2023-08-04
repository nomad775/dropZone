# dropZone
This is a MS Edge sidebar app for storing dragged and dropped items from Halliburton CWI ERP system.

This is a very simple HTML page with a div as a drop target for hyperlinks from a web based ERP system. It is basically a task specific favorites/bookmarks system for working with hyperlinks for parts, bills of material, drawings and documents.  All data is saved in local storage, so it is completely client side - nothing is sent to the server.

This was built specifically for Halliburton's CWI system, however it may be adpatpable to other web based systems such as SAP.  The only thing specific about this system is the description and other data is included in (then parsed out of) an "objinfo" attribute. Other systems may use title or some other attribute to convey such info.

The intent is to use it in the MS Edge sidebar.  It may also be used as a web page or installed as a CWA app. As of intial upload, 2023.8.04, Edge version 115, there are some issues. When run in the side bar CSS peudo elements such as :hover do not function and the cursor does not update correctly for hyperlinks or move. 

The sidebar/CWA portion is based on info from:
https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/sidebar
