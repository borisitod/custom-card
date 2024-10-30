// js/ckeditor5_plugins/custom_card_card/src/insertcardcommand.js
import { Command } from 'ckeditor5/src/core';

export default class InsertCardCommand extends Command {
  execute(attributes = {}) {
    const editor = this.editor;
    const selection = editor.model.document.selection;

    editor.model.change(writer => {
      // Create the card
      const card = writer.createElement('customCard', {
        title: attributes.title || '',
        mediaId: attributes.mediaId || '',
        link: attributes.link || ''
      });

      // Insert card and place selection after it
      editor.model.insertContent(card);

      // Place selection after the inserted card
      writer.setSelection(
        writer.createPositionAfter(card)
      );
    });
  }

  refresh() {
    const model = this.editor.model;
    const selection = model.document.selection;
    const allowedIn = model.schema.findAllowedParent(
      selection.getFirstPosition(),
      'customCard'
    );

    this.isEnabled = allowedIn !== null;
  }
}
