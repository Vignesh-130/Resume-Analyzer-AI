const analyzeBtn =
  document.getElementById("analyzeBtn");

const resultDiv =
  document.getElementById("result");

const errorDiv =
  document.getElementById("errorMessage");

const loadingButtonHtml = `
<div class="flex items-center justify-center gap-2">
    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
    <span>Analyzing Resume...</span>
</div>
`;

const resetButton = () => {
  analyzeBtn.disabled = false;
  analyzeBtn.innerHTML = "🔍 Analyze Resume";
};

const showError = (message) => {
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
};

const clearError = () => {
  errorDiv.textContent = "";
  errorDiv.classList.add("hidden");
};

const setLoading = (isLoading) => {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.innerHTML = isLoading
    ? loadingButtonHtml
    : "🔍 Analyze Resume";
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const cleanSuggestion = (value) =>
  String(value ?? "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// =========================
// ANALYZE BUTTON
// =========================

analyzeBtn.addEventListener(
  "click",
  async function () {

    clearError();

    const jobDescription =
      document
        .getElementById("jobDescription")
        .value
        .trim();

    const fileInput =
      document.getElementById("resumeFile");

    const file =
      fileInput.files[0];

    if (!file) {
      showError("Please upload a resume file.");
      return;
    }

    if (!jobDescription) {
      showError("Please paste a job description.");
      return;
    }

    const uploadUrl =
      window.location.port === "5000"
        ? "/upload"
        : "http://localhost:5000/upload";

    // =========================
    // FORM DATA
    // =========================

    const formData =
      new FormData();

    formData.append(
      "resume",
      file
    );

    formData.append(
      "jobDescription",
      jobDescription
    );

    try {

      // =========================
      // FETCH API
      // =========================

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error("Invalid response from server.");
      }

      if (!response.ok) {
        throw new Error(
          data?.error || response.statusText || "Backend Error"
        );
      }

      // =========================
      // SHOW RESULTS
      // =========================

      resultDiv.classList.remove("hidden");
      resultDiv.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      // =========================
      // FILE INFO
      // =========================

      document.getElementById(
        "fileName"
      ).innerText =
        data.file_name || "";

      document.getElementById(
        "resumePreview"
      ).innerText =
        data.extracted_text || "";

      // =========================
      // SKILL BADGES
      // =========================

      function renderBadges(
        skills,
        color
      ) {

        if (!skills.length) {

          return `
            <p class="text-gray-400 text-sm">
              No skills detected
            </p>
          `;

        }

        return skills.map(skill => `

          <span class="
            px-3 py-1 rounded-full
            text-xs font-medium border
            ${color}
          ">
            ${escapeHtml(skill)}
          </span>

        `).join("");

      }

      // Technical

      document.getElementById(
        "technicalSkills"
      ).innerHTML =

        renderBadges(
          data.technical_skills,
          "bg-cyan-500/20 border-cyan-400 text-cyan-300"
        );

      // Soft

      document.getElementById(
        "softSkills"
      ).innerHTML =

        renderBadges(
          data.soft_skills,
          "bg-pink-500/20 border-pink-400 text-pink-300"
        );

      // Tools

      document.getElementById(
        "toolSkills"
      ).innerHTML =

        renderBadges(
          data.tool_skills,
          "bg-yellow-500/20 border-yellow-400 text-yellow-300"
        );

      // =========================
      // ATS READABILITY
      // =========================

      let ats=data.ats_readability;

      let label="";

      if(ats>=90)
      label="Excellent";

      else if(ats>=75)
      label="Good";

      else
      label="Needs Improvement";

      document.getElementById("atsReadability").innerHTML=`

      <div class="text-4xl font-bold text-green-400">

      ${ats}%

      </div>



      <p class="text-green-300 mt-2">

      ${label}

      </p>

      `;

      // =========================
      // FORMATTING ISSUES
      // =========================

      const issues =
        data.formatting_issues || [];

      document.getElementById(
        "formattingIssues"
      ).innerHTML =

        issues.length

          ? `
            <ul class="
              list-disc list-inside
              text-red-300 space-y-2
            ">
              ${issues.map(issue => `
                <li>${escapeHtml(issue)}</li>
              `).join("")}
            </ul>
          `

          : `
            <p class="text-green-400">
              No formatting issues found
            </p>
          `;

      // =========================
      // SKILLS SUMMARY
      // =========================

      document.getElementById(
        "skills"
      ).innerHTML = `

        <div class="space-y-4">

          <div>

            <h3 class="
              text-green-300
              font-semibold
              mb-2
            ">
              Found Skills
            </h3>

            <p class="text-sm">
              ${escapeHtml(data.found_skills.join(", ") || "No skills detected")}
            </p>

          </div>

          <div>

            <h3 class="
              text-red-300
              font-semibold
              mb-2
            ">
              Missing Skills
            </h3>

            <p class="text-sm">
              ${escapeHtml(data.missing_skills.join(", ") || "No missing skills detected")}
            </p>

          </div>

        </div>

      `;

      // =========================
      // AI SUGGESTIONS
      // =========================

      const suggestionsArray =
      Array.isArray(data.suggestions)
      ? data.suggestions
      : [];

      document.getElementById("suggestions").innerHTML = `

      <h3 class="text-xl font-bold text-cyan-300 mb-5">

      🤖 AI Suggestions

      </h3>

      <div class="space-y-4">

      ${suggestionsArray.length ?

      suggestionsArray.map((item, index) => `

      <div class="border-l-4 border-cyan-500 bg-cyan-500/10 rounded-xl p-4 shadow-md hover:bg-cyan-500/20 transition">

      <div class="flex items-center gap-2">


      <h4 class="font-semibold text-cyan-300">

      Suggestion ${index + 1}

      </h4>

      </div>

      <p class="text-gray-300 mt-3 leading-relaxed">

      ${escapeHtml(cleanSuggestion(item)).replace(/\n/g, "<br>")}

      </p>

      </div>

      `).join("")

      :

      `<p class="text-green-400">

      No suggestions. Resume looks good.

      </p>`

      }

      </div>

      `;

      // =========================
      // DESTROY OLD CHARTS
      // =========================

      if (window.skillsChartInstance) {
        window.skillsChartInstance.destroy();
      }

      if (window.strengthChartInstance) {
        window.strengthChartInstance.destroy();
      }

      // =========================
      // COMMON OPTIONS
      // =========================

      const commonOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins:{

        legend:{
        display:false
        }

        }

      };

      // =========================
      // SKILLS BAR CHART
      // =========================

      window.skillsChartInstance =
        new Chart(
          document.getElementById(
            "skillsChart"
          ),
          {

            type: "bar",

            data: {

            labels:[
            "Matched Skills",
            "Missing Skills"
            ],

              datasets: [{

                data: [

                  Math.max(
                    0,
                    (data.required_skills || []).length -
                      (data.missing_skills || []).length
                  ),

                  data.missing_skills.length

                ],

                backgroundColor: [

                  "#22c55e",
                  "#ef4444"

                ],

                borderRadius: 8

              }]

            },

            options: commonOptions

          }
        );

        const foundCount = Math.max(
          0,
          (data.required_skills || []).length -
            (data.missing_skills || []).length
        );
const missingCount = data.missing_skills.length;

document.getElementById("skillStats").innerHTML = `

<div class="flex-1 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">

    <div class="text-4xl mb-2">✅</div>

    <div class="text-sm text-gray-400">
        Found Skills
    </div>

    <div class="text-4xl font-bold text-green-400 mt-2">
        ${foundCount}
    </div>

</div>

<div class="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">

    <div class="text-4xl mb-2">❌</div>

    <div class="text-sm text-gray-400">
        Missing Skills
    </div>

    <div class="text-4xl font-bold text-red-400 mt-2">
        ${missingCount}
    </div>

</div>

`;

        analyzeBtn.disabled = false;

      analyzeBtn.innerHTML = `
      🔍 Analyze Resume
      `;

      // =========================
      // MISSING SKILLS CHART
      // =========================

        document.getElementById("missingSkillsBadges").innerHTML =
        data.missing_skills.length
        ?
        data.missing_skills.map(skill=>`

        <span class="
        px-3
        py-2
        rounded-full
        bg-red-500/20
        border
        border-red-400
        text-red-300
        font-medium">

        ${escapeHtml(skill)}

        </span>

        `).join("")
        :
        `
        <span class="text-green-400">
        No Missing Skills
        </span>
        `;

      // =========================
      // STRENGTH CHART
      // =========================

      let score = parseFloat(data.score || 0);
      if (!Number.isFinite(score)) {
        score = 0;
      }
      score = Math.max(0, Math.min(100, score));

      document.getElementById("scoreValue").innerHTML =
        `${score}%`;

      let status = "";

      if (score >= 85)
        status = "Excellent Match";
      else if (score >= 70)
        status = "Good Match";
      else if (score >= 50)
        status = "Average Match";
      else
        status = "Needs Improvement";

      document.getElementById("scoreStatus").innerHTML =
        status;

      const chartScore = score;

      window.strengthChartInstance =
        new Chart(
          document.getElementById(
            "strengthChart"
          ),
          {

            type: "doughnut",

            data: {

              datasets: [{
              label: "",

                data: [

                  score,
                  100 - score

                ],

                backgroundColor: [

                  "#22c55e",
                  "#1e293b"

                ],

                borderWidth: 0

              }]

            },

            options: {

              responsive: true,

              maintainAspectRatio: false,

              cutout: "70%",

              plugins: {

                legend: {
                  display: false
                }

              }

            }

          }
        );

    }

    catch (error) {
      console.error(error);
      showError(error.message || "Unable to reach the backend.");
    }
    finally {
      setLoading(false);
    }

  }
);

// =========================
// FILE NAME DISPLAY
// =========================

document
  .getElementById("resumeFile")
  .addEventListener(
    "change",
    function () {

      const file =
        this.files[0];

      document.getElementById(
        "selectedFile"
      ).innerText =

        file
          ? `Selected: ${file.name}`
          : "";

    }
  );
