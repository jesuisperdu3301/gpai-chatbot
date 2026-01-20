// app.js
let selectedChapter = null;

// ----------------------------
// Chapter Selection (Tabs)
// ----------------------------
function selectChapterTab(tabElement, chapter) {
  const tabs = document.querySelectorAll("#chapter-selection .tab");
  tabs.forEach(t => t.classList.remove("active"));
  tabElement.classList.add("active");
  selectChapter(chapter);
}

function selectChapter(chapter) {
  selectedChapter = chapter.toLowerCase();
  document.getElementById("chapter-selection").hidden = true;
  document.getElementById("chat-section").hidden = false;

  addMessage(
    "system",
    `You have selected "${chapter.toUpperCase()}" chapter. Ask questions strictly related to this chapter.`
  );

  showSuggestedQuestions(selectedChapter);
}

// ----------------------------
// Add message to chat box (bubbles)
// ----------------------------
function addMessage(sender, text) {
  const chatBox = document.getElementById("chat-box");
  const msg = document.createElement("div");
  msg.className = sender;

  if (sender === "assistant") {
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p);
    const isLong = paragraphs.join("\n").length > 300;

    const bubbleContent = document.createElement("div");
    bubbleContent.className = isLong ? "collapsed-answer" : "";
    bubbleContent.innerHTML = paragraphs.map(p => `<p>${highlightGlossaryTerms(p)}</p>`).join("");

    msg.appendChild(bubbleContent);

    if (isLong) {
      const btnContainer = document.createElement("div");
      btnContainer.className = "bubble-buttons";

      const expandBtn = document.createElement("button");
      expandBtn.innerText = "Expand";
      expandBtn.onclick = () => {
        bubbleContent.classList.toggle("collapsed-answer");
        expandBtn.innerText = bubbleContent.classList.contains("collapsed-answer") ? "Expand" : "Collapse";
      };
      btnContainer.appendChild(expandBtn);

      const copyBtn = document.createElement("button");
      copyBtn.innerText = "Copy";
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(text);
        copyBtn.innerText = "Copied!";
        setTimeout(() => (copyBtn.innerText = "Copy"), 1000);
      };
      btnContainer.appendChild(copyBtn);

      msg.appendChild(btnContainer);
    }

  } else {
    msg.innerText = text;
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ----------------------------
// Highlight glossary terms
// ----------------------------
function highlightGlossaryTerms(text) {
  let result = text;
  Object.keys(glossary).forEach(term => {
    const pattern = new RegExp(`\\b${term}\\b`, "gi");
    result = result.replace(
      pattern,
      `<span class="glossary-term" title="${glossary[term]}">${term}</span>`
    );
  });
  return result;
}

// ----------------------------
// Suggested Questions
// ----------------------------
function showSuggestedQuestions(chapter) {
  const container = document.getElementById("suggested-questions");
  container.innerHTML = "";

  const questions = suggestedQuestions[chapter] || [];
  questions.forEach(q => {
    const btn = document.createElement("button");
    btn.innerText = q;
    btn.className = "suggested-question-btn";
    btn.onclick = () => {
      document.getElementById("user-input").value = q;
      sendMessage();
    };
    container.appendChild(btn);
  });

  container.style.display = questions.length ? "flex" : "none";
}

// ----------------------------
// Send user message
// ----------------------------
async function sendMessage() {
  const input = document.getElementById("user-input");
  const userText = input.value.trim();
  if (!userText) return;

  input.value = "";
  addMessage("user", userText);

  const chatBox = document.getElementById("chat-box");

  // Typing indicator
  const typingIndicator = document.createElement("div");
  typingIndicator.className = "assistant";
  typingIndicator.id = "typing-indicator";
  typingIndicator.innerText = "Assistant is typing...";
  chatBox.appendChild(typingIndicator);
  chatBox.scrollTop = chatBox.scrollHeight;

  const prompt = buildPrompt(userText);

  try {
    const response = await callBackend(prompt);
    typingIndicator.remove();
    addMessage("assistant", response);
  } catch (error) {
    typingIndicator.remove();
    console.error(error);
    addMessage("assistant", "Sorry, there was an error contacting the AI service.");
  }
}

// ----------------------------
// Build prompt for LLM
// ----------------------------
function buildPrompt(userQuestion) {
  return `
You are an AI compliance assistant focused exclusively on the EU General-Purpose AI (GPAI) Code of Practice under Regulation (EU) 2024/1689.

You provide neutral, non-binding, educational explanations.

Selected chapter: ${selectedChapter}

Chapter rules:
${chapterRules(selectedChapter)}

User question:
"${userQuestion}"

Answer in formal, institutional EU legal language.
If the question is outside the selected chapter, explain that politely and redirect.
`;
}

// ----------------------------
// Chapter rules
// ----------------------------
function chapterRules(chapter) {
  switch (chapter) {
    case "transparency":
      return `
Focus on documentation, disclosure obligations, model information,
and Article 53 AI Act. Do not discuss copyright or safety issues.
`;
    case "copyright":
      return `
Focus on copyright compliance, lawful access to training data,
TDM opt-out mechanisms, and copyright policies.
Do not discuss transparency documentation or systemic risk.
`;
    case "safety":
      return `
Focus on systemic risk, risk mitigation, cybersecurity,
incident reporting, and Article 55 AI Act.
Do not discuss copyright or transparency.
`;
    default:
      return "";
  }
}

// ----------------------------
// Call Node backend
// ----------------------------
async function callBackend(prompt) {
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a compliance assistant for the EU GPAI Code of Practice." },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await res.json();

  if (data.content) {
    return data.content;
  } else if (data.error) {
    throw new Error(data.error);
  } else {
    throw new Error("Unexpected response from backend");
  }
}

// ----------------------------
// Glossary
// ----------------------------
const glossary = {
  gpai: "General-Purpose AI (GPAI) refers to AI models capable of performing a wide range of tasks and that can be integrated into downstream systems, as defined in the EU AI Act.",
  ai_act: "The EU AI Act (Regulation (EU) 2024/1689) sets rules for AI development, deployment, and use, including GPAI.",
  systemic_risk: "Risks from advanced GPAI models that may significantly impact public safety, fundamental rights, or society, under Article 55 AI Act.",
  model_documentation: "Structured info on model characteristics, training, and limitations per Article 53 AI Act.",
  data_sheet: "Standardized summary of model design, intended use, limitations, and ethical considerations.",
  explainability: "Ability to understand and explain how a GPAI model produces outputs.",
  disclosure_obligations: "Duty of GPAI providers to disclose info on models, training data, limitations, and performance.",
  article_53_ai_act: "Article 53 of the EU AI Act: transparency and documentation for high-risk AI systems.",
  tdm: "Text and Data Mining (TDM) for automated analysis with lawful access or copyright exemptions.",
  copyright_opt_out: "Mechanism allowing copyright holders to exclude works from training datasets.",
  licensed_dataset: "Dataset legally licensed for model training.",
  lawful_access: "AI providers must use only legally accessible content.",
  training_data_policy: "Provider rules ensuring all training data complies with copyright and legal requirements.",
  risk_assessment: "Evaluation of potential harms, impacts, and vulnerabilities before deployment.",
  risk_mitigation: "Measures to reduce likelihood or severity of risks.",
  incident_reporting: "Procedures to report serious incidents or malfunctions per Article 55 AI Act.",
  cybersecurity: "Safeguards to prevent unauthorized access or tampering of GPAI systems.",
  article_55_ai_act: "Article 55 of EU AI Act: monitoring, reporting, and mitigating high-risk AI systems."
};

// ----------------------------
// Suggested questions per chapter
// ----------------------------
const suggestedQuestions = {
  transparency: [
    "What is model documentation?",
    "What are disclosure obligations?",
    "What is Article 53 AI Act?"
  ],
  copyright: [
    "Can I use copyrighted data for training?",
    "What is TDM?",
    "What are copyright policies?"
  ],
  safety: [
    "What is systemic risk?",
    "How to report incidents?",
    "What is risk mitigation?"
  ]
};
