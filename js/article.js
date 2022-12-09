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
const openRequest = indexedDB.open('DB', 1);
openRequest.onerror = () => {
  console.error('Error', openRequest.error);
};

openRequest.onsuccess = () => {
  const db = openRequest.result;
  // продолжить работу с базой данных, используя объект db
  const tx = db.transaction(['posts'], 'readonly');
  const store = tx.objectStore('posts');
  const index = store.index('timestamp');
  const req = index.get(postId);
  req.onsuccess = (event) => {
    // Выбираем объект поста из БД, выбираем тайтл, тело поста, время
    const requestPost = req.result;
    console.log(requestPost);
    const postCreated = new Date(requestPost.timestamp).toLocaleString('ru', timeOptions).toString();
    const postEdited =
    requestPost.timeedit === undefined
      ? ''
      : ' | Редактировалось: ' + new Date(requestPost.timeedit).toLocaleString('ru', timeOptions).toString();
    const postTitle = requestPost.title;
    const postText = requestPost.text;

    // Выводим пост на странице с разбиением на абзацы
    renderDisplayPost();

    function renderDisplayPost() {
      let postHtml = '';
      for (let i = 0; i < postText.length; i++) {
        let foundSymbolPosition = postText.indexOf('\n\n', i);
        if (foundSymbolPosition == -1) {
          break;
        }
        postHtml += `<p>${postText.slice(i, foundSymbolPosition)}</p>`;
        i = foundSymbolPosition;
      }
      article.innerHTML = `<div class="text-muted">Создано: ${postCreated}${postEdited}</div><h2 class="article__title">${postTitle}</h2>${postHtml}`;
    }
  };
};
