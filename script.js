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
}