'use strict';
const article = document.querySelector('article');
let parsePostId = +location.search.slice(location.search.indexOf('?') + 1);

const timeOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timezone: 'UTC',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

//  Indexed DB
let db;
let dbReq = indexedDB.open('DB', 1);

dbReq.onsuccess = (event) => {
  db = event.target.result;
  getSingleNote(db);
};

dbReq.onerror = (event) => {
  alert('error opening database ' + event.target.errorCode);
};

// Get single post
function getSingleNote(db) {
  let tx = db.transaction(['posts'], 'readonly');
  let store = tx.objectStore('posts');

  let index = store.index('timestamp');
  const req = index.get(parsePostId);

  req.onsuccess = (event) => {
    let requestPost = event.target.result;
    renderDisplayNote(requestPost);
  };
}

// Render post
function renderDisplayNote(postItem) {
  if (postItem === undefined) {
    article.innerHTML = 'Заметки не существует или она была удалена';
  } else {
    const postCreated = new Date(postItem.timestamp).toLocaleString('ru', timeOptions).toString();
    const postEdited =
      postItem.timeedit === undefined
        ? ''
        : ' | Редактировалось: ' + new Date(postItem.timeedit).toLocaleString('ru', timeOptions).toString();
    const postTitle = postItem.title;
    const postText = postItem.text + '\n\n';

    let postHtml = '';
    for (let i = 0; i < postText.length; i++) {
      let foundSymbolPosition = postText.indexOf('\n\n', i);
      if (foundSymbolPosition == -1) {
        break;
      }
      postHtml += `<p>${postText.slice(i, foundSymbolPosition)}</p>`;
      i = foundSymbolPosition;
    }
    article.innerHTML =
      `<div class="text-muted">Создано: ${postCreated}${postEdited}</div><h2 class="article__title">${postTitle}</h2>${postHtml}` +
      `<div class="article__footer">
          <div class="article__button-block"><button type="button" class="article__btn article__btn_del" onclick="deleteNote(event)" data-id="${parsePostId}">Удалить пост</button>
          <button type="button" class="article__btn article__btn_edit" onclick="editNote(event)" data-id="${parsePostId}"
          >Редактировать пост</button></div>`;
  }
}

// Edit post
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
  const editArticle = document.querySelector('.article');
  // открываем транзакцию чтения/записи БД, готовую к редактированию данных
  let tx = db.transaction(['posts'], 'readwrite');
  // описываем обработчики на завершение транзакции
  tx.oncomplete = (event) => {
    console.log('Transaction completed.');
    // getAndDisplayNotes(db);
  };

  tx.onerror = function (event) {
    alert('error ' + event.target.errorCode);
  };

  // создаем хранилище объектов по транзакции
  const store = tx.objectStore('posts');
  const index = store.index('timestamp');
  // получаем ключ записи
  const req = index.getKey(valueTimestamp);
  req.onsuccess = (event) => {
    const key = event.target.result;
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

        tx.oncomplete = () => {
          getSingleNote(db);
        };
        tx.onerror = (event) => {
          alert('error storing note ' + event.target.errorCode);
        };
      });
    };
  };
};

// Delete post
const deleteNote = (event) => {
  // получаем признак выбранной записи
  const valueTimestamp = parseInt(event.target.getAttribute('data-id'));
  // открываем транзакцию чтения/записи БД, готовую к удалению данных
  let tx = db.transaction(['posts'], 'readwrite');
  // описываем обработчики на завершение транзакции
  tx.oncomplete = () => {
    console.log('Transaction completed.');
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
    deleteRequest.onsuccess = () => {
      getSingleNote(db);
      console.log('Delete request successful');
    };
  };
};
