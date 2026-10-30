/**
 * Nagpur Happenings: create the "Submit an event" Google Form
 * ---------------------------------------------------------------
 * Run this ONCE from the Apps Script editor of your events Sheet:
 *   1. In Apps Script, click + (next to Files) → Script, name it CreateForm.
 *   2. Paste this whole file, Save.
 *   3. Pick createSubmissionForm in the function menu, click Run, allow access.
 *   4. Open "Execution log": it shows the link to share and the edit link.
 *
 * The form's answers go into a new "Form Responses" tab in this Sheet.
 * They never appear on the website by themselves: copy the good ones into
 * the Events tab and set Status to Published.
 *
 * Running it again does not make a second form; it just shows the links.
 */

var FORM_ID_KEY = 'NH_SUBMISSION_FORM_ID';

function createSubmissionForm() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty(FORM_ID_KEY);
  if (existingId) {
    try {
      var existing = FormApp.openById(existingId);
      Logger.log('The form already exists.');
      Logger.log('Link to share (put this on the website): ' + existing.getPublishedUrl());
      Logger.log('Edit the form: ' + existing.getEditUrl());
      return;
    } catch (err) {
      // The form was deleted: make a new one below.
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var form = FormApp.create('Submit an event to Nagpur Happenings');
  form.setDescription(
    'Organising something in Nagpur? Tell us about it. Every submission is reviewed ' +
    'before it appears on the calendar.'
  );
  form.setConfirmationMessage(
    'Thanks! We will review your event and add it to the calendar if it fits. ' +
    'We may contact you if anything needs checking.'
  );
  form.setAllowResponseEdits(false);
  form.setProgressBar(false);

  form.addTextItem().setTitle('Event title').setRequired(true);
  form.addListItem().setTitle('Category').setRequired(true).setChoiceValues([
    'Books & Literature', 'Board Games & Chess', 'Arts & Culture', 'Music & Entertainment',
    'Learning & Workshops', 'Communities & Social', 'Outdoors & Recreation', 'Other'
  ]);
  form.addDateItem().setTitle('Date').setRequired(true);
  form.addTimeItem().setTitle('Start time').setRequired(true);
  form.addTimeItem().setTitle('End time');
  form.addTextItem().setTitle('Venue').setRequired(true);
  form.addTextItem().setTitle('Area / locality in Nagpur').setRequired(true)
    .setHelpText('For example Dharampeth, Civil Lines, Sitabuldi');
  form.addParagraphTextItem().setTitle('Description').setRequired(true)
    .setHelpText('What happens, who it is for, anything to bring.');
  form.addTextItem().setTitle('Organiser name').setRequired(true);
  form.addTextItem().setTitle('Public contact')
    .setHelpText('Instagram, website, email or phone that visitors can use. This is shown on the website.');
  form.addTextItem().setTitle('Registration or ticket link');
  form.addMultipleChoiceItem().setTitle('Free or paid?').setRequired(true).setChoiceValues(['Free', 'Paid']);
  form.addTextItem().setTitle('Ticket price (₹)');
  form.addTextItem().setTitle('Poster or cover image link')
    .setHelpText('Optional: a public link to an image.');
  form.addTextItem().setTitle('Your email or phone').setRequired(true)
    .setHelpText('So we can reach you about this submission. Not shown on the website.');

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  props.setProperty(FORM_ID_KEY, form.getId());

  Logger.log('Form created.');
  Logger.log('Link to share (put this on the website): ' + form.getPublishedUrl());
  Logger.log('Edit the form: ' + form.getEditUrl());
}
