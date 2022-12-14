'use strict';
// Time output format
const options = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timezone: 'UTC',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

const posts = document.querySelector('.posts');
const submitForm = document.querySelector('.forms__send-post');
const addPost = document.getElementById('call-submit-form');
const allNotesStats = document.querySelector('[data-stats="allnotes"]');
const allNotesSymb = document.querySelector('[data-stats="allsymb"]');

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

const addStickyNote = (db, title, message, important = 'off') => {
  // Запустим транзакцию базы данных и получите хранилище объектов Notes
  let tx = db.transaction(['posts'], 'readwrite');
  let store = tx.objectStore('posts');

  // Добаляем заметку в хранилище объектов
  let note = { title: title, text: message, timestamp: Date.now(), important: important };
  store.add(note);

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

// Add post
addPost.addEventListener('click', () => {
  submitForm.classList.add('forms__send-post_show');
  addPost.classList.add('forms__submit-btn_hide');
});

submitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const noteContent = Object.fromEntries(new FormData(submitForm));
  const title = noteContent.title;
  const message = noteContent.content;
  const importantMessage = noteContent.important;
  addStickyNote(db, title, message, importantMessage);
  submitForm.reset();
  submitForm.classList.remove('forms__send-post_show');
  addPost.classList.remove('forms__submit-btn_hide');
});

// Get all posts
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
  let allPosts = [];

  req.onsuccess = (event) => {
    // Результатом req.onsuccess в запросах openCursor является
    // IDBCursor
    let cursor = event.target.result;

    if (cursor != null) {
      // Если курсор не нулевой, мы получили элемент.
      allPosts.push(cursor.value);
      cursor.continue();
    } else {
      // Если у нас нулевой курсор, это означает, что мы получили
      // все данные, поэтому отображаем заметки, которые мы получили.
      displayNotes(allPosts);
      getStatsInSidebar(allPosts);
    }
  };

  req.onerror = (event) => {
    alert('error in cursor request ' + event.target.errorCode);
  };
};

// Render post list
function displayNotes(postsArr) {
  let listHTML;
  if (postsArr.length === 0) {
    listHTML = `<article class="article">Здесь пока еще пусто. Добавьте заметку</article>`;
  } else {
    listHTML = ``;
    postsArr.forEach((item) => {
      listHTML +=
        `<article class="${item.important === 'on' ? 'red-article' : 'article'}" data-article_id="${item.timestamp}">` +
        `<div class="text-muted">${
          'Создано: ' +
          new Date(item.timestamp).toLocaleString('ru', options).toString() +
          ' ' +
          `${
            item.timeedit === undefined
              ? ''
              : '| Редактировалось: ' + new Date(item.timeedit).toLocaleString('ru', options).toString()
          }`
        }</div>` +
        `<h2><a href="../mynotes/pages/article.html?${item.timestamp}" class="article__title-link">${item.title}</a></h2>` +
        `<p>${item.text.length > 300 ? item.text.slice(0, 200) : item.text}</p>` +
        `<div class="article__footer">
        <div class="article__button-block"><button type="button" class="article__btn article__btn_del" onclick="deleteNote(event)" data-id="${item.timestamp}">Удалить пост</button>
        <button type="button" class="article__btn article__btn_edit" onclick="editNote(event)" data-id="${item.timestamp}"
        >Редактировать пост</button></div>
        <div><a href="../mynotes/pages/article.html?${item.timestamp}" class="article__read-more">Читать далее >></a></div>
        </div>` +
        `</article>`;
    });
  }
  posts.innerHTML = listHTML;
}
// Render stats in sidebar
function getStatsInSidebar(postsArr) {
  allNotesStats.textContent = postsArr.length;
  let sumAllSymb = postsArr.reduce((sum, item) => sum + item.title.length + item.text.length, 0);
  allNotesSymb.textContent = sumAllSymb;
}

// Вывод заметок по времени добавления
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
    const key = event.target.result;
    // выполняем запрос на удаление указанной записи из хранилища объектов
    let deleteRequest = store.delete(key);
    deleteRequest.onsuccess = (event) => {
      event.preventDefault();
      // обрабатываем успех нашего запроса на удаление
      console.log('Delete request successful');
      getAndDisplayNotes(db);
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
sendEditBtn.classList.add('forms__submit-btn');
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
    const key = event.target.result;
    console.log(key);

    const editRequest = store.get(key);

    editRequest.onsuccess = (event) => {
      // обрабатываем успех нашего запроса на редактирование
      editArticle.append(editForm);
      inputEditTitle.value = event.target.result.title;
      textEditMessage.value = event.target.result.text;
      const importantArticle = event.target.result.important;

      editArticle.addEventListener('submit', (event) => {
        event.preventDefault();
        const articleEditContent = Object.fromEntries(new FormData(editForm));
        const title = articleEditContent['title-edit'];
        const message = articleEditContent['article-edit'];
        const tx = db.transaction(['posts'], 'readwrite');
        const store = tx.objectStore('posts');
        const editedArticle = {
          title: title,
          text: message,
          timestamp: valueTimestamp,
          timeedit: Date.now(),
          important: importantArticle,
        };

        store.put(editedArticle, key);
        // editForm.reset();

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
