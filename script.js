// ===============================
// Supabase
// ===============================

const SUPABASE_URL = "https://uehnhmykbtbamwfuabvn.supabase.co";

const SUPABASE_KEY = "sb_publishable_8YDjcafy45UrRRzJFLJ_Tw_3gfeEakC";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ===============================
// رقم الزائر
// ===============================

let visitorId = localStorage.getItem("nazif_visitor_id");

if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("nazif_visitor_id", visitorId);
}


// ===============================
// اللايكات
// ===============================

async function loadLikes(postId, element) {

    const { count, error } = await supabaseClient
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

    if (error) {
        console.error(error);
        return;
    }

    element.textContent = `❤️ ${count || 0}`;
}


async function likePost(postId, button) {

    // هل ضغط هذا الزائر على اللايك من قبل؟
    const { data: existingLike } = await supabaseClient
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("visitor_id", visitorId)
        .maybeSingle();

    if (existingLike) {
        alert("لقد أعجبت بهذه الكتابة من قبل ❤️");
        return;
    }

    const { error } = await supabaseClient
        .from("likes")
        .insert({
            post_id: postId,
            visitor_id: visitorId
        });

    if (error) {
        console.error(error);
        alert("حدث خطأ، حاول مرة أخرى.");
        return;
    }

    loadLikes(postId, button);
}


// ===============================
// التعليقات
// ===============================

async function loadComments(postId, container) {

    const { data, error } = await supabaseClient
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    container.innerHTML = "";

    data.forEach(comment => {

        const div = document.createElement("div");

        div.className = "comment";

        div.innerHTML = `
            <strong>${escapeHTML(comment.name)}</strong>
            <p>${escapeHTML(comment.comment)}</p>
        `;

        container.appendChild(div);
    });
}


// ===============================
// إضافة تعليق
// ===============================

async function addComment(postId, nameInput, commentInput, container) {

    const name = nameInput.value.trim();
    const comment = commentInput.value.trim();

    if (!name || !comment) {
        alert("اكتب اسمك والتعليق أولاً.");
        return;
    }

    const { error } = await supabaseClient
        .from("comments")
        .insert({
            post_id: postId,
            name: name,
            comment: comment
        });

    if (error) {
        console.error(error);
        alert("تعذر نشر التعليق.");
        return;
    }

    nameInput.value = "";
    commentInput.value = "";

    loadComments(postId, container);
}


// ===============================
// حماية بسيطة من HTML
// ===============================

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// ===============================
// تشغيل النظام
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll(".card").forEach((card, index) => {

        const postId = index + 1;

        // إضافة منطقة التفاعل
        const interaction = document.createElement("div");

        interaction.className = "interaction";

        interaction.innerHTML = `

            <button class="like-btn">
                ❤️ 0
            </button>

            <div class="comments-section">

                <h3>💬 التعليقات</h3>

                <div class="comments-list"></div>

                <input
                    type="text"
                    class="comment-name"
                    placeholder="اسمك"
                >

                <textarea
                    class="comment-text"
                    placeholder="اكتب تعليقك..."
                ></textarea>

                <button class="comment-btn">
                    نشر التعليق
                </button>

            </div>
        `;

        card.appendChild(interaction);

        const likeButton =
            interaction.querySelector(".like-btn");

        const commentsList =
            interaction.querySelector(".comments-list");

        const nameInput =
            interaction.querySelector(".comment-name");

        const commentInput =
            interaction.querySelector(".comment-text");

        const commentButton =
            interaction.querySelector(".comment-btn");


        // تحميل اللايكات
        loadLikes(postId, likeButton);

        // تحميل التعليقات
        loadComments(postId, commentsList);


        // زر اللايك
        likeButton.addEventListener("click", () => {

            likePost(postId, likeButton);

        });


        // زر التعليق
        commentButton.addEventListener("click", () => {

            addComment(
                postId,
                nameInput,
                commentInput,
                commentsList
            );

        });

    });

});
// ==========================================
// إرسال نصوص المتابعين إلى Supabase
// ==========================================

const writingForm = document.getElementById("writingForm");
const formMessage = document.getElementById("formMessage");

if (writingForm) {

    writingForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const writerName =
            document.getElementById("writerName").value.trim();

        const writingTitle =
            document.getElementById("writingTitle").value.trim();

        const writingText =
            document.getElementById("writingText").value.trim();

        if (!writerName || !writingTitle || !writingText) {
            formMessage.textContent = "يرجى ملء جميع الخانات.";
            return;
        }

        formMessage.textContent = "جاري إرسال نصك...";

        const { error } = await supabaseClient
            .from("submissions")
            .insert({
                writer_name: writerName,
                title: writingTitle,
                content: writingText,
                status: "pending"
            });

        if (error) {

            console.error(error);

            formMessage.textContent =
                "حدث خطأ أثناء الإرسال، حاول مرة أخرى.";

            return;
        }

        formMessage.textContent =
            "تم إرسال نصك بنجاح ✒️ وسيتم مراجعته قبل نشره.";

        writingForm.reset();
    });
}/* ==========================================
   إعجابات وتعليقات كتابات المتابعين
========================================== */

document.addEventListener("DOMContentLoaded", async function () {

    const cards = document.querySelectorAll(".follower-card");

    if (!cards.length) return;


    /* إنشاء رقم خاص لكل زائر */

    let visitorId = localStorage.getItem("nazifVisitorId");

    if (!visitorId) {

        visitorId =
            "visitor-" +
            Date.now() +
            "-" +
            Math.random().toString(36).substring(2);

        localStorage.setItem(
            "nazifVisitorId",
            visitorId
        );
    }


    /* ==========================================
       تشغيل كل بطاقة
    ========================================== */

    for (const card of cards) {

        const postId = card.dataset.postId;

        const likeButton =
            card.querySelector(".follower-like");

        const likeCount =
            card.querySelector(".like-count");

        const commentButton =
            card.querySelector(".follower-comment");

        const commentCount =
            card.querySelector(".comment-count");

        const commentsBox =
            card.querySelector(".comments-box");

        const commentsList =
            card.querySelector(".comments-list");

        const commentForm =
            card.querySelector(".comment-form");

        const commentName =
            card.querySelector(".comment-name");

        const commentText =
            card.querySelector(".comment-text");

        const commentMessage =
            card.querySelector(".comment-message");


        /* ==========================================
           تحميل عدد الإعجابات
        ========================================== */

        async function loadLikes() {

            const { count, error } =
                await supabaseClient
                    .from("likes")
                    .select("*", {
                        count: "exact",
                        head: true
                    })
                    .eq("post_id", postId);

            if (error) {

                console.error(
                    "خطأ في تحميل الإعجابات:",
                    error
                );

                return;
            }

            likeCount.textContent = count || 0;
        }


        /* ==========================================
           التأكد هل الزائر ضغط إعجاب من قبل
        ========================================== */

        async function checkLike() {

            const { data, error } =
                await supabaseClient
                    .from("likes")
                    .select("id")
                    .eq("post_id", postId)
                    .eq("visitor_id", visitorId)
                    .maybeSingle();

            if (error) {

                console.error(
                    "خطأ في التحقق من الإعجاب:",
                    error
                );

                return;
            }

            if (data) {

                likeButton.classList.add("liked");

                likeButton.querySelector(
                    ".like-text"
                ).textContent = "أعجبني";
            }
        }


        /* ==========================================
           الضغط على زر الإعجاب
        ========================================== */

        likeButton.addEventListener(
            "click",
            async function () {

                /* البحث عن إعجاب هذا الزائر */

                const { data, error } =
                    await supabaseClient
                        .from("likes")
                        .select("id")
                        .eq("post_id", postId)
                        .eq("visitor_id", visitorId)
                        .maybeSingle();


                if (error) {

                    console.error(
                        "خطأ:",
                        error
                    );

                    return;
                }


                /* إذا كان قد أعجب من قبل
                   نحذف الإعجاب */

                if (data) {

                    const { error: deleteError } =
                        await supabaseClient
                            .from("likes")
                            .delete()
                            .eq("id", data.id);

                    if (deleteError) {

                        console.error(
                            "خطأ في إزالة الإعجاب:",
                            deleteError
                        );

                        return;
                    }

                    likeButton.classList.remove(
                        "liked"
                    );

                    likeButton.querySelector(
                        ".like-text"
                    ).textContent = "إعجاب";

                }


                /* إذا لم يعجب من قبل
                   نضيف الإعجاب */

                else {

                    const { error: insertError } =
                        await supabaseClient
                            .from("likes")
                            .insert({

                                post_id: postId,

                                visitor_id: visitorId

                            });


                    if (insertError) {

                        console.error(
                            "خطأ في إضافة الإعجاب:",
                            insertError
                        );

                        return;
                    }

                    likeButton.classList.add(
                        "liked"
                    );

                    likeButton.querySelector(
                        ".like-text"
                    ).textContent = "أعجبني";
                }


                /* تحديث العدد */

                await loadLikes();

            }
        );


        /* ==========================================
           تحميل التعليقات
        ========================================== */

        async function loadComments() {

            const { data, error } =
                await supabaseClient
                    .from("comments")
                    .select(
                        "id, visitor_name, comment_text, created_at"
                    )
                    .eq("post_id", postId)
                    .order("created_at", {
                        ascending: true
                    });


            if (error) {

                console.error(
                    "خطأ في تحميل التعليقات:",
                    error
                );

                return;
            }


            commentsList.innerHTML = "";


            data.forEach(function (comment) {

                const item =
                    document.createElement("div");

                item.className =
                    "comment-item";


                const name =
                    document.createElement("strong");

                name.textContent =
                    comment.visitor_name;


                const text =
                    document.createElement("p");

                text.textContent =
                    comment.comment_text;


                item.appendChild(name);

                item.appendChild(text);

                commentsList.appendChild(item);

            });


            commentCount.textContent =
                data.length;
        }


        /* ==========================================
           فتح وإغلاق التعليقات
        ========================================== */

        commentButton.addEventListener(
            "click",
            async function () {

                commentsBox.classList.toggle(
                    "show"
                );


                if (
                    commentsBox.classList.contains(
                        "show"
                    )
                ) {

                    await loadComments();

                    commentName.focus();
                }

            }
        );


        /* ==========================================
           إرسال التعليق
        ========================================== */

        commentForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const name =
                    commentName.value.trim();

                const text =
                    commentText.value.trim();


                /* التحقق من البيانات */

                if (!name || !text) {

                    commentMessage.textContent =
                        "⚠️ يرجى كتابة اسمك وتعليقك.";

                    return;
                }


                /* منع التعليقات الطويلة جدًا */

                if (name.length > 50) {

                    commentMessage.textContent =
                        "الاسم طويل جدًا.";

                    return;
                }


                if (text.length > 500) {

                    commentMessage.textContent =
                        "التعليق طويل جدًا.";

                    return;
                }


                commentMessage.textContent =
                    "⏳ جاري إرسال التعليق...";


                /* إرسال التعليق إلى Supabase */

                const { error } =
                    await supabaseClient
                        .from("comments")
                        .insert({

                            post_id: postId,

                            visitor_name: name,

                            comment_text: text

                        });


                /* في حالة وجود خطأ */

                if (error) {

                    console.error(
                        "خطأ في إرسال التعليق:",
                        error
                    );

                    commentMessage.textContent =
                        "❌ حدث خطأ أثناء إرسال التعليق.";

                    return;
                }


                /* نجاح الإرسال */

                commentMessage.textContent =
                    "✅ تم إرسال تعليقك بنجاح.";


                /* تنظيف الخانات */

                commentForm.reset();


                /* تحديث التعليقات */

                await loadComments();

            }
        );


        /* ==========================================
           تشغيل البيانات عند فتح الموقع
        ========================================== */

        await loadLikes();

        await checkLike();

        await loadComments();

    }

});