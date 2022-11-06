'use strict';

const posts = document.querySelector('.posts');

//  Indexed DB

let db;
let dbReq = indexedDB.open('DB', 1);
dbReq.onupgradeneeded = (event) => {
  db = event.target.result;
  // Создадим хранилище объектов notes или получим его, если оно уже существует.
  let notes;
  if (!db.objectStoreNames.contains('posts')) {
    notes = db.createObjectStore('posts', { autoIncrement: true });
  } else {
    notes = dbReq.transaction.objectStore('posts');
  }
  // Если в notes еще нет индекса timestamp создадим его
  if (!notes.indexNames.contains('timestamp')) {
    notes.createIndex('timestamp', 'timestamp');
  }
};

dbReq.onerror = (event) => {
  alert('error opening database ' + event.target.errorCode);
};

const addStickyNote = (db, title, message) => {
  // Запустим транзакцию базы данных и получите хранилище объектов Notes
  let tx = db.transaction(['posts'], 'readwrite');
  let store = tx.objectStore('posts');

  // Добаляем заметку в хранилище объектов
  let note = { title: title, text: message, timestamp: Date.now() };
  store.add(note);

  // Ожидаем завершения транзакции базы данных
  // tx.oncomplete = () => {
  //   console.log('stored note!');
  // };
  tx.oncomplete = () => {
    getAndDisplayNotes(db);
  };
  tx.onerror = (event) => {
    alert('error storing note ' + event.target.errorCode);
  };
};

// Запись
dbReq.onsuccess = (event) => {
  db = event.target.result;
  getAndDisplayNotes(db);
};

const submitForm = document.querySelector('.send-post');
submitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = submitForm.querySelector('.input');
  const textarea = submitForm.querySelector('.textarea');
  let title = input.value;
  let message = textarea.value;
  if (input.value.length == 0 || textarea.value == 0) {
    alert('none');
  } else {
    addStickyNote(db, title, message);
  }
  textarea.value = '';
  input.value = '';
});

// Извлечение
const getAndDisplayNotes = (db) => {
  let tx = db.transaction(['posts'], 'readonly');
  let store = tx.objectStore('posts');

  // Получим индекс заметок, чтобы запустить наш запрос курсора;
  // результаты будут упорядочены по метке времени
  let index = store.index('timestamp');
  // Создайте запрос open_Cursor по индексу, а не по основному
  // хранилище объектов.
  let req = index.openCursor(null, reverseOrder ? 'prev' : 'next');

  // Создать запрос курсора
  // let req = store.openCursor();
  let allNotes = [];

  req.onsuccess = (event) => {
    // Результатом req.onsuccess в запросах openCursor является
    // IDBCursor
    let cursor = event.target.result;

    if (cursor != null) {
      // Если курсор не нулевой, мы получили элемент.
      allNotes.push(cursor.value);
      cursor.continue();
    } else {
      // Если у нас нулевой курсор, это означает, что мы получили
      // все данные, поэтому отображаем заметки, которые мы получили.
      displayNotes(allNotes);
    }
  };

  req.onerror = (event) => {
    alert('error in cursor request ' + event.target.errorCode);
  };
};

// Отображение
const options = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timezone: 'UTC',
  hour: 'numeric',
  minute: 'numeric',
};
const articleHeader = document.createElement('div');
console.log(articleHeader);
const displayNotes = (notes) => {
  let listHTML = '';
  for (let i = 0; i < notes.length; i++) {
    let note = notes[i];
    listHTML +=
      '<article class="article">' +
      '<div>' +
      new Date(note.timestamp).toLocaleString('ru', options).toString() +
      '</div>';
    listHTML +=
      '<h2>' +
      note.title +
      '</h2>' +
      '<p>' +
      note.text +
      '</p>' +
      '<button class="article__delete-post" onclick="deleteNote(event)" data-id="' +
      note.timestamp +
      '">Удалить пост</button>' +
      '</article>';
  }
  posts.innerHTML = listHTML;
  // Отображение
};

let reverseOrder = true;

const radioBtn = document.querySelectorAll('.radio');

let flipNoteOrder = (notes) => {
  reverseOrder = !reverseOrder;
  getAndDisplayNotes(db);
};

radioBtn.forEach((item) => {
  item.addEventListener('change', flipNoteOrder);
});

// Delete notes
const deleteNote = (event) => {
  // получаем признак выбранной записи
  const valueTimestamp = parseInt(event.target.getAttribute('data-id'));

  // открываем транзакцию чтения/записи БД, готовую к удалению данных
  const tx = db.transaction(['posts'], 'readwrite');
  // описываем обработчики на завершение транзакции
  tx.oncomplete = (event) => {
    console.log('Transaction completed.');
    getAndDisplayNotes(db);
  };
  tx.onerror = function (event) {
    alert('error in cursor request ' + event.target.errorCode);
  };

  // создаем хранилище объектов по транзакции
  const store = tx.objectStore('posts');
  const index = store.index('timestamp');

  // получаем ключ записи
  const req = index.getKey(valueTimestamp);
  req.onsuccess = (event) => {
    const key = req.result;
    // выполняем запрос на удаление указанной записи из хранилища объектов
    let deleteRequest = store.delete(key);
    deleteRequest.onsuccess = (event) => {
      // обрабатываем успех нашего запроса на удаление
      console.log('Delete request successful');
    };
  };
};
