/* ----------------------------- Main Function Control ---------------------------- */ 

function updateDashboards() {
  // Import the data from the Warenausgangsliste of today
  importData();

  // Look at all the routes from that day. This is the result of the importData function. 
  var routes = getRoutes();

  // Look at all the slides in the folder. There is one per Tor/Loading Dock in the DC. This pulls the relevant information from it and stores it in a dictionary that is returned. 
  var slideData = getSlideData();

  // Cycle through each slide deck and update it with the correct information if there is a corresponding route in the overview
  applyRoutesToSlides(slideData, routes);

  // Update the last updated field 
  sheetControl.getRange("C8").setValue(new Date())
};



/* ----------------------------- User Input ---------------------------- */ 

  // To enable detailed logging (set 1 for high level, 2 for more detail, 3 for all detail)
  const loggingDetailLevel = 1;


/* -------------------------- Global Variables -------------------------- */ 

const torSlideFolderId = "1fdS16gG5tfsArKuCcVp_ufGv00N0_WAA";
const torSlideFolder = DriveApp.getFolderById(torSlideFolderId);

const warenlisteFolderId = '10KU4JwhfRzZkCvVM1gqwB4JZLSQqnMQG';
const warenlisteFolder = DriveApp.getFolderById(warenlisteFolderId);

const qrFolderId = '1RAyjm8wgeWMsVMFAnmWYVc0OUW64_D_a';
const qrFolder = DriveApp.getFolderById(qrFolderId);

const sheetId = '1hTelqBxbN9D4iw1eywoAzcrYJePNIv9jUABbIaGC4HU';
const ss = SpreadsheetApp.openById(sheetId);
const sheetImport = ss.getSheetByName("Import");
const sheetControl = ss.getSheetByName("Control");

let time = new Date();
const todayDate = new Date().toISOString().split('T')[0];

const scriptProperties = PropertiesService.getScriptProperties();


/* -------------------------- Supporting Functions -------------------------- */ 

function sheetLogger(topic, message) {
  var logSheet = ss.getSheetByName("_Log");

  if (!logSheet) {
    logSheet = spreadsheet.insertSheet('_Log');
    logSheet.appendRow(['Timestamp', 'Topic', 'Issue']); // Add headers
  };

  if (logSheet.getLastRow() > 200) { 
    logSheet.deleteRows(2, 160)
  }

  // Get the current date and time
  var timestamp = new Date();
  
  // Append the log entry
  logSheet.appendRow([timestamp, topic, message]);

  Logger.log("Logged: " + message + " at " + timestamp);
};

function consoleLogger(level, fnc, msg, output) {
  if (loggingDetailLevel >= level) {
    var now = new Date();
    var timeDiff = (now - time)/1000

    var logEntry = {
      "Function" : fnc,
      "Message" : msg,
      "Seconds taken" : timeDiff,
      "Output" : output
    }

    Logger.log(JSON.stringify(logEntry, null, 2));

    time = now; 
  };
};

function sendEmail_(functionName, recipient, subject, body, options = {}) {
  


  const property = functionName + "_lastEmail"

  scriptProperties.setProperty(property, "AAA");

  
  const dateLastEmail = scriptProperties.getProperty(property);

  if (dateLastEmail === todayDate) {
    Logger.log("Error email already sent today. Skipping.");
    return;
  }

  // Set default options if not provided
  const {
    cc = "",
    bcc = "",
    htmlBody = "",
    attachments = [],
    inlineImages = {},
    name = "Fernseher Outbound - Script",
    replyTo = "",
    noReply = false
  } = options;

  // Send the email
  GmailApp.sendEmail(recipient, subject, body, {
    cc: cc,
    bcc: bcc,
    htmlBody: htmlBody,
    attachments: attachments,
    inlineImages: inlineImages,
    name: name,
    replyTo: replyTo,
    noReply: noReply
  });

  // Optional log for debugging
  Logger.log(`Email sent to ${recipient} with subject: "${subject}"`);
  Logger.log(scriptProperties.getProperties())

  scriptProperties.setProperty(property, todayDate);
}



