// Настройки сайта. Всё, что есть в Google Таблице (лист settings), перезапишет эти значения.
window.SITE = {
  // Ссылки «Опубликовать в интернете → CSV» для каждого листа Google Таблицы. Пусто = берутся данные из папки sheets/
  sheets: { menu: '', settings: '', gallery: '' },
  whatsapp: '77072727941',
  phone: '+7 707 272 79 41',
  instagram: '',   // https://instagram.com/... — пусто = кнопка скрыта
  telegram: '',    // https://t.me/...
  address_ru: '', address_kz: '',
  hours_ru: '', hours_kz: '',
  map: '',         // ссылка src для iframe карты (2ГИС / Google Maps)
  delivery: 'да',  // да / нет — показывать ли доставку в форме заказа
  story_ru: '', story_kz: ''
};
