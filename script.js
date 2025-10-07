// =============================
// Import Firebase SDKs
// =============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  update,
  set,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// =============================
// Firebase Configuration
// =============================
const firebaseConfig = {
  apiKey: "AIzaSyBi0DtNzX0niHbV4LtId7PaxLoD8Pphy6U",
  authDomain: "comment-on-isrt-8a634.firebaseapp.com",
  databaseURL:
    "https://comment-on-isrt-8a634-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "comment-on-isrt-8a634",
  storageBucket: "comment-on-isrt-8a634.appspot.com",
  messagingSenderId: "173989173917",
  appId: "1:173989173917:web:613693b2c98c4c121e9274",
};

// =============================
// Initialize Firebase
// =============================
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// =============================
// DOM Elements
// =============================
const commentForm = document.getElementById("commentForm");
const commentText = document.getElementById("commentText");
const commentsContainer = document.getElementById("commentsContainer");

// =============================
// Emoji Reactions
// =============================
const reactions = ["👍", "😂", "😍", "😢", "😮", "😡", "😀"];

// =============================
// Submit new comment
// =============================
commentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = commentText.value.trim();
  if (!text) return;

  const comment = {
    text,
    timestamp: Date.now(),
    replies: [],
    reactions: {},
  };

  const commentsRef = ref(db, "comments");
  push(commentsRef, comment);
  commentText.value = "";
});

// =============================
// Live updates from Firebase
// =============================
const commentsRef = ref(db, "comments");

onValue(commentsRef, (snapshot) => {
  commentsContainer.innerHTML = "";
  const data = snapshot.val();

  if (!data) {
    commentsContainer.innerHTML = "<p>No comments yet. Be the first!</p>";
    return;
  }

  // Convert object to array and sort by newest first
  const comments = Object.entries(data)
    .map(([id, comment]) => ({ id, ...comment }))
    .sort((a, b) => b.timestamp - a.timestamp);

  comments.forEach((comment) => {
    const element = createCommentElement(comment);
    commentsContainer.appendChild(element);
  });
});

// =============================
// Render Comment / Reply Element
// =============================
function createCommentElement(comment, isReply = false, parentId = null) {
  const box = document.createElement("div");
  box.classList.add(isReply ? "reply-box" : "comment-box");

  const text = document.createElement("p");
  text.textContent = comment.text;
  box.appendChild(text);

  // ----- Controls -----
  const controls = document.createElement("div");
  controls.classList.add("controls");

  // Reply button
  const replyBtn = document.createElement("button");
  replyBtn.textContent = "💬 Reply";
  replyBtn.classList.add("reply-btn");
  controls.appendChild(replyBtn);
  box.appendChild(controls);

  // ----- Reactions -----
  const reactionContainer = document.createElement("div");
  reactionContainer.classList.add("reaction-options");

  reactions.forEach((emoji) => {
    const span = document.createElement("span");
    const count = comment.reactions?.[emoji] || 0;
    span.textContent = count > 0 ? `${emoji} ${count}` : emoji;
    span.classList.add("reaction");

    span.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation(); // ✅ Prevents reply box toggle when clicking a reaction

      const path = parentId
        ? `comments/${parentId}/replies/${comment.id}/reactions/${emoji}`
        : `comments/${comment.id}/reactions/${emoji}`;

      // ✅ Update only this emoji count — no overwrite
      const newCount = (comment.reactions?.[emoji] || 0) + 1;
      update(ref(db), {
        [path]: newCount,
      });

      // ✅ Instant UI update
      span.textContent = `${emoji} ${newCount}`;
    });

    reactionContainer.appendChild(span);
  });

  box.appendChild(reactionContainer);

  // ----- Reply Form -----
  const replyForm = document.createElement("form");
  replyForm.classList.add("reply-form");
  replyForm.style.display = "none";

  const replyInput = document.createElement("textarea");
  replyInput.placeholder = "Write a reply...";
  const replySubmit = document.createElement("button");
  replySubmit.textContent = "Post Reply";

  replyForm.appendChild(replyInput);
  replyForm.appendChild(replySubmit);
  box.appendChild(replyForm);

  // Toggle reply form
  replyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevents this click from propagating to parent comment
    replyForm.style.display =
      replyForm.style.display === "none" ? "block" : "none";
  });

  // Submit reply
  replyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const replyText = replyInput.value.trim();
    if (!replyText) return;

    const reply = {
      id: Date.now().toString(), // Firebase push creates unique IDs, so this 'id' isn't strictly needed for the path but useful for local rendering
      text: replyText,
      timestamp: Date.now(),
      replies: [], // Replies can also have replies
      reactions: {},
    };

    // Use push to add a new reply under the parent's replies
    const repliesRef = ref(db, `comments/${comment.id}/replies`);
    push(repliesRef, reply);

    replyInput.value = "";
    replyForm.style.display = "none";
  });

  // ----- Render replies recursively -----
  if (comment.replies) {
    const repliesDiv = document.createElement("div");
    repliesDiv.classList.add("replies");

    // Convert replies object to array to iterate
    Object.entries(comment.replies).forEach(([replyId, reply]) => {
      repliesDiv.appendChild(
        createCommentElement({ id: replyId, ...reply }, true, comment.id)
      );
    });

    box.appendChild(repliesDiv);
  }

  return box;
}
