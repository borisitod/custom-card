// js/ckeditor5_plugins/custom_card_card/src/cardui.js
import { Plugin } from 'ckeditor5/src/core';
import { ButtonView } from 'ckeditor5/src/ui';
import icon from '../theme/icons/card.svg';

export default class CardUI extends Plugin {
  init() {
    const editor = this.editor;

    editor.ui.componentFactory.add('custom_card_card', locale => {
      const button = new ButtonView(locale);

      button.set({
        label: Drupal.t('Add Card'),
        icon,
        tooltip: true
      });

      button.on('execute', () => {
        this._showCardDialog();
      });

      return button;
    });
  }

  _showCardDialog() {
    const editor = this.editor;

    // Create the dialog HTML
    const $dialog = jQuery(`
            <div class="card-dialog-form">
                <div class="js-form-item form-item">
                    <label class="form-item__label">${Drupal.t('Title')}</label>
                    <input type="text" class="form-element form-text" id="card-title" />
                </div>
                <div class="js-form-item form-item">
                    <label class="form-item__label">${Drupal.t('Link')}</label>
                    <input type="text"
                           id="card-link"
                           class="form-element linkit-widget"
                           autocomplete="off"
                           aria-autocomplete="list" />
                    <div class="linkit-result-wrapper" style="display: none;"></div>
                </div>
                <div class="js-form-item form-item">
                    <label class="form-item__label">${Drupal.t('Media')}</label>
                    <input type="hidden" id="card-media" />
                    <div class="media-library-selection"></div>
                    <input type="button" class="button js-media-library-open-button" value="${Drupal.t('Add media')}" />
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

      // Abort previous request if it exists
      if (currentRequest) {
        currentRequest.abort();
      }

      // Make new request
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

    // Close results when clicking outside
    jQuery(document).on('click', function(e) {
      if (!jQuery(e.target).closest('.linkit-result-wrapper').length &&
        !jQuery(e.target).is($linkInput)) {
        $resultWrapper.hide();
      }
    });

    // Media library initialization
    const mediaButton = $dialog.find('.js-media-library-open-button');
    const mediaSelection = $dialog.find('.media-library-selection');
    const mediaInput = $dialog.find('#card-media');

    mediaButton.on('click', () => {
      Drupal.ajax({
        url: '/media-library/select',
        dialogType: 'modal',
        dialog: {
          width: '85%',
          title: Drupal.t('Add or select media'),
        },
      }).execute();

      jQuery(window).on('dialog:messageInsert', function (e, message) {
        if (message.hasOwnProperty('mediaId')) {
          mediaInput.val(message.mediaId);
          mediaSelection.html(`<div>Media ID: ${message.mediaId}</div>`);
        }
      });
    });

    // Create and open the dialog
    const dialog = Drupal.dialog($dialog, {
      title: Drupal.t('Add Card'),
      buttons: [
        {
          text: Drupal.t('Insert'),
          class: 'button--primary',
          click: function () {
            const command = editor.commands.get('insertCard');
            if (command.isEnabled) {
              command.execute({
                title: $dialog.find('#card-title').val(),
                mediaId: $dialog.find('#card-media').val(),
                link: $dialog.find('#card-link').val()
              });
            }
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
