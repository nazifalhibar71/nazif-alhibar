// ==========================================
// نزيف الحبر - Supabase
// إعجابات + تعليقات لكتاباتي وكتابات المتابعين
// ==========================================

const SUPABASE_URL = "https://uehnhmykbtbamwfuabvn.supabase.co";
const SUPABASE_KEY = "sb_publishable_8YDjcafy45UrRRzJFLJ_Tw_3gfeEakC";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// رقم ثابت للزائر على نفس المتصفح
let visitorId = localStorage.getItem("nazif_visitor_id");

if (!visitorId) {
    if (window.crypto && crypto.randomUUID) {
        visitorId = crypto.randomUUID();
    } else {
        visitorId = "visitor-" + Date.now() + "-" + Math.random().toString(36).substring(2);
    }

    localStorage.setItem("nazif_visitor_id", visitorId);
}

// ==========================================
// تحميل عدد الإعجابات
// ==========================================

async function loadLikes(postId, countElement) {
    const { count, error } = await supabaseClient
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

    if (error) {
        console.error("خطأ في تحميل الإعجابات:", error);
        return;
    }

    countElement.textContent = count || 0;
}

// ==========================================
// معرفة هل الزائر أعجب بالكتابة
// ==========================================

async function checkLike(postId, button) {
    const { data, error } = await supabaseClient
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("visitor_id", visitorId)
        .maybeSingle();

    if (error) {
        console.error("خطأ في التحقق من الإعجاب:", error);
        return;
    }

    const text = button.querySelector(".like-text");

    if (data) {
        button.classList.add("liked");
        if (text) text.textContent = "أعجبني";
    } else {
        button.classList.remove("liked");
        if (text) text.textContent = "إعجاب";
    }
}

// ==========================================
// تبديل الإعجاب: إعجاب / إزالة الإعجاب
// ==========================================

async function toggleLike(postId, button, countElement) {
    button.disabled = true;

    const { data, error: checkError } = await supabaseClient
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("visitor_id", visitorId)
        .maybeSingle();

    if (checkError) {
        console.error("خطأ في التحقق من الإعجاب:", checkError);
        button.disabled = false;
        return;
    }

    if (data) {
        const { error: deleteError } = await supabaseClient
            .from("likes")
            .delete()
            .eq("id", data.id);

        if (deleteError) {
            console.error("خطأ في إزالة الإعجاب:", deleteError);
            button.disabled = false;
            return;
        }
    } else {
        const { error: insertError } = await supabaseClient
            .from("likes")
            .insert({
                post_id: postId,
                visitor_id: visitorId
            });

        if (insertError) {
            console.error("خطأ في إضافة الإعجاب:", insertError);
            button.disabled = false;
            return;
        }
    }

    await checkLike(postId, button);
    await loadLikes(postId, countElement);

    button.disabled = false;
}

// ==========================================
// تحميل التعليقات
// ==========================================

async function loadComments(postId, container, countElement) {
    const { data, error } = await supabaseClient
        .from("comments")
        .select("id, visitor_name, comment_text, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("خطأ في تحميل التعليقات:", error);
        return;
    }

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="no-comments">لا توجد تعليقات بعد. كن أول من يعلّق ✍️</p>';
        countElement.textContent = "0";
        return;
    }

    data.forEach((comment) => {
        const item = document.createElement("div");
        item.className = "comment";

        const name = document.createElement("strong");
        name.textContent = comment.visitor_name;

        const text = document.createElement("p");
        text.textContent = comment.comment_text;

        item.appendChild(name);
        item.appendChild(text);
        container.appendChild(item);
    });

    countElement.textContent = data.length;
}

// ==========================================
// إضافة تعليق
// ==========================================

async function addComment(
    postId,
    nameInput,
    textInput,
    commentsList,
    commentCount,
    messageElement,
    form
) {
    const name = nameInput.value.trim();
    const text = textInput.value.trim();

    if (!name || !text) {
        messageElement.textContent = "⚠️ يرجى كتابة الاسم والتعليق.";
        return;
    }

    if (name.length > 50) {
        messageElement.textContent = "⚠️ الاسم طويل جدًا.";
        return;
    }

    if (text.length > 500) {
        messageElement.textContent = "⚠️ التعليق طويل جدًا.";
        return;
    }

    messageElement.textContent = "⏳ جاري نشر التعليق...";

    const { error } = await supabaseClient
        .from("comments")
        .insert({
            post_id: postId,
            visitor_name: name,
            comment_text: text
        });

    if (error) {
        console.error("خطأ في نشر التعليق:", error);
        messageElement.textContent = "❌ تعذر نشر التعليق. حاول مرة أخرى.";
        return;
    }

    form.reset();
    messageElement.textContent = "✅ تم نشر تعليقك بنجاح.";

    await loadComments(postId, commentsList, commentCount);
}

// ==========================================
// تشغيل بطاقة واحدة
// ==========================================

async function initializeCard(card) {
    const postId = card.dataset.postId;

    if (!postId) return;

    const likeButton = card.querySelector(".follower-like");
    const likeCount = card.querySelector(".like-count");
    const commentButton = card.querySelector(".follower-comment");
    const commentCount = card.querySelector(".comment-count");
    const commentsBox = card.querySelector(".comments-box");
    const commentsList = card.querySelector(".comments-list");
    const commentForm = card.querySelector(".comment-form");
    const commentName = card.querySelector(".comment-name");
    const commentText = card.querySelector(".comment-text");
    const commentMessage = card.querySelector(".comment-message");

    if (
        !likeButton || !likeCount ||
        !commentButton || !commentCount ||
        !commentsBox || !commentsList ||
        !commentForm || !commentName ||
        !commentText || !commentMessage
    ) {
        console.error("عناصر التفاعل ناقصة في:", card);
        return;
    }

    await Promise.all([
        loadLikes(postId, likeCount),
        checkLike(postId, likeButton),
        loadComments(postId, commentsList, commentCount)
    ]);

    likeButton.addEventListener("click", async () => {
        await toggleLike(postId, likeButton, likeCount);
    });

    commentButton.addEventListener("click", async () => {
        commentsBox.classList.toggle("show");

        if (commentsBox.classList.contains("show")) {
            await loadComments(postId, commentsList, commentCount);
            commentName.focus();
        }
    });

    commentForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        await addComment(
            postId,
            commentName,
            commentText,
            commentsList,
            commentCount,
            commentMessage,
            commentForm
        );
    });
}

// ==========================================
// تشغيل الموقع
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    const cards = document.querySelectorAll(
        ".card[data-post-id], .follower-card[data-post-id]"
    );

    for (const card of cards) {
        await initializeCard(card);
    }
});
