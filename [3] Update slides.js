function getSlideData() {
  var files = torSlideFolder.getFilesByType(MimeType.GOOGLE_SLIDES);
  var slideData = {}; // Use an object to store each slide's data keyed by "tor"
  
  consoleLogger(2, "Success", "getSlideData", "Files pulled", files);

  while (files.hasNext()) {
    var file = files.next();
    var presentation = SlidesApp.openById(file.getId()); // Open the presentation
    var slides = presentation.getSlides(); // Get all slides

    var image = slides[0].getImages()[0]; // Get the first image on the first slide
    var tor = (file.getName().match(/\d+/) || [""])[0]; 

    if (!slideData[tor]) {
      slideData[tor] = { // Store the slide data keyed by "tor"
        "id": file.getId(),
        "tor": tor,
        "fileName": file.getName(),
        "image": image,
        "size_MB": file.getSize() / (1024 * 1024)
      };
      consoleLogger(2, "Success", "getSlideData", "Slides added to dict", slideData[tor]);
    } else {
      sheetLogger("Double Tor Slide", `Tor "${tor}" already exists! Please only have one.`);
      consoleLogger(1, "Error", "getSlideData", `Tor "${tor}" already exists! Please only have one.`);
    };
  };

  Logger.log("------  SLIDES  ------")
  Logger.log(JSON.stringify(slideData,null,2))
  return slideData; // Return the object instead of an array
};


function applyRoutesToSlides(slideData, routes) {
  Logger.log("	------  Update Slides  ------");
  // Iterate over each key (tor) in slideData
  for (var slide in slideData) {
    if (slideData.hasOwnProperty(slide)) { // Check if the property belongs to the object
      var tor = slideData[slide].tor; // Access the tor of the specific presenation 

      // Now we look in the routes folder to see if there are any relevant routes assigned for that Tor
      if (routes[tor] && routes[tor].length > 0) {
        updateSlide_(slideData[slide], routes[tor][0]); // Update the slide text with the first route
        consoleLogger(2, "Success", "getSlideData", "Updated slide " + slideData[slide].tor);
      } else {
        // If there are no tours planned, this should be reflected on the screens 
        var dict = {
          "Loading Reference" : "",
          "Info" : "",
          "Departure Time" : "",
          "Time to Departure" : "",
          "Time to Departure (mins)" : "",
          "Pallets to load" : "",
          "Pallets to change" : "",
          "Tor" : tor,
          "Lane" : "Keine Tour Geplant",
          "Next departure" : ""
        };

        updateSlide_(slideData[slide], dict);
        consoleLogger(2, "Success", "getSlideData", "No tours planned for slide " + slideData[slide].tor);
      };
    };
  };
};

function updateSlide_(presentation, dict) {
  var slides = SlidesApp.openById(presentation.id);
  var slide = slides.getSlides()[0];
  var shapes = slide.getShapes();

  // Loop through the dictionary of the route and then update the text boxes that have a corresponding alt-text
  for (var i = 0; i < shapes.length; i ++) {
    var shape = shapes[i]
    // Descriptions are set via the alt text feature in Google Slides
    //Logger.log("The text box with ID of: " + shapes[i].getDescription() + " contains the following text: " +  shapes[i].getText().asString()) // Unhide to get a list of all the "alt text" currently used | Which text box is which

    var altText = shape.getDescription();

    if (altText in dict) {
      shape.getText().setText(dict[altText])
      consoleLogger(3, "Success", "updateSlide_", "Updated slide content for  " + shape.getText(), dict[altText]);
    }
    else if (altText.length != "") {
      consoleLogger(2, "Error", "updateSlide_", `Did not find "${altText}" in the dictionary for slide ${slide}`);
      sheetLogger(`Did not find "${altText}" in the dictionary.`);
    };
  };

  if (dict["Lane"]) {
    addQrCode_(slides, dict["Lane"]);
  };

  consoleLogger(2, "Success", "updateSlide_", `Updated slide ${dict["Tor"]}! The next tour is: ${dict["Lane"]} at ${dict["Departure Time"]}`);
};

function addQrCode_(slides, laneName) {
  var slide = slides.getSlides()[0];
  
  var oldImages = slide.getImages();

  // Loop through the images in reverse order
  for (var i = oldImages.length - 1; i >= 0; i--) {
    oldImages[i].remove(); // Remove the image
  }

  var image = searchFilesInFolder_(qrFolder, laneName)
  if (image) {
    image = image.getBlob();

    var width = 200
    var height = 200

    var slideWidth = slides.getPageWidth();
    var slideHeight = slides.getPageHeight();
    var centeredLeft = (slideWidth - width) / 2;
    var centeredTop = (slideHeight - height) / 2;

    var newImage = slide.insertImage(image);

    newImage.setWidth(width).setHeight(height);
    newImage.setLeft(centeredLeft).setTop(centeredTop);
    newImage.setDescription("QR Code")

    consoleLogger(2, "Success", "addQrCode_", "Added QR code for slide " + slide, image);
  } else if (laneName === "Keine Tour Geplant") {
    // Do nothing if it is that
  } else {
    consoleLogger(2, "Error", "addQrCode_", `No QR code for the "${laneName}" lane could be found in the folder`);
    sheetLogger("Missing QR code", `No QR code for the "${laneName}" lane could be found in the folder`);
  };
};


