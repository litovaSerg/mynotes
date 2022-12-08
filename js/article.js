'use strict';
const main = document.querySelector('main');
const postId = +location.search.slice(location.search.indexOf('?') + 1);

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
    const requestPost = req.result;

    function getDisplayPost() {
      let postText = requestPost.text;
      const postTextArr = postText.split('');
      postTextArr.forEach((item, index) => {
        if (item === '\n') {
          postTextArr[index] = '<p>';
        }
      });

      postText = postTextArr.join('');

      const postHtml = `<article class="article"><h2>${requestPost.title}</h2>${postText}</article>`;
      main.innerHTML = postHtml;
      const paragraph = document.querySelectorAll('p');

      paragraph.forEach((item, index) => {
        console.dir(item);
        if (item.outerHTML === '<p></p>') {
          console.log('yes');
          item.remove();
        }
      });
    }
    getDisplayPost();
  };
};
