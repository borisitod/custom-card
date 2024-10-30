// js/ckeditor5_plugins/custom_card_card/src/editcardcommand.js
import { Command } from 'ckeditor5/src/core';

export default class EditCardCommand extends Command {
  execute(attrs = {}) {
    if (!attrs.modelElement) {
      return;
    }

    this.editor.model.change(writer => {
      // Set all attributes at once
      writer.setAttributes({
        title: attrs.title || '',
        link: attrs.link || '',
        mediaId: attrs.mediaId || ''
      }, attrs.modelElement);

      // Set selection to force refresh
      writer.setSelection(
        writer.createRangeOn(attrs.modelElement)
      );
    });
  }

  refresh() {
    const model = this.editor.model;
    const selection = model.document.selection;
    const element = selection.getSelectedElement();

    this.isEnabled = element && element.name === 'customCard';
  }
}
