import { Plugin } from 'ckeditor5/src/core';
import CardEditing from './cardediting';
import CardUI from './cardui';

export default class CustomCardCard extends Plugin {
  static get requires() {
    return [CardEditing, CardUI];
  }

  static get pluginName() {
    return 'CustomCardCard';
  }
}
