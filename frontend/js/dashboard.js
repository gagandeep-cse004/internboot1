// === InternBoot Exam 1 Script ===

// Sample Questions
const questions = [
    { q: "1. HTML stands for?", a: ["Hyper Text Markup Language", "HighText Machine Language", "Hyperloop Machine Language", "None"], correct: 0 },
    { q: "2. CSS used for?", a: ["Database", "Styling", "Server Side", "None"], correct: 1 },
    { q: "3. JS stands for?", a: ["JavaServer", "JavaScript", "JustScript", "None"], correct: 1 },
    { q: "4. SQL used for?", a: ["Frontend", "Database", "Styling", "Hardware"], correct: 1 },
    { q: "5. React is a?", a: ["Framework", "Library", "Language", "Tool"], correct: 1 },
    { q: "6. Node.js runs on?", a: ["Browser", "Server", "Mobile", "Desktop only"], correct: 1 },
    { q: "7. HTTP stands for?", a: ["HyperText Transfer Protocol", "Hyperlink Transfer Protocol", "HyperText Transport Protocol", "None"], correct: 0 },
    { q: "8. Git used for?", a: ["Version Control", "Design", "Testing", "Database"], correct: 0 },
    { q: "9. Which is backend DB?", a: ["MongoDB", "HTML", "CSS", "JS"], correct: 0 },
    { q: "10. CSS file extension?", a: [".js", ".html", ".css", ".txt"], correct: 2 }
];

// === Select DOM Elements ===
const form = document.getElementById("examForm");
const timerDiv = document.getElementById("timer");
const resultDiv = document.getElementById("result");
const submitBtn = document.getElementById("submitBtn");

// === Hide Submit initially ===
submitBtn.style.display = "none";

// === Create navigation buttons ===
const navDiv = document.createElement("div");
navDiv.style.marginTop = "20px";
navDiv.innerHTML = `
  <button type="button" class="btn" id="prevBtn">Previous</button>
  <button type="button" class="btn" id="nextBtn">Next</button>
`;
form.after(navDiv);

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// === Variables ===
let currentQ = 0;
let answers = {}; // store selected answers

// === Render Question Function ===
function showQuestion(index) {
    form.innerHTML = ""; // clear old question
    const q = questions[index];

    const div = document.createElement("div");
    div.classList.add("question");
    div.innerHTML = <p>${q.q}</p>;

    const optDiv = document.createElement("div");
    optDiv.classList.add("options");

    q.a.forEach((ans, j) => {
        const id = `q${index}_opt${j}`;
        const checked = answers[index] == j ? "checked" : "";
        optDiv.innerHTML += `
      <label>
        <input type="radio" name="q${index}" value="${j}" id="${id}" ${checked}/> ${ans}
      </label>
    `;
    });

    div.appendChild(optDiv);
    form.appendChild(div);

    // Update navigation visibility
    prevBtn.style.display = index === 0 ? "none" : "inline-block";
    nextBtn.style.display = index === questions.length - 1 ? "none" : "inline-block";
    submitBtn.style.display = index === questions.length - 1 ? "inline-block" : "none";
}

// === Save Answer Function ===
function saveAnswer() {
    const selected = form.querySelector("input[type='radio']:checked");
    if (selected) {
        answers[currentQ] = parseInt(selected.value);
    }
}

// === Navigation Button Handlers ===
nextBtn.addEventListener("click", () => {
    saveAnswer();
    if (currentQ < questions.length - 1) {
        currentQ++;
        showQuestion(currentQ);
    }
});

prevBtn.addEventListener("click", () => {
    saveAnswer();
    if (currentQ > 0) {
        currentQ--;
        showQuestion(currentQ);
    }
});

// === Timer (30 minutes) ===
let timeLeft = 30 * 60; // seconds
const timer = setInterval(() => {
    timeLeft--;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    timerDiv.textContent = `Time Left: ${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    if (timeLeft <= 0) {
        clearInterval(timer);
        submitExam();
    }
}, 1000);

// === Submit Button Handler ===
submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    saveAnswer();
    submitExam();
});

// === Submit Exam Function ===
function submitExam() {
    clearInterval(timer);
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    submitBtn.disabled = true;

    // Calculate score
    let score = 0;
    questions.forEach((q, i) => {
        if (answers[i] === q.correct) score++;
    });

    const percent = (score / questions.length) * 100;
    const pass = percent >= 30;

    resultDiv.innerHTML = `
    <h3>Your Score: ${score}/${questions.length} (${percent.toFixed(2)}%)</h3>
    <p>${pass ? "✅ Congratulations! You passed Exam 1." : "❌ You did not meet the 30% criteria."}</p>
  `;

    // === Send to Backend ===
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    fetch("http://localhost:5000/api/exam1/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId: user._id,
            score,
            percent,
            passed: pass
        }),
    })
        .then((res) => res.json())
        .then((data) => console.log("Result saved:", data))
        .catch((err) => console.error("Error saving result:", err));
}

// === Initialize First Question ===
showQuestion(currentQ);