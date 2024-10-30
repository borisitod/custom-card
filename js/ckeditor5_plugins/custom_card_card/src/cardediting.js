// js/ckeditor5_plugins/custom_card_card/src/cardediting.js
import { Plugin } from 'ckeditor5/src/core';
import { Widget, toWidget } from 'ckeditor5/src/widget';
import InsertCardCommand from './insertcardcommand';
import EditCardCommand from './editcardcommand';

export default class CardEditing extends Plugin {
  static get pluginName() {
    return 'CardEditing';
  }

  static get requires() {
    return [Widget];
  }

  init() {
    this._defineSchema();
    this._defineConverters();
    this._defineCommands();
    this._defineClickHandler();
  }

  _defineSchema() {
    const schema = this.editor.model.schema;

    schema.register('customCard', {
      isObject: true,
      allowWhere: '$text',
      allowContentOf: '$block',
      allowAttributes: ['title', 'mediaId', 'link']
    });
  }

  _defineConverters() {
    const conversion = this.editor.conversion;

    // Upcast converter
    conversion.for('upcast').elementToElement({
      model: (viewElement, { writer }) => {
        return writer.createElement('customCard', {
          title: viewElement.getAttribute('data-title') || '',
          mediaId: viewElement.getAttribute('data-media-id') || '',
          link: viewElement.getAttribute('data-link') || ''
        });
      },
      view: {
        name: 'div',
        classes: 'custom-card'
      }
    });

    // Editing downcast converter
    conversion.for('editingDowncast').elementToElement({
      model: 'customCard',
      view: (modelElement, { writer }) => {
        // Get attributes
        const title = modelElement.getAttribute('title') || '';
        const link = modelElement.getAttribute('link') || '';
        const mediaId = modelElement.getAttribute('mediaId') || '';

        // Create main container
        const container = writer.createContainerElement('div', {
          class: 'custom-card',
          // Add data attributes for debugging
          'data-title': title,
          'data-link': link,
          'data-media-id': mediaId
        });

        // Create content container
        const content = writer.createContainerElement('div', {
          class: 'custom-card-content'
        });

        // Create and append title
        const titleDiv = writer.createContainerElement('div', {
          class: 'custom-card-title'
        });
        writer.insert(
          writer.createPositionAt(titleDiv, 0),
          writer.createText(title)
        );

        // Create and append link
        const linkDiv = writer.createContainerElement('div', {
          class: 'custom-card-link'
        });
        writer.insert(
          writer.createPositionAt(linkDiv, 0),
          writer.createText(link)
        );

        // Build structure
        writer.insert(writer.createPositionAt(content, 0), titleDiv);
        writer.insert(writer.createPositionAt(content, 'end'), linkDiv);
        writer.insert(writer.createPositionAt(container, 0), content);

        return toWidget(container, writer, {
          label: 'custom card widget',
          hasSelectionHandle: true
        });
      }
    });

    // Data downcast converter
    conversion.for('dataDowncast').elementToElement({
      model: 'customCard',
      view: (modelElement, { writer }) => {
        return writer.createEmptyElement('div', {
          class: 'custom-card',
          'data-title': modelElement.getAttribute('title') || '',
          'data-link': modelElement.getAttribute('link') || '',
          'data-media-id': modelElement.getAttribute('mediaId') || ''
        });
      }
    });
  }

  _defineCommands() {
    this.editor.commands.add('insertCard', new InsertCardCommand(this.editor));
    this.editor.commands.add('editCard', new EditCardCommand(this.editor));
  }

  _defineClickHandler() {
    this.editor.editing.view.document.on('click', (evt, data) => {
      const viewElement = data.target;

      if (viewElement.hasClass('custom-card') || viewElement.findAncestor(element => element.hasClass('custom-card'))) {
        const modelElement = this.editor.editing.mapper.toModelElement(
          viewElement.findAncestor(element => element.hasClass('custom-card')) || viewElement
        );

        if (modelElement) {
          evt.stop();
          data.preventDefault();

          this._showEditDialog(modelElement);
        }
      }
    });
  }

  _showEditDialog(modelElement) {
    const editor = this.editor;
    const title = modelElement.getAttribute('title') || '';
    const link = modelElement.getAttribute('link') || '';
    const mediaId = modelElement.getAttribute('mediaId') || '';

    const $dialog = jQuery(`
    <div class="card-dialog-form">
        <div class="js-form-item form-item">
            <label class="form-item__label">${Drupal.t('Title')}</label>
            <input type="text" class="form-element form-text" id="card-title" value="${title}" />
        </div>
        <div class="js-form-item form-item">
            <label class="form-item__label">${Drupal.t('Link')}</label>
            <input type="text"
                   id="card-link"
                   class="form-element linkit-widget"
                   value="${link}"
                   autocomplete="off"
                   aria-autocomplete="list" />
            <div class="linkit-result-wrapper" style="display: none;"></div>
        </div>
        <div class="js-form-item form-item">
            <label class="form-item__label">${Drupal.t('Media')}</label>
            <div class="js-media-library-widget media-library-widget">
                <div class="js-media-library-selection media-library-selection">
                    ${mediaId ? `<div class="media-library-item__name">Media ID: ${mediaId}</div>` : ''}
                </div>
                <input type="hidden"
                       id="card-media"
                       name="media"
                       class="js-media-library-widget-value"
                       value="${mediaId || ''}"
                />
                <button type="button"
                        class="js-media-library-open-button button"
                        data-media-library-widget="true"
                        data-media-library-allowed-types="image"
                >${Drupal.t('Add media')}</button>
            </div>
        </div>
    </div>
`);

    // Initialize link autocomplete
    const $linkInput = $dialog.find('#card-link');
    const $resultWrapper = $dialog.find('.linkit-result-wrapper');
    let currentRequest = null;

    $linkInput.on('input', function() {
      const searchTerm = jQuery(this).val();

      if (searchTerm.length < 3) {
        $resultWrapper.hide();
        return;
      }

      if (currentRequest) {
        currentRequest.abort();
      }

      currentRequest = jQuery.ajax({
        url: '/linkit/autocomplete/default',
        data: { q: searchTerm },
        success: function(response) {
          if (response.suggestions && response.suggestions.length > 0) {
            let html = '<ul class="linkit-ui-autocomplete">';
            response.suggestions.forEach(function(item) {
              html += `
                                <li class="linkit-result-item" data-path="${item.path}">
                                    <div class="linkit-result-line">
                                        <div class="linkit-result-title">${item.label}</div>
                                        <div class="linkit-result-description">${item.description || ''}</div>
                                        ${item.group ? `<div class="linkit-result-group">${item.group}</div>` : ''}
                                    </div>
                                </li>
                            `;
            });
            html += '</ul>';

            $resultWrapper.html(html).show();
          } else {
            $resultWrapper.hide();
          }
        }
      });
    });

    // Handle click on suggestion
    $dialog.on('click', '.linkit-result-item', function() {
      const path = jQuery(this).data('path');
      $linkInput.val(path);
      $resultWrapper.hide();
    });

    // Handle keyboard navigation
    $linkInput.on('keydown', function(e) {
      const $results = $resultWrapper.find('.linkit-result-item');
      const $highlighted = $results.filter('.highlighted');

      switch (e.keyCode) {
        case 40: // Down arrow
          e.preventDefault();
          if ($highlighted.length === 0) {
            $results.first().addClass('highlighted');
          } else {
            $highlighted.removeClass('highlighted')
              .next().addClass('highlighted');
          }
          break;

        case 38: // Up arrow
          e.preventDefault();
          if ($highlighted.length === 0) {
            $results.last().addClass('highlighted');
          } else {
            $highlighted.removeClass('highlighted')
              .prev().addClass('highlighted');
          }
          break;

        case 13: // Enter
          e.preventDefault();
          if ($highlighted.length) {
            $highlighted.trigger('click');
          }
          break;

        case 27: // Escape
          e.preventDefault();
          $resultWrapper.hide();
          break;
      }
    });

    // Click outside handler
    jQuery(document).on('click', function(e) {
      if (!jQuery(e.target).closest('.linkit-result-wrapper').length &&
        !jQuery(e.target).is($linkInput)) {
        $resultWrapper.hide();
      }
    });

    // In the _showEditDialog method, update the media library initialization:

    const mediaButton = $dialog.find('.js-media-library-open-button');
    $(once('media-library-opener', mediaButton)).on('click', function(e) {
      e.preventDefault();

      // Build the correct URL with all parameters
      const baseUrl = `/media-library`;
      const params = new URLSearchParams({
        media_library_opener_id: 'media_library.opener.editor',
        'media_library_allowed_types[0]': 'image',
        media_library_selected_type: 'image',
        media_library_remaining: '1',
        'media_library_opener_parameters[filter_format_id]': 'rtf',
        _wrapper_format: 'drupal_modal'
      });

      // Create the settings for Drupal.ajax
      const element = $(this)[0];
      const settings = {
        url: `${baseUrl}?${params.toString()}`,
        element: element,
        progress: { type: 'throbber' },
        dialogType: 'modal',
        dialog: {
          width: '85%',
          title: Drupal.t('Add or select media'),
          dialogClass: 'media-library-widget-modal'
        },
        submit: {
          _drupal_ajax: '1'
        }
      };

      // Create and execute the ajax command
      const ajaxInstance = Drupal.ajax(settings);
      ajaxInstance.execute();

      // Handle media selection
      $(window).once('media-library-selection').on('dialog:messageInsert', function(e, message) {
        if (message && message.mediaEntities && message.mediaEntities.length) {
          const selectedMedia = message.mediaEntities[0];
          $dialog.find('#card-media').val(selectedMedia.id);
          $dialog.find('.js-media-library-selection').html(`
                <div class="media-library-item__name">${selectedMedia.name}</div>
            `);
        }
      });
    });

    const dialog = Drupal.dialog($dialog, {
      title: Drupal.t('Edit Card'),
      buttons: [
        {
          text: Drupal.t('Save'),
          class: 'button--primary',
          click: function () {
            // Get new values
            const newTitle = $dialog.find('#card-title').val();
            const newLink = $dialog.find('#card-link').val();
            const newMediaId = $dialog.find('#card-media').val();

            // Update model in a single change block
            editor.model.change(writer => {
              // Create a new card element with new attributes
              const newCard = writer.createElement('customCard', {
                title: newTitle,
                link: newLink,
                mediaId: newMediaId
              });

              // Replace old card with new one
              editor.model.insertContent(newCard, editor.model.createRangeOn(modelElement));
              writer.remove(modelElement);
            });

            dialog.close();
          }
        },
        {
          text: Drupal.t('Cancel'),
          click: function () {
            dialog.close();
          }
        }
      ],
      width: '500px',
      beforeClose: false,
      class: ['ui-dialog-buttons', 'card-dialog']
    });

    dialog.showModal();
  }
}
