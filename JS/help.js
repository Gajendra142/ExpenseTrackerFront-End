// ===== FAQ Accordion =====
const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {
  const question = item.querySelector(".faq-question");

  question.addEventListener("click", () => {
    item.classList.toggle("active");

    faqItems.forEach(otherItem => {
      if (otherItem !== item) {
        otherItem.classList.remove("active");
      }
    });
  });
});

// ===== Smooth Scroll for Sidebar Links =====
const sidebarLinks = document.querySelectorAll(".help-sidebar a");

sidebarLinks.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const targetId = link.getAttribute("href").substring(1);
    const targetSection = document.getElementById(targetId);

    window.scrollTo({
      top: targetSection.offsetTop - 100,
      behavior: "smooth"
    });
  });
});

// ===== Search Functionality (Scroll to Section/FAQ) =====
const searchInput = document.getElementById("searchInput");
const searchFilter = document.getElementById("searchFilter");
const searchBtn = document.getElementById("searchBtn");

searchBtn.addEventListener("click", () => {
  const query = searchInput.value.toLowerCase();
  const category = searchFilter.value;

  // Get all FAQ sections
  const allSections = document.querySelectorAll(".help-section");
  let firstMatch = null;

  allSections.forEach(section => {
    const sectionId = section.getAttribute("id");

    // Show/hide section based on filter
    if (category === "all" || category === sectionId) {
      section.style.display = "block";

      const faqs = section.querySelectorAll(".faq-item");
      faqs.forEach(faq => {
        const questionText = faq.querySelector(".faq-question").textContent.toLowerCase();
        if (questionText.includes(query)) {
          faq.style.display = "block";
          if (!firstMatch) firstMatch = faq;
        } else {
          faq.style.display = "none";
        }
      });
    } else {
      section.style.display = "none";
    }
  });

  // Scroll to first matching FAQ or section
  if (firstMatch) {
    const topPos = firstMatch.offsetTop - 100;
    window.scrollTo({ top: topPos, behavior: "smooth" });
    firstMatch.classList.add("active");
  } else {
    alert("No results found.");
  }
});

// ===== Feedback Buttons =====
faqItems.forEach(item => {
  const answer = item.querySelector(".faq-answer");

  const feedbackDiv = document.createElement("div");
  feedbackDiv.className = "faq-feedback";
  feedbackDiv.innerHTML = `
    <br>
    <span>Was this helpful?</span>
    <button class="thumb-up"><i class="fa fa-thumbs-up"></i></button>
    <button class="thumb-down"><i class="fa fa-thumbs-down"></i></button>
  `;
  answer.appendChild(feedbackDiv);

  const thumbUp = feedbackDiv.querySelector(".thumb-up");
  const thumbDown = feedbackDiv.querySelector(".thumb-down");

  thumbUp.addEventListener("click", () => {
    thumbUp.style.color = "green";
    thumbDown.style.color = "inherit";
  });

  thumbDown.addEventListener("click", () => {
    thumbDown.style.color = "red";
    thumbUp.style.color = "inherit";
  });
});
