'use strict';
const article = document.querySelector('article');
// Определяем ID поста для вывода
const postId = +location.search.slice(location.search.indexOf('?') + 1);

const timeOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timezone: 'UTC',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

// Открываем БД
let db;
const openRequest = indexedDB.open('DB', 1);
openRequest.onerror = () => {
  console.error('Error', openRequest.error);
};

openRequest.onsuccess = () => {
  db = openRequest.result;
  // продолжить работу с базой данных, используя объект db
  const tx = db.transaction(['posts'], 'readonly');
  const store = tx.objectStore('posts');
  const index = store.index('timestamp');
  const req = index.get(postId);
  req.onsuccess = (event) => {
      // Выбираем объект поста из БД, выбираем тайтл, тело поста, время
      const requestPost = req.result;
      if (requestPost === undefined) {
        article.innerHTML = 'Заметки не существует или она была удалена';
      } else {
        console.log(requestPost);
        const postCreated = new Date(requestPost.timestamp).toLocaleString('ru', timeOptions).toString();
        const postEdited =
          requestPost.timeedit === undefined
            ? ''
            : ' | Редактировалось: ' + new Date(requestPost.timeedit).toLocaleString('ru', timeOptions).toString();
        const postTitle = requestPost.title;
        const postText = requestPost.text;

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
            <div class="article__button-block"><button type="button" class="article__btn article__btn_del" onclick="deleteNote(event)" data-id="${postId}">Удалить пост</button>
            <button type="button" class="article__btn article__btn_edit" onclick="editNote(event)" data-id="${postId}"
            >Редактировать пост</button></div>`;

      }
  };
};

// Delete notes
const deleteNote = (event) => {
  // получаем признак выбранной записи
  const valueTimestamp = parseInt(event.target.getAttribute('data-id'));
  console.log(valueTimestamp);
  // открываем транзакцию чтения/записи БД, готовую к удалению данных
  let tx = db.transaction(['posts'], 'readwrite');
  // описываем обработчики на завершение транзакции
  tx.oncomplete = (event) => {
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
    const key = req.result;
    // выполняем запрос на удаление указанной записи из хранилища объектов
    let deleteRequest = store.delete(key);
    deleteRequest.onsuccess = (event) => {
      event.preventDefault();
      article.innerHTML = 'Заметки не существует или она была удалена';
      // обрабатываем успех нашего запроса на удаление
      console.log('Delete request successful');
    };
  };
};
