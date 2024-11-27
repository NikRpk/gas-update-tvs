function test() {

};


function importData() {
  var fileName = createFileName_();
  var sourceFile = getFileByNameInNestedFolders_(fileName);
  
  if (!sourceFile) {
    sheetLogger("Importing files", `Did not find an active sheet for "${fileName}" in the Warenausgangslisten folder.`);
    sendEmail_( "findWarenausgansliste",
                "niklas.roepke@hellofresh.de",
                "Missing Warenausgangsliste",
                "There was an error with finding the right 'Warenausgansliste'", // Default text
                { name : "Fernseher Outbound - Script",
                  noReply : true, 
                  htmlBody : `<p>Hi,<br>
                              <br>
                              There was an issue with finding the right 'Warenausgansliste' today. The script was looking for <b>"${fileName}"</b> but did not find it.<br>
                              <ol>
                                <li>Please check if the file name was generated correctly. Look at the calendar week, day of the week, and day. If there was an error, contact "Niklas Röpke"</li>
                                <li>Please check if the file was created by logistics properly (in the <a href="https://drive.google.com/drive/u/0/folders/10KU4JwhfRzZkCvVM1gqwB4JZLSQqnMQG" target="_blank">right folder</a> with the right name). If there was an error, please contact DACH Logistics</li>
                              </ol><br>
                              Have a lovely day!<br>`
                })
    return;
  };

  var sourceSpreadsheet = SpreadsheetApp.open(sourceFile);
  var sourceSheet = sourceSpreadsheet.getSheetByName("WA-Automatisch");
  var sourceData = sourceSheet.getDataRange().getDisplayValues(); // Get displayed values (as text)

  sheetControl.getRange("C4").setValue(sourceSpreadsheet.getUrl());
  sheetControl.getRange("C5").setValue(sourceSpreadsheet.getName());
  sheetControl.getRange("C6").setValue(qrFolder.getUrl());

  // Clear the import sheet (optional)
  sheetImport.clear();

  // Set regex to recognise time in the AM/PM format
  var timeRegex = /^(1[0-2]|[1-9]):[0-5][0-9]:[0-5][0-9] [AP]M$/;

  // Adapt the cells that have time from strings to the correct format
  var formattedData = sourceData.map(row => 
    row.map(cell => {
      // If the cell contains a time in "h:mm:ss AM/PM" format, convert it to "HH:mm:ss" format
      if (timeRegex.test(cell)) {
        // Parse the time
        var dateTimeString = "1970-01-01 " + cell; // Using a fixed date
        var date = new Date(dateTimeString);
        var time = Utilities.formatDate(date, Session.getScriptTimeZone(), "HH:mm:ss")
        
        // Format to HH:mm:ss
        var hours = date.getHours().toString().padStart(2, '0'); // Get hours and pad with leading zero
        var minutes = date.getMinutes().toString().padStart(2, '0'); // Get minutes
        
        // Return the formatted time in 24-hour format
        return `${hours}:${minutes}`;
      } 
      return cell; // Keep other cells unchanged
    })
  );

  // Set the formatted values to the target sheet
  sheetImport.getRange(1, 1, formattedData.length, formattedData[0].length).setValues(formattedData);
  consoleLogger(2, "importData", "done", formattedData);
};


// Create the file name to be able to search in the Warenausgangslistenfolder 
function createFileName_() {
  var today = new Date();
  Logger.log(today)
  var weekNumber = getCalendarWeek_(today);
  var weekday = getShortWeekday_(today); // Kürzel des Wochentags (MO, DI, etc.)
  var formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), 'dd.MM.yyyy'); // Aktuelles Datum im Format TT.MM.YYYY

  // Erstelle den Dateinamen (KW{Woche}_WA_VE_{Wochentag}_{Datum})
  var fileName = `KW${weekNumber}_WA_VE_${weekday}_${formattedDate}`;

  consoleLogger(2, createFileName_, "Success", fileName);
  return fileName; 
};


function getCalendarWeek_(date) {
  // Get ISO Week Number (Week starting on Monday)
  var isoWeek = getISOWeekNumber(date);
  
  // Adjust for Saturday-starting week:
  var dayOfWeek = date.getDay(); // Sunday = 0, Saturday = 6
  
  // If the day is Sunday (0), it should belong to the previous Saturday-starting week
  if (dayOfWeek === 0 || dayOfWeek === 6) {  
    isoWeek += 1; // Shift Sunday to the previous week
  } 

  return isoWeek;
}

// Standard ISO Week calculation
function getISOWeekNumber(date) {
  var tempDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  var dayOfWeek = tempDate.getDay();
  
  // Adjust to the nearest Thursday for ISO week calculation
  var diff = (dayOfWeek + 6) % 7; // Move back to Thursday if needed
  tempDate.setDate(tempDate.getDate() - diff); // Adjust to the nearest Thursday

  // Get the start of the ISO week (nearest Thursday)
  var startOfYear = new Date(tempDate.getFullYear(), 0, 1);
  var weekNumber = Math.ceil(((tempDate - startOfYear) / (24 * 60 * 60 * 1000) + 1) / 7);

  Logger.log("ISO Week is: " + weekNumber)
  return weekNumber;
}

// Get the German abbreviation for weekdays (MO, DI, MI, etc.)
function getShortWeekday_(date) {
  var weekdays = ['SA+SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA+SO'];
  return weekdays[date.getDay()];
};


// Search the folders for the file name
function getFileByNameInNestedFolders_(fileName) {
  var folder = warenlisteFolder;
  let targetFile = null;

  // Search through the files in the main folder
  targetFile = searchFilesInFolder_(folder, fileName);
  if (targetFile) {
    return targetFile;
  };

  // Search through the sub-folders 
  var subFolders = folder.getFolders();

  // Sort them by creation date to speed up the search and avoid the script looking through old folders with way too many files
  var sortedSubFolders = []
  while (subFolders.hasNext()) {
    var subFolder = subFolders.next();
    sortedSubFolders.push(subFolder);
  };

  sortedSubFolders.sort(function(a, b) {
    return b.getDateCreated() - a.getDateCreated();
  });

  // Search each folder for files matching the search term
  for (var i = 0; i < sortedSubFolders.length; i++) {
    var folder = sortedSubFolders[i];
    
    targetFile = searchFilesInFolder_(folder, fileName);

    // If a target file is found, return it
    if (targetFile) {
      consoleLogger(2, getFileByNameInNestedFolders_, "Found file", targetFile);
      return targetFile;
    }
  };
  
  consoleLogger(1, getFileByNameInNestedFolders_, "Did not find a file");
  return null;
};

// Search within a folder
function searchFilesInFolder_(folder, fileName) {
  var files = folder.getFiles();
  
  while (files.hasNext()) {
    var file = files.next();
    // Check if the file name includes the search term
    if (file.getName() === fileName) {
      return file;
    };
  };
};