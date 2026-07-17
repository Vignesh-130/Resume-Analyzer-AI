const analyzeBtn =
  document.getElementById("analyzeBtn");

const resultDiv =
  document.getElementById("result");

// =========================
// ANALYZE BUTTON
// =========================

analyzeBtn.addEventListener(
  "click",
  async function () {

    // Hide old results
    resultDiv.classList.add("hidden");

    // Inputs

    const jobDescription =
      document
        .getElementById("jobDescription")
        .value
        .trim();

    const fileInput =
      document.getElementById("resumeFile");

    const file =
      fileInput.files[0];

    // =========================
    // VALIDATION
    // =========================

    if (!file) {

      alert("Please upload resume.");

      return;

    }

    if (!jobDescription) {

      alert("Please enter job description.");

      return;

    }

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

const response = await fetch(
  "http://localhost:5000/upload",
  {
    method: "POST",
    body: formData
  }
);

      // Parse response

      const data =
        await response.json();

      // =========================
      // BACKEND ERROR
      // =========================

      if (!response.ok) {

        alert(
          data.error ||
          "Backend Error"
        );

        return;

      }

      // =========================
      // SHOW RESULTS
      // =========================

      resultDiv.classList.remove(
        "hidden"
      );

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
            ${skill}
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

      document.getElementById(
        "atsReadability"
      ).innerHTML = `

        <div class="
          text-4xl
          font-bold
          text-green-400
        ">
          ${data.ats_readability}%
        </div>

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
                <li>${issue}</li>
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
              ${data.found_skills.join(", ")}
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
              ${data.missing_skills.join(", ")}
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

      document.getElementById(
        "suggestions"
      ).innerHTML = `

        <h3 class="
          text-xl font-bold mb-4
          text-cyan-300
        ">
          AI Suggestions
        </h3>

        <ul class="
          list-disc list-inside
          space-y-2 text-gray-300
        ">
          ${suggestionsArray.map(item => `
            <li>${item}</li>
          `).join("")}
        </ul>

      `;

      // =========================
      // DESTROY OLD CHARTS
      // =========================

      if (
        window.skillsChartInstance
      ) {
        window.skillsChartInstance.destroy();
      }

      if (
        window.missingChartInstance
      ) {
        window.missingChartInstance.destroy();
      }

      if (
        window.strengthChartInstance
      ) {
        window.strengthChartInstance.destroy();
      }

      // =========================
      // COMMON OPTIONS
      // =========================

      const commonOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

          legend: {

            labels: {
              color: "white"
            }

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

              labels: [
                "Found",
                "Missing"
              ],

              datasets: [{

                data: [

                  data.found_skills.length,

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

      // =========================
      // MISSING SKILLS CHART
      // =========================

      window.missingChartInstance =
        new Chart(
          document.getElementById(
            "missingSkillsChart"
          ),
          {

            type: "doughnut",

            data: {

              labels:

                data.missing_skills.length
                  ? data.missing_skills
                  : ["No Missing Skills"],

              datasets: [{

                data:

                  data.missing_skills.length
                    ? data.missing_skills.map(() => 1)
                    : [1],

                backgroundColor: [

                  "#ef4444",
                  "#f97316",
                  "#eab308",
                  "#8b5cf6",
                  "#06b6d4"

                ]

              }]

            },

            options: commonOptions

          }
        );

      // =========================
      // STRENGTH CHART
      // =========================

      const score =
        parseFloat(data.score || 0);

      window.strengthChartInstance =
        new Chart(
          document.getElementById(
            "strengthChart"
          ),
          {

            type: "doughnut",

            data: {

              datasets: [{

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

      alert(
        "Server or backend unavailable."
      );

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
