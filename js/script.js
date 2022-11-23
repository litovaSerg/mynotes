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
  console.log('Recorded');
};

// Отправка заметки 1 вариант
/*  const submitForm = document.querySelector('.send-post');
submitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = submitForm.querySelector('.input');
  const textarea = submitForm.querySelector('.textarea');
  let title = input.value;
  let message = textarea.value;
  if (input.value.length == 0 || textarea.value == 0) {
    // alert('none');
    const emptyField = document.createElement('div');
    emptyField.classList.add('empty-field');
    submitForm.prepend(emptyField);
    emptyField.textContent = 'Не оставляйте поля пустыми';
    setTimeout(() => emptyField.remove(), 1500);
  } else {
    addStickyNote(db, title, message);
    textarea.value = '';
    input.value = '';
  }
});
*/

// Отправка заметки 2 вариант

const submitForm = document.querySelector('.send-post');
submitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const noteContent = Object.fromEntries(new FormData(submitForm));
  console.log(noteContent);
  const title = noteContent[submitForm.querySelector('input').getAttribute('name')];
  const message = noteContent[submitForm.querySelector('textarea').getAttribute('name')];
  addStickyNote(db, title, message);
  submitForm.reset();
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
  month: 'numeric',
  day: 'numeric',
  timezone: 'UTC',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

function displayNotes(notes) {
  let listHTML = '';
  for (let i = 0; i < notes.length; i++) {
    let note = notes[i];
    // if (!note.timeedit) {
    //   console.log('НЕ РЕДАКТИРОВАЛОСЬ');
    // }
    listHTML +=
      '<article class="article" data-article_id="' +
      note.timestamp +
      '">' +
      '<div class="text-muted">' +
      'Создано: '+new Date(note.timestamp).toLocaleString('ru', options).toString() +
      ' ' +
      `${note.timeedit === undefined ? '' : '| Редактировалось: '+new Date(note.timeedit).toLocaleString('ru', options).toString()}` +
      // new Date(note.timeedit).toLocaleString('ru', options).toString() +
      '</div>' +
      '<h2>' +
      note.title +
      '</h2>' +
      '<p>' +
      note.text +
      '</p>' +
      '<button type="button" class="article__btn article__btn_del" onclick="deleteNote(event)" data-id="' +
      note.timestamp +
      '">Удалить пост</button>' +
      '<button type="button" class="article__btn article__btn_edit" onclick="editNote(event)" data-id="' +
      note.timestamp +
      '">Редактировать пост</button>' +
      '</article>';
  }
  posts.innerHTML = listHTML;
  // Отображение
}

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
  let tx = db.transaction(['posts'], 'readwrite');
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

// Редактирование заметки
const editForm = document.createElement('form');
editForm.classList.add('edit-form');
editForm.setAttribute('action', '#');

const inputEditTitle = document.createElement('input');
inputEditTitle.classList.add('title-edit');
inputEditTitle.setAttribute('type', 'text');
inputEditTitle.setAttribute('name', 'title-edit');

const textEditMessage = document.createElement('textarea');
textEditMessage.classList.add('article-edit');
textEditMessage.setAttribute('name', 'article-edit');

const sendEditBtn = document.createElement('input');
sendEditBtn.classList.add('post', 'submit-btn');
sendEditBtn.setAttribute('type', 'submit');
sendEditBtn.setAttribute('value', 'отправить');

editForm.append(inputEditTitle);
editForm.append(textEditMessage);
editForm.append(sendEditBtn);


const editNote = (event) => {
  const valueTimestamp = parseInt(event.target.getAttribute('data-id'));
  const editArticle = document.querySelector(`article[data-article_id="${valueTimestamp}"]`);
  // открываем транзакцию чтения/записи БД, готовую к редактированию данных
  let tx = db.transaction(['posts'], 'readwrite');
  // описываем обработчики на завершение транзакции
  tx.oncomplete = (event) => {
    console.log('Transaction completed.');
    // getAndDisplayNotes(db);
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
    console.log(key);

    const editRequest = store.get(key);

    editRequest.onsuccess = (event) => {
      // обрабатываем успех нашего запроса на редактирование
      editArticle.append(editForm);
      inputEditTitle.value = event.target.result.title;
      textEditMessage.value = event.target.result.text;

      editArticle.addEventListener('submit', (event) => {
        event.preventDefault();
        const articleEditContent = Object.fromEntries(new FormData(editForm));
        const title = articleEditContent['title-edit'];
        const message = articleEditContent['article-edit'];
        const tx = db.transaction(['posts'], 'readwrite');
        const store = tx.objectStore('posts');
        const editedArticle = { title: title, text: message, timestamp: valueTimestamp, timeedit: Date.now() };

        store.put(editedArticle, key);
        editForm.reset();

        tx.oncomplete = () => {
          getAndDisplayNotes(db);
        };
        tx.onerror = (event) => {
          alert('error storing note ' + event.target.errorCode);
        };
      });
    };
  };
};
