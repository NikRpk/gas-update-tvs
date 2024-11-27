function getRoutes() {
  var dataAll = sheetImport.getRange(1, 1, sheetImport.getLastRow(), sheetImport.getLastColumn()).getValues();

  // Split headers and the data
  var headers = dataAll[0];
  var data = dataAll.slice(1); 

  var extractColumnNames = ["Ladereferenz", "Allgemeine Infos", "Abfahrt SOLL", "PLT SOLL", "pallet change", "TOR", "Lane by delivery Time"]

  // Define the location of each header so that the correct information can be pulled from the data
  var columnIndexes = {};
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    if (extractColumnNames.includes(header)) {
      columnIndexes[header] = i;
    };
  };

  var routes = {}
  routes["No Tor"] = [];

  // Loop through all of the data (each line is one route at the DC)
  for (var i = 0; i < data.length; i++ ) {  
    var departureTime = data[i][columnIndexes["Abfahrt SOLL"]]

    // Skip the empty lines or ones that do not have a departure time
    if (departureTime !== "") {
      var timeToDepartureMins = getTimeDifferenceMins_(departureTime)
      var timeToDeparture = getHoursFromMins_(timeToDepartureMins)
      var departureTimeFormatted = formatTime_(departureTime)

      // Skip the ones that have a departure time in the past
      if (timeToDepartureMins > 0) {
        var tor = data[i][columnIndexes["TOR"]]

        // Define the important route parameters
        var routeEntry = {
          "Loading Reference" : data[i][columnIndexes["Ladereferenz"]],
          "Info" : data[i][columnIndexes["Allgemeine Infos"]],
          "Departure Time" : departureTimeFormatted,
          "Time to Departure" : timeToDeparture,
          "Time to Departure (mins)" : timeToDepartureMins,
          "Pallets to load" : data[i][columnIndexes["PLT SOLL"]],
          "Pallets to change" : data[i][columnIndexes["pallet change"]],
          "Tor" : tor,
          "Lane" : data[i][columnIndexes["Lane by delivery Time"]],
          "Next departure" : ""
        };

        // If the Tor is blank, push it to the empty one
        if (tor.length === 0) {
          routes["No Tor"].push(routeEntry);
        }

        // If the Tor does not exist in the route dictionary, add it 
        else if (!routes[tor]) {
          routes[tor] = [];
          routes[tor].push(routeEntry);
        }
        else {
          routes[tor].push(routeEntry)
        }
      };
    };
  };

  // For each Tor in Routes, sort the entries by the smallest time to departure as this is what needs to be displayed on the slide in the future 
  for (var key in routes) { // Loop through each key in the data object
    if (routes.hasOwnProperty(key)) { // Check if the key is a direct property of the object
      routes[key].sort(function(a, b) {
        return a["Time to Departure (mins)"] - b["Time to Departure (mins)"]; // Sort in ascending order
      });
    }
  };

  // Add in the next route as well 
  for (var key in routes) {
    if (routes.hasOwnProperty(key)) {
      // Check if the current key has more than one entry
      if (routes[key].length > 1) {
        // Update the "Next departure" field for the first entry
        routes[key][0]["Next departure"] = (routes[key][1]["Departure Time"] + " | " + routes[key][1]["Lane"]); // Replace with actual departure time or logic
      }
    };
  };

  Logger.log("------  UPCOMING ROUTES  ------")
  Logger.log(JSON.stringify(routes,null,2))

  return routes;
};




function getTimeDifferenceMins_(departureTime) {
  if (!(departureTime instanceof Date)) {
    sheetLogger("Time Check", `Input ${departureTime} is not a Date as expected.`)
    return;
  }

  var hours1 = departureTime.getHours();
  var minutes1 = departureTime.getMinutes();
  var seconds1 = departureTime.getSeconds();

  // Get the current time
  var now = new Date();

  var hours2 = now.getHours();
  var minutes2 = now.getMinutes();
  var seconds2 = now.getSeconds();

  var totalSeconds1 = hours1 * 3600 + minutes1 * 60 + seconds1;
  var totalSeconds2 = hours2 * 3600 + minutes2 * 60 + seconds2;

  // Calculate the difference in minutes
  var diffMins = (totalSeconds1 - totalSeconds2) / (60)

  consoleLogger(3, "getTimeDifferenceMins_", "Info", diffMins)
  return diffMins;
}; 

function getHoursFromMins_(time) {
  // Calculate hours and minutes
  var hours = Math.floor(time / 60); // Get whole hours
  var mins = Math.round(time % 60); // Get remaining minutes

  // Format to "HH:mm"
  var formattedHours = String(hours).padStart(2, '0'); // Add leading zero if needed
  var formattedMinutes = String(mins).padStart(2, '0'); // Add leading zero if needed

  var output = `${formattedHours}:${formattedMinutes}`

  consoleLogger(3, "getHoursFromMins_", "Info", output)
  return output;
};

function formatTime_(departureTime) {
  if (!(departureTime instanceof Date)) {
    sheetLogger("Time Check", `Input ${departureTime} is not a Date as expected.`)
    return;
  }

  var hours = String(departureTime.getHours()).padStart(2, '0');
  var minutes = String(departureTime.getMinutes()).padStart(2, '0');

  var output = `${hours}:${minutes}`

  consoleLogger(3, "getHoursFromMins_", "Info", output)
  return output;
}; 




