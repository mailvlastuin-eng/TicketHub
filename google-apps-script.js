/**
 * Google Apps Script Web App
 * 
 * Paste this code into your Google Apps Script project at script.google.com
 * to send emails directly via Google's MailApp service.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    MailApp.sendEmail({
      to: data.to,
      subject: data.subject,
      htmlBody: data.html,
      name: "Ticketmaster"
    });
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
